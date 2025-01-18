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

export interface Version {
  id: string;
  created_at: string;
  created_by: string;
  dictionary_id: string;
  version: number;
  dictionary_entries: {
    field_name: string;
    data_type: string;
    description: string | null;
  }[];
}

export interface VersionHistoryProps {
  dictionaryId: string;
  selectedEntryId?: string | null;
}

export interface PerformanceMetrics {
  loadTime: number;
  interactionTime: number;
  resourceTiming: PerformanceResourceTiming[];
  navigationTiming: PerformanceNavigationTiming;
}