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

    // New tests for input validation
    it('should sanitize rule name and description', () => {
      const rule = createRule({
        name: '<script>alert("xss")</script>Name',
        description: '<img src="x" onerror="alert(1)">Desc',
        severity: 'error',
        condition: 'required',
        field: 'test'
      });

      expect(rule.name).not.toContain('<script>');
      expect(rule.description).not.toContain('<img');
    });

    it('should validate pattern complexity', () => {
      expect(() => createRule({
        name: 'Complex Pattern',
        description: 'Test',
        severity: 'error',
        condition: 'pattern',
        field: 'test',
        value: '(a+)+b' // catastrophic backtracking pattern
      })).toThrow('Pattern too complex');
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

    // New performance tests
    it('should handle large entries efficiently', () => {
      const largeEntry = {
        name: 'Test',
        description: 'A'.repeat(10000),
        type: 'string'
      };
      
      const start = performance.now();
      validateEntry(largeEntry, mockRules);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle many rules efficiently', () => {
      const manyRules = Array(1000).fill(null).map((_, i) => ({
        ...mockRules[0],
        id: `rule${i}`,
        field: `field${i}`
      }));

      const entry = { name: 'Test' };
      
      const start = performance.now();
      validateEntry(entry, manyRules);
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(200); // Should complete within 200ms
    });

    // New security tests
    it('should handle malicious patterns safely', () => {
      const maliciousRule = {
        ...mockRules[2],
        value: '(.*?){100}' // Potentially catastrophic pattern
      };

      const entry = {
        name: 'Test',
        description: 'A'.repeat(1000)
      };

      expect(() => validateEntry(entry, [maliciousRule])).toThrow('Pattern evaluation timeout');
    });
  });
});
