import { QualityRuleRepository } from '../repositories/quality-rule-repository';
import { Logger } from '../utils/logger';
import { DatabaseError } from '../utils/errors';
import { QualityRule } from '../quality-management';

// Mock Supabase client
// Create reusable mock chain builders
const createMockChain = () => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
});

const mockSupabase = {
    from: jest.fn().mockReturnValue(createMockChain()),
};

// Mock logger
const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
} as unknown as Logger;

describe('QualityRuleRepository', () => {
    let repository: QualityRuleRepository;
    const testRule: QualityRule = {
        id: 'test-rule-1',
        dictionaryId: 'test-dict-1',
        name: 'Test Rule',
        ruleType: 'required_field',
        configuration: {
            field: 'test_field',
            allowEmpty: false,
        },
        severity: 'error',
        createdAt: '2025-01-20T09:00:00.000Z',
        createdBy: 'test-user',
        updatedAt: '2025-01-20T09:00:00.000Z',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new QualityRuleRepository(mockSupabase as any, mockLogger);
    });

    describe('findByDictionaryId', () => {
        it('should return rules for a dictionary', async () => {
            const mockRules = [
                {
                    id: testRule.id,
                    dictionary_id: testRule.dictionaryId,
                    name: testRule.name,
                    rule_type: testRule.ruleType,
                    configuration: testRule.configuration,
                    severity: testRule.severity,
                    created_at: testRule.createdAt,
                    created_by: testRule.createdBy,
                    updated_at: testRule.updatedAt,
                },
            ];

            mockSupabase.from().select().eq.mockResolvedValue({
                data: mockRules,
                error: null,
            });

            const result = await repository.findByDictionaryId(testRule.dictionaryId);

            expect(mockSupabase.from).toHaveBeenCalledWith('quality_rules');
            expect(mockSupabase.from().select().eq).toHaveBeenCalledWith(
                'dictionary_id',
                testRule.dictionaryId
            );
            expect(result).toEqual([testRule]);
        });

        it('should handle database errors', async () => {
            mockSupabase.from().select().eq.mockResolvedValue({
                data: null,
                error: new Error('Database error'),
            });

            await expect(repository.findByDictionaryId(testRule.dictionaryId))
                .rejects
                .toThrow(DatabaseError);
        });
    });

    describe('createRule', () => {
        it('should create a new rule', async () => {
            const { id, createdAt, updatedAt, ...newRule } = testRule;
            const mockCreated = {
                id: 'new-rule-id',
                dictionary_id: newRule.dictionaryId,
                name: newRule.name,
                rule_type: newRule.ruleType,
                configuration: newRule.configuration,
                severity: newRule.severity,
                created_at: '2025-01-20T09:00:00.000Z',
                created_by: newRule.createdBy,
                updated_at: '2025-01-20T09:00:00.000Z',
            };

            mockSupabase.from().insert().select().single.mockResolvedValue({
                data: mockCreated,
                error: null,
            });

            const result = await repository.createRule(newRule);

            expect(mockSupabase.from).toHaveBeenCalledWith('quality_rules');
            expect(mockSupabase.from().insert).toHaveBeenCalled();
            expect(result).toMatchObject({
                id: mockCreated.id,
                dictionaryId: mockCreated.dictionary_id,
                name: mockCreated.name,
            });
        });

        it('should validate required fields', async () => {
            const invalidRule = {
                name: 'Invalid Rule',
                // Missing required fields
            };

            await expect(repository.createRule(invalidRule as any))
                .rejects
                .toThrow(DatabaseError);
        });
    });

    describe('updateRule', () => {
        it('should update an existing rule', async () => {
            const update = {
                name: 'Updated Rule',
                severity: 'warning' as const,
            };

            const mockUpdated = {
                ...testRule,
                dictionary_id: testRule.dictionaryId,
                rule_type: testRule.ruleType,
                created_at: testRule.createdAt,
                created_by: testRule.createdBy,
                updated_at: new Date().toISOString(),
                ...update,
            };

            const mockChain = createMockChain();
            mockChain.single.mockResolvedValue({
                data: mockUpdated,
                error: null
            });
            mockSupabase.from.mockReturnValue(mockChain);

            const result = await repository.updateRule(testRule.id, update);

            expect(mockSupabase.from).toHaveBeenCalledWith('quality_rules');
            expect(result).toMatchObject({
                id: testRule.id,
                name: update.name,
                severity: update.severity,
            });
        });
    });

    describe('upsertRules', () => {
        it('should batch upsert multiple rules', async () => {
            const rules = [testRule];
            const mockUpserted = rules.map(rule => ({
                ...rule,
                dictionary_id: rule.dictionaryId,
                rule_type: rule.ruleType,
                created_at: rule.createdAt,
                created_by: rule.createdBy,
                updated_at: rule.updatedAt,
            }));

            mockSupabase.from().upsert().select.mockResolvedValue({
                data: mockUpserted,
                error: null,
            });

            const result = await repository.upsertRules(rules);

            expect(mockSupabase.from).toHaveBeenCalledWith('quality_rules');
            expect(mockSupabase.from().upsert).toHaveBeenCalled();
            expect(result).toHaveLength(rules.length);
            expect(result[0]).toMatchObject(rules[0]);
        });

        it('should handle empty input array', async () => {
            const result = await repository.upsertRules([]);
            expect(result).toEqual([]);
        });
    });
});