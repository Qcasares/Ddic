import { DatabaseError, NotFoundError } from '../utils/errors';
import { Logger } from '../utils/logger';

/**
 * Common fields for all entities
 */
export interface BaseEntity {
    id: string;
    created_at: string;
    updated_at: string;
}

/**
 * Base repository interface defining common operations
 */
export interface IRepository<T extends BaseEntity> {
    findById(id: string): Promise<T>;
    findMany(params: QueryParams): Promise<T[]>;
    create(entity: Omit<T, keyof BaseEntity>): Promise<T>;
    update(id: string, entity: Partial<T>): Promise<T>;
    delete(id: string): Promise<void>;
}

/**
 * Query parameters for findMany operations
 */
export interface QueryParams {
    filters?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

/**
 * Base repository implementation with common error handling and logging
 */
export abstract class BaseRepository<T extends BaseEntity> implements IRepository<T> {
    protected constructor(
        protected readonly logger: Logger,
        protected readonly entityName: string
    ) {}

    async findById(id: string): Promise<T> {
        try {
            this.logger.debug(`Finding ${this.entityName} by ID`, { id });
            const entity = await this.findByIdImpl(id);
            
            if (!entity) {
                throw new NotFoundError(`${this.entityName} not found`, { id });
            }

            return entity;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError(
                `Failed to find ${this.entityName}`,
                { id, error }
            );
        }
    }

    async findMany(params: QueryParams): Promise<T[]> {
        try {
            this.logger.debug(`Finding ${this.entityName} list`, params as Record<string, unknown>);
            return await this.findManyImpl(params);
        } catch (error) {
            throw new DatabaseError(
                `Failed to find ${this.entityName} list`,
                { params, error }
            );
        }
    }

    async create(entity: Omit<T, keyof BaseEntity>): Promise<T> {
        try {
            this.logger.debug(`Creating ${this.entityName}`, entity);
            return await this.createImpl(entity);
        } catch (error) {
            throw new DatabaseError(
                `Failed to create ${this.entityName}`,
                { entity, error }
            );
        }
    }

    async update(id: string, entity: Partial<T>): Promise<T> {
        try {
            this.logger.debug(`Updating ${this.entityName}`, { id, entity });
            const updated = await this.updateImpl(id, entity);
            
            if (!updated) {
                throw new NotFoundError(`${this.entityName} not found`, { id });
            }

            return updated;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError(
                `Failed to update ${this.entityName}`,
                { id, entity, error }
            );
        }
    }

    async delete(id: string): Promise<void> {
        try {
            this.logger.debug(`Deleting ${this.entityName}`, { id });
            await this.deleteImpl(id);
        } catch (error) {
            throw new DatabaseError(
                `Failed to delete ${this.entityName}`,
                { id, error }
            );
        }
    }

    // Abstract methods to be implemented by specific repositories
    protected abstract findByIdImpl(id: string): Promise<T | null>;
    protected abstract findManyImpl(params: QueryParams): Promise<T[]>;
    protected abstract createImpl(entity: Omit<T, keyof BaseEntity>): Promise<T>;
    protected abstract updateImpl(id: string, entity: Partial<T>): Promise<T | null>;
    protected abstract deleteImpl(id: string): Promise<void>;
}