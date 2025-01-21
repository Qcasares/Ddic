export interface QualityRule {
  id: string;
  dictionaryId: string;
  ruleType: string;
  name: string;
  description: string;
  severity: string;
  condition: string;
  field: string;
  value?: string | number | string[];
  enabled: boolean;
  configuration?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface CreateQualityRule {
  dictionaryId: string;
  ruleType: string;
  name: string;
  description: string;
  severity: string;
  condition: string;
  field: string;
  value?: string | number | string[];
  enabled: boolean;
  configuration?: Record<string, unknown>;
}

export interface UpdateQualityRule {
  id: string;
  dictionaryId?: string;
  ruleType?: string;
  name?: string;
  description?: string;
  severity?: string;
  condition?: string;
  field?: string;
  value?: string | number | string[];
  enabled?: boolean;
  configuration?: Record<string, unknown>;
}

export interface QualityRuleRepository {
  create(rule: CreateQualityRule): Promise<QualityRule>;
  update(rule: UpdateQualityRule): Promise<QualityRule>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<QualityRule | null>;
  getAll(): Promise<QualityRule[]>;
  getByDictionaryId(dictionaryId: string): Promise<QualityRule[]>;
}