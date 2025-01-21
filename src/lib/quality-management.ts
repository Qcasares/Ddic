/**
 * Quality Management System
 * 
 * This module provides functionality for validating dictionary entries against
 * configurable quality rules. It helps ensure data consistency and quality
 * across the dictionary.
 */

export type Severity = 'error' | 'warning' | 'info';
export type Condition = 'required' | 'minLength' | 'maxLength' | 'pattern' | 'enum';

export interface QualityRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  condition: Condition;
  field: string;
  value?: number | string | string[];
  enabled: boolean;
  createdAt: string;
}

export interface QualityViolation {
  id?: string;  // Optional ID to support both validation and database records
  ruleId: string;
  severity: Severity;
  message: string;
  field: string;
  entryId?: string;  // Optional entry ID for database records
  createdAt?: string;
  resolvedAt?: string | null;
}

export interface CreateRuleParams {
  name: string;
  description: string;
  severity: Severity;
  condition: Condition;
  field: string;
  value?: number | string | string[];
}

/**
 * Type guard to check if a value is a number
 */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Creates a new quality rule with the specified parameters
 * @param params Rule parameters
 * @returns New quality rule
 * @throws Error if parameters are invalid
 */
export function createRule(params: CreateRuleParams): QualityRule {
  // Validate severity
  if (!['error', 'warning', 'info'].includes(params.severity)) {
    throw new Error('Invalid severity level');
  }

  // Validate condition
  if (!['required', 'minLength', 'maxLength', 'pattern', 'enum'].includes(params.condition)) {
    throw new Error('Invalid condition');
  }

  // Validate value based on condition
  if (params.condition === 'minLength' || params.condition === 'maxLength') {
    if (!isNumber(params.value)) {
      throw new Error(`${params.condition} condition requires a numeric value`);
    }
  } else if (params.condition === 'pattern') {
    if (typeof params.value !== 'string') {
      throw new Error('Pattern condition requires a string value');
    }
    try {
      new RegExp(params.value);
    } catch {
      throw new Error('Invalid regular expression pattern');
    }
  } else if (params.condition === 'enum') {
    if (!Array.isArray(params.value)) {
      throw new Error('Enum condition requires an array of values');
    }
  }

  return {
    id: crypto.randomUUID(),
    name: params.name,
    description: params.description,
    severity: params.severity,
    condition: params.condition,
    field: params.field,
    value: params.value,
    enabled: true,
    createdAt: new Date().toISOString()
  };
}

/**
 * Validates an entry against a set of quality rules
 * @param entry Dictionary entry to validate
 * @param rules Array of quality rules to check
 * @returns Array of quality violations found
 */
export function validateEntry(entry: Record<string, unknown>, rules: QualityRule[]): QualityViolation[] {
  const violations: QualityViolation[] = [];

  // Only process enabled rules
  const enabledRules = rules.filter(rule => rule.enabled);

  for (const rule of enabledRules) {
    const value = entry[rule.field];
    let isViolation = false;

    switch (rule.condition) {
      case 'required':
        isViolation = value === undefined || value === null || value === '';
        break;

      case 'minLength':
        if (typeof value === 'string' && isNumber(rule.value)) {
          isViolation = value.length < rule.value;
        }
        break;

      case 'maxLength':
        if (typeof value === 'string' && isNumber(rule.value)) {
          isViolation = value.length > rule.value;
        }
        break;

      case 'pattern':
        if (typeof value === 'string' && typeof rule.value === 'string') {
          try {
            const regex = new RegExp(rule.value);
            isViolation = !regex.test(value);
          } catch {
            console.error(`Invalid regex pattern in rule: ${rule.id}`);
          }
        }
        break;

      case 'enum':
        if (Array.isArray(rule.value)) {
          isViolation = !rule.value.includes(value);
        }
        break;
    }

    if (isViolation) {
      violations.push({
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.description,
        field: rule.field
      });
    }
  }

  return violations;
}

/**
 * Formats a quality violation message for display
 * @param violation The quality violation to format
 * @returns Formatted message string
 */
export function formatViolationMessage(violation: QualityViolation): string {
  return `[${violation.severity.toUpperCase()}] ${violation.field}: ${violation.message}`;
}

export const qualityRuleEngine = {
  evaluateEntry: (entry: Record<string, any>) => {
    // Example logic using the entry parameter
    const totalScore = Object.keys(entry).length * 10; // Example score based on entry properties
    return { totalScore };
  }
};
