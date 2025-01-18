export interface Dictionary {
    id: string;
    name: string;
    description: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    is_public: boolean;
}

export interface DictionaryEntry {
    id: string;
    dictionary_id: string;
    term: string;
    definition: string;
    examples?: string[];
    tags?: string[];
    metadata?: Record<string, any>;
    related_terms?: string[];
    created_at: string;
    updated_at: string;
    [key: string]: any;
}

export interface Version {
    id: string;
    dictionary_id: string;
    version_number: number;
    changes: string;
    created_at: string;
    created_by: string;
}

export interface AnalyticsMetrics {
    totalEntries: number;
    totalChanges: number;
    lastUpdated: string;
    changeFrequency: number;
    performance: {
        avgLoadTime: number;
        avgInteractionTime: number;
        deviceTypes: Record<string, number>;
    };
    activity: {
        views: number;
        edits: number;
        searches: number;
        activeUsers: number;
    };
}

export interface DatabaseQualityRule {
    id: string;
    dictionary_id: string;
    name: string;
    rule_type: 'regex' | 'required_field' | 'length' | 'format';
    configuration: {
        field: string;
        pattern?: string;
        flags?: string;
        allowEmpty?: boolean;
        minLength?: number;
        maxLength?: number;
        format?: 'email' | 'url' | 'date' | 'number';
    };
    severity: 'error' | 'warning' | 'info';
    created_at: string;
    created_by: string;
    updated_at: string;
}

export interface DatabaseQualityScore {
    id: string;
    entry_id: string;
    total_score: number;
    dimension_scores: {
        completeness: number;
        accuracy: number;
        consistency: number;
    };
    failed_rules: Array<{
        ruleId: string;
        reason: string;
    }>;
    created_at: string;
    updated_at: string;
}

export interface QualityTrendData {
    sum: number;
    count: number;
}

export interface QualityMetrics {
    averageScore: number;
    qualityTrend: Array<{ date: string; score: number }>;
    commonIssues: Array<{ rule: string; count: number }>;
}