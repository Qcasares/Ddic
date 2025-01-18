import { supabase } from './supabase';
import type { DictionaryEntry } from '@/types';

export interface QualityRule {
    id: string;
    dictionaryId: string;
    name: string;
    ruleType: 'regex' | 'required_field' | 'length' | 'format';
    configuration: RuleConfiguration;
    severity: 'error' | 'warning' | 'info';
    createdAt: string;
    createdBy: string;
    updatedAt: string;
}

export type BaseRuleConfiguration = {
    field: string;
};

export type RegexRuleConfiguration = BaseRuleConfiguration & {
    pattern: string;
    flags?: string;
};

export type RequiredFieldConfiguration = BaseRuleConfiguration & {
    allowEmpty?: boolean;
};

export type LengthRuleConfiguration = BaseRuleConfiguration & {
    minLength?: number;
    maxLength?: number;
};

export type FormatRuleConfiguration = BaseRuleConfiguration & {
    format: 'email' | 'url' | 'date' | 'number';
};

export type RuleConfiguration =
    | RegexRuleConfiguration
    | RequiredFieldConfiguration
    | LengthRuleConfiguration
    | FormatRuleConfiguration;

export const isRegexConfig = (config: RuleConfiguration): config is RegexRuleConfiguration =>
    'pattern' in config;

export const isRequiredFieldConfig = (config: RuleConfiguration): config is RequiredFieldConfiguration =>
    'allowEmpty' in config;

export const isLengthConfig = (config: RuleConfiguration): config is LengthRuleConfiguration =>
    'minLength' in config || 'maxLength' in config;

export const isFormatConfig = (config: RuleConfiguration): config is FormatRuleConfiguration =>
    'format' in config;

export interface QualityDimensions {
    completeness: number;
    accuracy: number;
    consistency: number;
}

export interface QualityScore {
    id: string;
    entryId: string;
    totalScore: number;
    dimensionScores: QualityDimensions;
    failedRules: Array<{
        ruleId: string;
        reason: string;
    }>;
    createdAt: string;
    updatedAt: string;
}

export interface QualityEvaluationResult {
    passed: boolean;
    score: number;
    reason?: string;
}

class QualityRuleEngine {
    private static instance: QualityRuleEngine;
    private rules: Map<string, QualityRule> = new Map();
    private readonly weights: QualityDimensions = {
        completeness: 0.4,
        accuracy: 0.3,
        consistency: 0.3
    };

    private constructor() {}

    static getInstance(): QualityRuleEngine {
        if (!QualityRuleEngine.instance) {
            QualityRuleEngine.instance = new QualityRuleEngine();
        }
        return QualityRuleEngine.instance;
    }

    async loadRules(dictionaryId: string): Promise<void> {
        const { data, error } = await supabase
            .from('quality_rules')
            .select('*')
            .eq('dictionary_id', dictionaryId);

        if (error) throw error;

        this.rules.clear();
        data.forEach(rule => {
            this.rules.set(rule.id, {
                id: rule.id,
                dictionaryId: rule.dictionary_id,
                name: rule.name,
                ruleType: rule.rule_type,
                configuration: rule.configuration,
                severity: rule.severity,
                createdAt: rule.created_at,
                createdBy: rule.created_by,
                updatedAt: rule.updated_at
            });
        });
    }

    async evaluateEntry(entry: DictionaryEntry): Promise<QualityScore> {
        const dimensionScores: QualityDimensions = {
            completeness: 0,
            accuracy: 0,
            consistency: 0
        };
        
        const failedRules: Array<{ruleId: string; reason: string}> = [];
        
        for (const [id, rule] of this.rules) {
            const result = await this.evaluateRule(entry, rule);
            if (!result.passed) {
                failedRules.push({
                    ruleId: id,
                    reason: result.reason || 'Rule evaluation failed'
                });
            }
            
            // Update dimension scores based on rule type
            switch (rule.ruleType) {
                case 'required_field':
                    dimensionScores.completeness += result.score;
                    break;
                case 'format':
                    dimensionScores.accuracy += result.score;
                    break;
                case 'regex':
                case 'length':
                    dimensionScores.consistency += result.score;
                    break;
            }
        }

        // Normalize dimension scores
        Object.keys(dimensionScores).forEach(key => {
            dimensionScores[key as keyof QualityDimensions] = 
                this.normalizeScore(dimensionScores[key as keyof QualityDimensions]);
        });

        // Calculate total score as weighted average
        const totalScore = this.calculateTotalScore(dimensionScores);

        const qualityScore: QualityScore = {
            id: crypto.randomUUID(),
            entryId: entry.id,
            totalScore,
            dimensionScores,
            failedRules,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Save score to database
        await this.saveQualityScore(qualityScore);

        return qualityScore;
    }

    private async evaluateRule(
        entry: DictionaryEntry,
        rule: QualityRule
    ): Promise<QualityEvaluationResult> {
        try {
            switch (rule.ruleType) {
                case 'required_field':
                    return this.evaluateRequiredField(entry, rule);
                case 'regex':
                    return this.evaluateRegex(entry, rule);
                case 'length':
                    return this.evaluateLength(entry, rule);
                case 'format':
                    return this.evaluateFormat(entry, rule);
                default:
                    throw new Error(`Unknown rule type: ${rule.ruleType}`);
            }
        } catch (error) {
            console.error(`Error evaluating rule ${rule.id}:`, error);
            return { passed: false, score: 0, reason: 'Rule evaluation failed' };
        }
    }

    private evaluateRequiredField(
        entry: DictionaryEntry,
        rule: QualityRule
    ): QualityEvaluationResult {
        const config = rule.configuration as RequiredFieldConfiguration;
        const { field, allowEmpty = false } = config;

        const value = entry[field];
        const hasValue = value !== undefined && value !== null;
        const isEmpty = hasValue && String(value).trim() === '';

        if (!hasValue || (!allowEmpty && isEmpty)) {
            return {
                passed: false,
                score: 0,
                reason: `Required field '${field}' is ${!hasValue ? 'missing' : 'empty'}`
            };
        }

        return { passed: true, score: 100 };
    }

    private evaluateRegex(
        entry: DictionaryEntry,
        rule: QualityRule
    ): QualityEvaluationResult {
        const config = rule.configuration as RegexRuleConfiguration;
        const { pattern, flags, field } = config;

        const value = entry[field];
        if (value === undefined || value === null) {
            return { passed: false, score: 0, reason: `Field '${field}' is missing` };
        }

        const regex = new RegExp(pattern, flags);
        const matches = regex.test(String(value));

        return {
            passed: matches,
            score: matches ? 100 : 0,
            reason: matches ? undefined : `Field '${field}' does not match required pattern`
        };
    }

    private evaluateLength(
        entry: DictionaryEntry,
        rule: QualityRule
    ): QualityEvaluationResult {
        const config = rule.configuration as LengthRuleConfiguration;
        const { minLength, maxLength, field } = config;

        const value = entry[field];
        if (value === undefined || value === null) {
            return { passed: false, score: 0, reason: `Field '${field}' is missing` };
        }

        const length = String(value).length;
        const withinMin = minLength === undefined || length >= minLength;
        const withinMax = maxLength === undefined || length <= maxLength;
        const passed = withinMin && withinMax;

        let reason;
        if (!passed) {
            if (!withinMin) {
                reason = `Field '${field}' is shorter than minimum length ${minLength}`;
            } else {
                reason = `Field '${field}' is longer than maximum length ${maxLength}`;
            }
        }

        return { passed, score: passed ? 100 : 0, reason };
    }

    private evaluateFormat(
        entry: DictionaryEntry,
        rule: QualityRule
    ): QualityEvaluationResult {
        const config = rule.configuration as FormatRuleConfiguration;
        const { format, field } = config;

        const value = entry[field];
        if (value === undefined || value === null) {
            return { passed: false, score: 0, reason: `Field '${field}' is missing` };
        }

        const stringValue = String(value);
        let passed = false;
        let reason;

        switch (format) {
            case 'email':
                passed = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue);
                reason = 'Invalid email format';
                break;
            case 'url':
                try {
                    new URL(stringValue);
                    passed = true;
                } catch {
                    passed = false;
                    reason = 'Invalid URL format';
                }
                break;
            case 'date':
                passed = !isNaN(Date.parse(stringValue));
                reason = 'Invalid date format';
                break;
            case 'number':
                passed = !isNaN(Number(stringValue));
                reason = 'Invalid number format';
                break;
            default:
                return { passed: false, score: 0, reason: `Unknown format type: ${format}` };
        }

        return {
            passed,
            score: passed ? 100 : 0,
            reason: passed ? undefined : reason
        };
    }

    private normalizeScore(score: number): number {
        return Math.min(100, Math.max(0, score));
    }

    private calculateTotalScore(dimensionScores: QualityDimensions): number {
        return this.normalizeScore(
            Object.entries(this.weights).reduce(
                (sum, [dimension, weight]) => 
                    sum + (dimensionScores[dimension as keyof QualityDimensions] * weight),
                0
            )
        );
    }

    private async saveQualityScore(score: QualityScore): Promise<void> {
        const { error } = await supabase
            .from('quality_scores')
            .upsert({
                id: score.id,
                entry_id: score.entryId,
                total_score: score.totalScore,
                dimension_scores: score.dimensionScores,
                failed_rules: score.failedRules,
                created_at: score.createdAt,
                updated_at: score.updatedAt
            });

        if (error) throw error;
    }
}

export const qualityRuleEngine = QualityRuleEngine.getInstance();