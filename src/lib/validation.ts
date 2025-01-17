import { z } from 'zod';

// Common validation schemas
export const idSchema = z.string().uuid('Invalid ID format');

export const emailSchema = z.string()
  .email('Invalid email address')
  .min(1, 'Email is required')
  .max(255, 'Email is too long');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Dictionary validation schemas
export const dictionarySchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Name can only contain letters, numbers, spaces, underscores, and hyphens'),
  description: z.string()
    .max(500, 'Description is too long')
    .optional(),
  domain: z.string()
    .min(1, 'Domain is required')
    .max(100, 'Domain is too long'),
  steward: z.string()
    .email('Invalid steward email')
    .optional(),
  metadata: z.record(z.unknown())
    .optional(),
});

// Entry validation schemas
export const entrySchema = z.object({
  field_name: z.string()
    .min(1, 'Field name is required')
    .max(100, 'Field name is too long')
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Field name must start with a letter or underscore and contain only letters, numbers, and underscores'),
  data_type: z.enum([
    'string', 'number', 'boolean', 'date', 'datetime', 
    'array', 'object', 'null', 'binary', 'decimal'
  ], {
    errorMap: () => ({ message: 'Invalid data type' })
  }),
  description: z.string()
    .max(500, 'Description is too long')
    .optional(),
  validation_rules: z.record(z.unknown())
    .optional(),
  sample_values: z.array(z.unknown())
    .max(10, 'Maximum 10 sample values allowed')
    .optional(),
  metadata: z.record(z.unknown())
    .optional(),
});

// Business term validation schemas
export const businessTermSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Name can only contain letters, numbers, spaces, underscores, and hyphens'),
  definition: z.string()
    .min(1, 'Definition is required')
    .max(500, 'Definition is too long'),
  domain: z.string()
    .min(1, 'Domain is required')
    .max(100, 'Domain is too long'),
  synonyms: z.array(z.string())
    .max(10, 'Maximum 10 synonyms allowed')
    .optional(),
  metadata: z.record(z.unknown())
    .optional(),
});

// Team member validation schemas
export const teamMemberSchema = z.object({
  user_id: idSchema,
  role: z.enum(['owner', 'editor', 'viewer'], {
    errorMap: () => ({ message: 'Invalid role' })
  }),
});

// Custom error handler
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Record<string, string[]> = {},
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Validation helper functions
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const key = err.path.join('.');
        if (!errors[key]) {
          errors[key] = [];
        }
        errors[key].push(err.message);
      });
      throw new ValidationError('Validation failed', errors);
    }
    throw error;
  }
}

export function validateAsync<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<T> {
  return schema.parseAsync(data).catch((error) => {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const key = err.path.join('.');
        if (!errors[key]) {
          errors[key] = [];
        }
        errors[key].push(err.message);
      });
      throw new ValidationError('Validation failed', errors);
    }
    throw error;
  });
}