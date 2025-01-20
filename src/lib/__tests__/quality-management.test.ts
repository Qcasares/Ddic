import { qualityRuleEngine, type QualityRule } from '../quality-management';
import { supabase } from '../supabase';
import type { DictionaryEntry } from '@/types';

// Mock crypto.randomUUID
const mockUUID = '12345678-1234-1234-1234-123456789012';
global.crypto = {
  ...global.crypto,
  randomUUID: () => mockUUID,
};

// Mock Supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [],
        error: null
      }),
      upsert: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }),
  },
}));

describe('QualityRuleEngine', () => {
  const mockEntry: DictionaryEntry = {
    id: 'test-entry-1',
    dictionary_id: 'test-dict-1',
    term: 'Test Term',
    definition: 'Test Definition',
    created_at: '2025-01-20T09:00:00.000Z',
    updated_at: '2025-01-20T09:00:00.000Z',
  };

  const mockRules: QualityRule[] = [
    {
      id: 'rule-1',
      dictionaryId: 'test-dict-1',
      name: 'Required Examples',
      ruleType: 'required_field',
      configuration: {
        field: 'examples',
        allowEmpty: false,
      },
      severity: 'error',
      createdAt: '2025-01-20T09:00:00.000Z',
      createdBy: 'test-user',
      updatedAt: '2025-01-20T09:00:00.000Z',
    },
    {
      id: 'rule-2',
      dictionaryId: 'test-dict-1',
      name: 'Term Format',
      ruleType: 'regex',
      configuration: {
        field: 'term',
        pattern: '^[A-Z].*$',
        flags: '',
      },
      severity: 'warning',
      createdAt: '2025-01-20T09:00:00.000Z',
      createdBy: 'test-user',
      updatedAt: '2025-01-20T09:00:00.000Z',
    },
    {
      id: 'rule-3',
      dictionaryId: 'test-dict-1',
      name: 'Definition Length',
      ruleType: 'length',
      configuration: {
        field: 'definition',
        minLength: 10,
        maxLength: 1000,
      },
      severity: 'info',
      createdAt: '2025-01-20T09:00:00.000Z',
      createdBy: 'test-user',
      updatedAt: '2025-01-20T09:00:00.000Z',
    },
    {
      id: 'rule-4',
      dictionaryId: 'test-dict-1',
      name: 'Email Field',
      ruleType: 'format',
      configuration: {
        field: 'email',
        format: 'email',
      },
      severity: 'error',
      createdAt: '2025-01-20T09:00:00.000Z',
      createdBy: 'test-user',
      updatedAt: '2025-01-20T09:00:00.000Z',
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    // Mock the loadRules response
    const mockRulesData = mockRules.map(rule => ({
      id: rule.id,
      dictionary_id: rule.dictionaryId,
      name: rule.name,
      rule_type: rule.ruleType,
      configuration: rule.configuration,
      severity: rule.severity,
      created_at: rule.createdAt,
      created_by: rule.createdBy,
      updated_at: rule.updatedAt,
    }));

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: mockRulesData,
        error: null,
      }),
      upsert: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    });

    await qualityRuleEngine.loadRules('test-dict-1');
  });

  describe('Rule Loading', () => {
    it('should load rules from the database', async () => {
      expect(supabase.from).toHaveBeenCalledWith('quality_rules');
      const selectMock = supabase.from('quality_rules').select;
      expect(selectMock).toHaveBeenCalled();
    });

    it('should handle database errors when loading rules', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      });

      await expect(qualityRuleEngine.loadRules('test-dict-1')).rejects.toThrow();
    });
  });

  describe('Required Field Rules', () => {
    it('should pass when required field is present', async () => {
      const score = await qualityRuleEngine.evaluateEntry(mockEntry);
      const requiredFieldRule = score.failedRules.find(r => r.ruleId === 'rule-1');
      expect(requiredFieldRule).toBeUndefined();
      expect(score.dimensionScores.completeness).toBeGreaterThan(0);
    });

    it('should fail when optional required field is missing', async () => {
      const score = await qualityRuleEngine.evaluateEntry(mockEntry);
      // examples is an optional field that our rule requires
      const requiredFieldRule = score.failedRules.find(r => r.ruleId === 'rule-1');
      expect(requiredFieldRule).toBeDefined();
      expect(requiredFieldRule?.reason).toContain('missing');
    });

    it('should fail when field is empty and empty not allowed', async () => {
      const invalidEntry = { ...mockEntry, term: '' };
      const score = await qualityRuleEngine.evaluateEntry(invalidEntry);
      const requiredFieldRule = score.failedRules.find(r => r.ruleId === 'rule-1');
      expect(requiredFieldRule).toBeDefined();
      expect(requiredFieldRule?.reason).toContain('empty');
    });
  });

  describe('Regex Rules', () => {
    it('should pass when field matches regex pattern', async () => {
      const validEntry = { ...mockEntry, term: 'Test Term' };
      const score = await qualityRuleEngine.evaluateEntry(validEntry);
      const regexRule = score.failedRules.find(r => r.ruleId === 'rule-2');
      expect(regexRule).toBeUndefined();
    });

    it('should fail when field does not match regex pattern', async () => {
      const invalidEntry = { ...mockEntry, term: 'test term' };
      const score = await qualityRuleEngine.evaluateEntry(invalidEntry);
      const regexRule = score.failedRules.find(r => r.ruleId === 'rule-2');
      expect(regexRule).toBeDefined();
      expect(regexRule?.reason).toContain('pattern');
    });
  });

  describe('Length Rules', () => {
    it('should pass when field length is within bounds', async () => {
      const validEntry = { ...mockEntry, definition: 'This is a valid definition length' };
      const score = await qualityRuleEngine.evaluateEntry(validEntry);
      const lengthRule = score.failedRules.find(r => r.ruleId === 'rule-3');
      expect(lengthRule).toBeUndefined();
    });

    it('should fail when field is too short', async () => {
      const invalidEntry = { ...mockEntry, definition: 'Too short' };
      const score = await qualityRuleEngine.evaluateEntry(invalidEntry);
      const lengthRule = score.failedRules.find(r => r.ruleId === 'rule-3');
      expect(lengthRule).toBeDefined();
      expect(lengthRule?.reason).toContain('shorter');
    });

    it('should fail when field is too long', async () => {
      const invalidEntry = { ...mockEntry, definition: 'a'.repeat(1001) };
      const score = await qualityRuleEngine.evaluateEntry(invalidEntry);
      const lengthRule = score.failedRules.find(r => r.ruleId === 'rule-3');
      expect(lengthRule).toBeDefined();
      expect(lengthRule?.reason).toContain('longer');
    });
  });

  describe('Format Rules', () => {
    it('should pass when field matches required format', async () => {
      const validEntry = { ...mockEntry, email: 'test@example.com' };
      const score = await qualityRuleEngine.evaluateEntry(validEntry);
      const formatRule = score.failedRules.find(r => r.ruleId === 'rule-4');
      expect(formatRule).toBeUndefined();
    });

    it('should fail when field does not match required format', async () => {
      const invalidEntry = { ...mockEntry, email: 'invalid-email' };
      const score = await qualityRuleEngine.evaluateEntry(invalidEntry);
      const formatRule = score.failedRules.find(r => r.ruleId === 'rule-4');
      expect(formatRule).toBeDefined();
      expect(formatRule?.reason).toContain('Invalid email format');
    });

    it('should handle various format types correctly', async () => {
      const entry = {
        ...mockEntry,
        email: 'test@example.com',
        url: 'https://example.com',
        date: '2025-01-20',
        number: '42',
      };

      const formatRules: QualityRule[] = ['email', 'url', 'date', 'number'].map((format, index) => ({
        id: `format-${index}`,
        dictionaryId: 'test-dict-1',
        name: `${format} Format`,
        ruleType: 'format',
        configuration: {
          field: format,
          format: format as 'email' | 'url' | 'date' | 'number',
        },
        severity: 'error',
        createdAt: '2025-01-20T09:00:00.000Z',
        createdBy: 'test-user',
        updatedAt: '2025-01-20T09:00:00.000Z',
      }));

      // Mock loading format rules
      const mockFormatRulesData = formatRules.map(rule => ({
        id: rule.id,
        dictionary_id: rule.dictionaryId,
        name: rule.name,
        rule_type: rule.ruleType,
        configuration: rule.configuration,
        severity: rule.severity,
        created_at: rule.createdAt,
        created_by: rule.createdBy,
        updated_at: rule.updatedAt,
      }));

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockFormatRulesData,
          error: null,
        }),
      });

      await qualityRuleEngine.loadRules('test-dict-1');
      const score = await qualityRuleEngine.evaluateEntry(entry);
      expect(score.failedRules).toHaveLength(0);
    });
  });

  describe('Score Calculation', () => {
    it('should calculate dimension scores correctly', async () => {
      const score = await qualityRuleEngine.evaluateEntry(mockEntry);
      expect(score.dimensionScores.completeness).toBeDefined();
      expect(score.dimensionScores.accuracy).toBeDefined();
      expect(score.dimensionScores.consistency).toBeDefined();
      expect(score.totalScore).toBeLessThanOrEqual(100);
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
    });

    it('should normalize scores between 0 and 100', async () => {
      const score = await qualityRuleEngine.evaluateEntry(mockEntry);
      Object.values(score.dimensionScores).forEach(dimensionScore => {
        expect(dimensionScore).toBeLessThanOrEqual(100);
        expect(dimensionScore).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Score Persistence', () => {
    it('should save quality scores to the database', async () => {
      await qualityRuleEngine.evaluateEntry(mockEntry);
      expect(supabase.from).toHaveBeenCalledWith('quality_scores');
      const upsertMock = supabase.from('quality_scores').upsert;
      expect(upsertMock).toHaveBeenCalled();
    });

    it('should handle database errors when saving scores', async () => {
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        upsert: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      }));

      await expect(qualityRuleEngine.evaluateEntry(mockEntry)).rejects.toThrow();
    });
  });
});