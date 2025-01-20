import { QualityRule, validateEntry, createRule } from '../quality-management';

describe('Quality Management System', () => {
  describe('createRule', () => {
    it('should create a valid rule with all required fields', () => {
      const rule = createRule({
        name: 'Required Description',
        description: 'Ensures entries have a description',
        severity: 'error',
        condition: 'required',
        field: 'description'
      });

      expect(rule).toEqual({
        id: expect.any(String),
        name: 'Required Description',
        description: 'Ensures entries have a description',
        severity: 'error',
        condition: 'required',
        field: 'description',
        enabled: true,
        createdAt: expect.any(String)
      });
    });

    it('should throw error for invalid severity level', () => {
      expect(() => createRule({
        name: 'Test Rule',
        description: 'Test Description',
        severity: 'invalid' as any,
        condition: 'required',
        field: 'name'
      })).toThrow('Invalid severity level');
    });
  });

  describe('validateEntry', () => {
    const mockRules: QualityRule[] = [
      {
        id: '1',
        name: 'Required Name',
        description: 'Entry must have a name',
        severity: 'error',
        condition: 'required',
        field: 'name',
        enabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Name Length',
        description: 'Name must be at least 3 characters',
        severity: 'warning',
        condition: 'minLength',
        field: 'name',
        value: 3,
        enabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Valid Format',
        description: 'Description must match pattern',
        severity: 'error',
        condition: 'pattern',
        field: 'description',
        value: '^[A-Z].*$',
        enabled: true,
        createdAt: new Date().toISOString()
      }
    ];

    it('should return no violations for valid entry', () => {
      const entry = {
        name: 'Test Entry',
        description: 'This is a test entry',
        type: 'string'
      };

      const violations = validateEntry(entry, mockRules);
      expect(violations).toHaveLength(0);
    });

    it('should detect missing required field', () => {
      const entry = {
        description: 'Test description',
        type: 'string'
      };

      const violations = validateEntry(entry, mockRules);
      expect(violations).toHaveLength(1);
      expect(violations[0]).toEqual({
        ruleId: '1',
        severity: 'error',
        message: 'Entry must have a name',
        field: 'name'
      });
    });

    it('should detect multiple violations', () => {
      const entry = {
        name: 'a',
        description: 'invalid description',
        type: 'string'
      };

      const violations = validateEntry(entry, mockRules);
      expect(violations).toHaveLength(2);
      expect(violations).toContainEqual({
        ruleId: '2',
        severity: 'warning',
        message: 'Name must be at least 3 characters',
        field: 'name'
      });
      expect(violations).toContainEqual({
        ruleId: '3',
        severity: 'error',
        message: 'Description must match pattern',
        field: 'description'
      });
    });

    it('should ignore disabled rules', () => {
      const disabledRules = mockRules.map(rule => ({ ...rule, enabled: false }));
      const entry = {
        description: 'Test description',
        type: 'string'
      };

      const violations = validateEntry(entry, disabledRules);
      expect(violations).toHaveLength(0);
    });
  });
});