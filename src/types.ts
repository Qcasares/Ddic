// Auth types
export interface Session {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    user_metadata: Record<string, any>;
  };
}

// Base types
export interface Dictionary {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  version: number;
  is_archived: boolean;
}

export interface DictionaryEntry {
  id: string;
  dictionary_id: string;
  field_name: string;
  data_type: string;
  description: string | null;
  validation_rules: Record<string, any>;
  sample_values: any[];
  related_fields: any[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string;
  version: number;
}

export interface EntryVersion {
  id: string;
  entry_id: string;
  version: number;
  changes: Record<string, any>;
  created_at: string;
  created_by: string;
}

export interface Comment {
  id: string;
  entry_id: string;
  content: string;
  created_at: string;
  created_by: string;
  parent_id: string | null;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface EntryTag {
  entry_id: string;
  tag_id: string;
}

export interface VersionHistoryProps {
  dictionaryId: string;
  selectedEntryId?: string | null;
}

export interface Version {
  id: string;
  entry_id: string;
  version: number;
  changes: Record<string, any>;
  created_at: string;
  created_by: string;
  dictionary_entries?: {
    field_name: string;
  };
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Component Props
export interface DictionaryListProps {
  selectedDictionary: string | null;
  onSelect: (id: string) => void;
}

export interface DictionaryViewProps {
  dictionaryId: string;
}

export interface FieldManagementProps {
  dictionaryId: string;
  onViewHistory?: (entryId: string) => void;
}

// Hook types
export interface UseDictionaryEntriesOptions {
  dictionaryId: string;
  page: number;
  pageSize: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  search?: string;
  filters?: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'starts_with' | 'ends_with';
    value: string;
  }>;
}

export interface UseDictionaryEntriesResult {
  data: PaginatedResponse<DictionaryEntry> | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  syncStatus: {
    isSyncing: boolean;
    isOnline: boolean;
    lastSyncedAt: string | null;
    error: Error | null;
  };
}

// Performance Monitoring
export type MetricName = 
  | 'cache-miss'
  | 'request-batching'
  | 'database-query'
  | 'render-time'
  | 'realtime-sync'
  | 'auth-operation'
  | 'file-operation';

export interface Metric {
  name: MetricName;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface Threshold {
  value: number;
  severity: 'warning' | 'error';
}

// Request Batching
export interface BatchRequest<T = any> {
  id: string;
  operation: string;
  payload: any;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
}

export interface BatchOptions {
  maxBatchSize?: number;
  batchTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}