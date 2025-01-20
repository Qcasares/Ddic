export interface Dictionary {
    id: string;
    name: string;
    description: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    is_public: boolean;
    version?: number;  // Added optional version property
    is_archived?: boolean;  // Also added optional is_archived property
    domain?: string;  // Added optional domain property based on form data
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
    field_name?: string;
    [key: string]: any;
}

export interface Version {
    id: string;
    dictionary_id: string;
    version_number: number;
    version: number;
    changes: Record<string, any>;
    created_at: string;
    created_by: string;
    dictionary_entries: DictionaryEntry[];
}

export interface VersionHistoryProps {
    dictionaryId: string;
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

// Document Processing Types
export interface ProcessedDocument {
    id: string;
    originalName: string;
    mimeType: string;
    content: string;
    metadata: DocumentMetadata;
    created_at: string;
    processed_at: string;
}

export interface DocumentMetadata {
    fileSize: number;
    pageCount?: number;
    author?: string;
    creationDate?: string;
    lastModified?: string;
    format: string;
}

export interface ExtractedTerm {
    term: string;
    context: string;
    confidence: number;
    frequency: number;
    position: number[];
    type: 'technical' | 'business' | 'general';
    related_terms?: string[];
}

export interface ProcessingResult {
    documentId: string;
    extractedTerms: ExtractedTerm[];
    processingMetrics: {
        processingTime: number;
        termsFound: number;
        confidence: number;
    };
    status: 'completed' | 'failed' | 'partial';
    errors?: string[];
}

export interface ProcessingOptions {
    extractionMethod: 'statistical' | 'ml' | 'hybrid';
    minConfidence: number;
    maxTerms?: number;
    includeDomainSpecific: boolean;
    languages?: string[];
}