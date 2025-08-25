export interface Change {
  id: string;
  type: ChangeType;
  timestamp: number;
  source: ChangeSource;
  confidence: number; // 0-1
  content: {
    before: string;
    after: string;
  };
  position: {
    start: number;
    end: number;
    line?: number;
    column?: number;
  };
  category: ChangeCategory;
  status: ChangeStatus;
  metadata?: {
    clusterId?: string;
    reason?: string;
    suggestion?: string;
    context?: string;
  };
}

export enum ChangeType {
  INSERT = 'insert',
  DELETE = 'delete',
  REPLACE = 'replace',
  MOVE = 'move'
}

export enum ChangeSource {
  AI_GRAMMAR = 'ai-grammar',
  AI_STYLE = 'ai-style',
  AI_CONTENT = 'ai-content',
  MANUAL_EDIT = 'manual-edit',
  SPELL_CHECK = 'spell-check',
  COLLABORATION = 'collaboration'
}

export enum ChangeCategory {
  GRAMMAR = 'grammar',
  STYLE = 'style',
  STRUCTURE = 'structure',
  CONTENT = 'content',
  FORMATTING = 'formatting',
  SPELLING = 'spelling'
}

export enum ChangeStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CONFLICTED = 'conflicted'
}

export interface ChangeCluster {
  id: string;
  changes: Change[];
  category: ChangeCategory;
  confidence: number;
  title: string;
  description?: string;
  status: ChangeStatus;
}

export interface TrackingSession {
  id: string;
  documentId: string;
  startTime: number;
  endTime?: number;
  changes: Change[];
  clusters: ChangeCluster[];
  statistics: {
    totalChanges: number;
    acceptedChanges: number;
    rejectedChanges: number;
    pendingChanges: number;
    avgConfidence: number;
  };
}

export interface DiffViewConfig {
  showLineNumbers: boolean;
  highlightSyntax: boolean;
  showInlineChanges: boolean;
  colorBySource: boolean;
  colorByConfidence: boolean;
  compactMode: boolean;
  showMetadata: boolean;
}

export interface TimelineEntry {
  timestamp: number;
  changeId: string;
  action: 'added' | 'accepted' | 'rejected' | 'modified';
  user?: string;
}

export interface RevisionHeatmapData {
  documentId: string;
  revisions: Array<{
    timestamp: number;
    changeCount: number;
    intensity: number; // 0-1
    categories: Record<ChangeCategory, number>;
  }>;
}

export interface KeyboardShortcut {
  key: string;
  modifiers?: Array<'ctrl' | 'alt' | 'shift' | 'meta'>;
  action: string;
  description: string;
}

export interface FilterOptions {
  sources?: ChangeSource[];
  categories?: ChangeCategory[];
  statuses?: ChangeStatus[];
  confidenceRange?: [number, number];
  timeRange?: [number, number];
  searchText?: string;
}

export interface BulkOperation {
  type: 'accept' | 'reject' | 'cluster' | 'unccluster';
  changeIds: string[];
  options?: Record<string, any>;
}

// Animation and UI types
export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

export interface VisualTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  transitions: {
    fast: AnimationConfig;
    normal: AnimationConfig;
    slow: AnimationConfig;
  };
  shadows: {
    small: string;
    medium: string;
    large: string;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
}