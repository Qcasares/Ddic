import { SupabaseClient } from '@supabase/supabase-js';
import { BaseEntity, BaseRepository, IRepository, QueryParams } from './base';
import { Logger } from '../utils/logger';
import { DatabaseError } from '../utils/errors';

/**
 * Supabase-specific implementation of the base repository
 */
export class SupabaseRepository<T extends BaseEntity> extends BaseRepository<T> {
    constructor(
        private readonly supabase: SupabaseClient,
        private readonly tableName: string,
        logger: Logger
    ) {
        super(logger, tableName);
    }

    protected async findByIdImpl(id: string): Promise<T | null> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw this.createDatabaseError(error);
        return data;
    }

    protected async findManyImpl(params: QueryParams): Promise<T[]> {
        let query = this.supabase
            .from(this.tableName)
            .select('*');

        // Apply filters
        if (params.filters) {
            Object.entries(params.filters).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }

        // Apply ordering
        if (params.orderBy) {
            query = query.order(
                params.orderBy,
                { ascending: params.orderDirection !== 'desc' }
            );
        }

        // Apply pagination
        if (params.limit) {
            query = query.limit(params.limit);
        }
        if (params.offset) {
            query = query.range(
                params.offset,
                params.offset + (params.limit || 10) - 1
            );
        }

        const { data, error } = await query;

        if (error) throw this.createDatabaseError(error);
        return data || [];
    }

    protected async createImpl(entity: Omit<T, keyof BaseEntity>): Promise<T> {
        const now = new Date().toISOString();
        const { data, error } = await this.supabase
            .from(this.tableName)
            .insert({
                ...entity,
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (error) throw this.createDatabaseError(error);
        return data;
    }

    protected async updateImpl(id: string, entity: Partial<T>): Promise<T | null> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update({
                ...entity,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw this.createDatabaseError(error);
        return data;
    }

    protected async deleteImpl(id: string): Promise<void> {
        const { error } = await this.supabase
            .from(this.tableName)
            .delete()
            .eq('id', id);

        if (error) throw this.createDatabaseError(error);
    }

    /**
     * Create a transaction-aware repository instance
     * Note: This is a basic implementation. Proper transaction support
     * requires more sophisticated handling.
     */
    async withTransaction(transaction: SupabaseClient): Promise<IRepository<T>> {
        return new SupabaseRepository<T>(
            transaction,
            this.tableName,
            this.logger.child({ transaction: true })
        );
    }

    /**
     * Helper to create consistent database errors
     */
    private createDatabaseError(error: unknown): DatabaseError {
        return new DatabaseError(
            `Database operation failed on ${this.tableName}`,
            { originalError: error }
        );
    }

    /**
     * Helper to create upsert operations
     */
    async upsert(entity: Partial<T> & Pick<T, 'id'>): Promise<T> {
        const now = new Date().toISOString();
        const { data, error } = await this.supabase
            .from(this.tableName)
            .upsert({
                ...entity,
                updated_at: now,
                created_at: entity.created_at || now
            })
            .select()
            .single();

        if (error) throw this.createDatabaseError(error);
        return data;
    }

    /**
     * Helper to perform batch operations
     */
    async batchUpsert(entities: Array<Partial<T> & Pick<T, 'id'>>): Promise<T[]> {
        if (entities.length === 0) return [];

        const now = new Date().toISOString();
        const { data, error } = await this.supabase
            .from(this.tableName)
            .upsert(
                entities.map(entity => ({
                    ...entity,
                    updated_at: now,
                    created_at: entity.created_at || now
                }))
            )
            .select();

        if (error) throw this.createDatabaseError(error);
        return data || [];
    }
}