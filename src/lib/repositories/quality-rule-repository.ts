import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { SupabaseRepository } from './supabase-repository';
import { DatabaseError } from '../utils/errors';
import { QualityRule, CreateQualityRule, UpdateQualityRule } from '@/lib/types/quality-rule';
import { BaseEntity } from './base';

/**
 * Extended entity type that includes Supabase-specific field names
 */
interface QualityRuleEntity extends BaseEntity {
    dictionary_id: string;
    rule_type: string;
    name: string;
    description?: string;
    severity: string;
    condition?: string;
    field?: string;
    value?: string | number | string[];
    enabled?: boolean;
    configuration?: Record<string, unknown>;
    created_by: string;
}

/**
 * Repository for managing quality rules in the database
 */
export class QualityRuleRepository extends SupabaseRepository<QualityRuleEntity> {
    constructor(
        supabase: SupabaseClient,
        logger: Logger
    ) {
        super(supabase, 'quality_rules', logger);
    }

    /**
     * Find all rules for a specific dictionary
     */
    async findByDictionaryId(dictionaryId: string): Promise<QualityRule[]> {
        try {
            const rules = await this.findMany({
                filters: { dictionary_id: dictionaryId }
            });

            // Transform from database entity to domain model
            return rules.map(this.mapToDomainModel);
        } catch (error) {
            throw new DatabaseError(
                `Failed to find quality rules for dictionary`,
                { dictionaryId, error }
            );
        }
    }

    /**
     * Create a new quality rule
     */
    async createRule(rule: Omit<QualityRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<QualityRule> {
        try {
            // Transform to database entity
            const entity = this.mapToDatabaseEntity(rule);
            const created = await this.create(entity);
            return this.mapToDomainModel(created);
        } catch (error) {
            throw new DatabaseError(
                `Failed to create quality rule`,
                { rule, error }
            );
        }
    }

    /**
     * Update an existing quality rule
     */
    async updateRule(id: string, rule: Partial<QualityRule>): Promise<QualityRule> {
        try {
            // Transform to database entity
            const entity = this.mapToDatabaseEntity(rule);
            const updated = await this.update(id, entity);
            if (!updated) {
                throw new DatabaseError(`Quality rule not found`, { id });
            }
            return this.mapToDomainModel(updated);
        } catch (error) {
            throw new DatabaseError(
                `Failed to update quality rule`,
                { id, rule, error }
            );
        }
    }

    /**
     * Bulk upsert quality rules
     */
    async upsertRules(rules: QualityRule[]): Promise<QualityRule[]> {
        try {
            const entities = rules.map(rule => ({
                ...this.mapToDatabaseEntity(rule),
                id: rule.id
            }));
            
            const upserted = await this.batchUpsert(entities);
            return upserted.map(this.mapToDomainModel);
        } catch (error) {
            throw new DatabaseError(
                `Failed to upsert quality rules`,
                { count: rules.length, error }
            );
        }
    }

    /**
     * Map database entity to domain model
     */
    private mapToDomainModel(entity: QualityRuleEntity): QualityRule {
        return {
            id: entity.id,
            dictionaryId: entity.dictionary_id,
            ruleType: entity.rule_type,
            name: entity.name,
            description: entity.description || '',
            severity: entity.severity,
            condition: entity.condition || '',
            field: entity.field || '',
            value: entity.value,
            enabled: entity.enabled || false,
            configuration: entity.configuration,
            createdAt: entity.created_at,
            updatedAt: entity.updated_at,
            createdBy: entity.created_by || 'system'
        };
    }

    /**
     * Map domain model to database entity
     */
    private mapToDatabaseEntity(rule: Partial<QualityRule>): Omit<QualityRuleEntity, keyof BaseEntity> {
        // Ensure required fields are present when creating new rules
        if (!rule.dictionaryId || !rule.ruleType || !rule.name || !rule.configuration || !rule.severity) {
            throw new DatabaseError(
                'Missing required fields for quality rule',
                { rule }
            );
        }

        return {
            dictionary_id: rule.dictionaryId,
            rule_type: rule.ruleType,
            name: rule.name,
            description: rule.description,
            severity: rule.severity,
            condition: rule.condition,
            field: rule.field,
            value: rule.value,
            enabled: rule.enabled ?? false,
            configuration: rule.configuration,
            created_by: rule.createdBy || 'system'
        };
    }
}