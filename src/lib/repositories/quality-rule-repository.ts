import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { SupabaseRepository } from './supabase-repository';
import { DatabaseError } from '../utils/errors';
import { QualityRule } from '../quality-management';
import { BaseEntity } from './base';

/**
 * Extended entity type that includes Supabase-specific field names
 */
interface QualityRuleEntity extends BaseEntity {
    dictionary_id: string;  // Supabase uses snake_case
    rule_type: QualityRule['ruleType'];
    name: string;
    configuration: QualityRule['configuration'];
    severity: QualityRule['severity'];
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
            name: entity.name,
            ruleType: entity.rule_type,
            configuration: entity.configuration,
            severity: entity.severity,
            createdAt: entity.created_at,
            createdBy: entity.created_by,
            updatedAt: entity.updated_at
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
            configuration: rule.configuration,
            severity: rule.severity,
            created_by: rule.createdBy || 'system' // Provide default value
        };
    }
}