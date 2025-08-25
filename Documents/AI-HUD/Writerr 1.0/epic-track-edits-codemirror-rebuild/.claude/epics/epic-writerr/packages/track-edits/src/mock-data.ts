import { Change, ChangeCluster, TrackingSession, TimelineEntry, RevisionHeatmapData, ChangeType, ChangeSource, ChangeCategory, ChangeStatus } from './types';

export const mockChanges: Change[] = [
  {
    id: 'change-1',
    type: ChangeType.REPLACE,
    timestamp: Date.now() - 300000,
    source: ChangeSource.AI_GRAMMAR,
    confidence: 0.95,
    content: {
      before: 'The quick brown fox jump over the lazy dog.',
      after: 'The quick brown fox jumps over the lazy dog.'
    },
    position: {
      start: 20,
      end: 24,
      line: 1,
      column: 20
    },
    category: ChangeCategory.GRAMMAR,
    status: ChangeStatus.PENDING,
    metadata: {
      reason: 'Subject-verb agreement error',
      suggestion: 'Change "jump" to "jumps" to match singular subject'
    }
  },
  {
    id: 'change-2',
    type: ChangeType.INSERT,
    timestamp: Date.now() - 240000,
    source: ChangeSource.AI_STYLE,
    confidence: 0.82,
    content: {
      before: 'This is good.',
      after: 'This is really good.'
    },
    position: {
      start: 8,
      end: 8,
      line: 2,
      column: 8
    },
    category: ChangeCategory.STYLE,
    status: ChangeStatus.PENDING,
    metadata: {
      reason: 'Enhance emphasis',
      suggestion: 'Add "really" to strengthen the statement'
    }
  },
  {
    id: 'change-3',
    type: ChangeType.DELETE,
    timestamp: Date.now() - 180000,
    source: ChangeSource.AI_CONTENT,
    confidence: 0.67,
    content: {
      before: 'I think that maybe this could be better.',
      after: 'This could be better.'
    },
    position: {
      start: 0,
      end: 18,
      line: 3,
      column: 0
    },
    category: ChangeCategory.STYLE,
    status: ChangeStatus.ACCEPTED,
    metadata: {
      reason: 'Remove hedging language',
      suggestion: 'Eliminate "I think that maybe" for more direct communication'
    }
  },
  {
    id: 'change-4',
    type: ChangeType.REPLACE,
    timestamp: Date.now() - 120000,
    source: ChangeSource.SPELL_CHECK,
    confidence: 0.98,
    content: {
      before: 'recieve',
      after: 'receive'
    },
    position: {
      start: 45,
      end: 52,
      line: 4,
      column: 10
    },
    category: ChangeCategory.SPELLING,
    status: ChangeStatus.PENDING,
    metadata: {
      reason: 'Spelling correction',
      suggestion: 'Correct "recieve" to "receive"'
    }
  },
  {
    id: 'change-5',
    type: ChangeType.REPLACE,
    timestamp: Date.now() - 60000,
    source: ChangeSource.AI_GRAMMAR,
    confidence: 0.89,
    content: {
      before: 'Between you and I',
      after: 'Between you and me'
    },
    position: {
      start: 0,
      end: 16,
      line: 5,
      column: 0
    },
    category: ChangeCategory.GRAMMAR,
    status: ChangeStatus.REJECTED,
    metadata: {
      reason: 'Pronoun case correction',
      suggestion: 'Use object pronoun "me" after preposition "between"'
    }
  }
];

export const mockClusters: ChangeCluster[] = [
  {
    id: 'cluster-1',
    changes: [mockChanges[0], mockChanges[3]],
    category: ChangeCategory.GRAMMAR,
    confidence: 0.97,
    title: 'Grammar Corrections',
    description: 'Basic grammar and spelling fixes',
    status: ChangeStatus.PENDING
  },
  {
    id: 'cluster-2',
    changes: [mockChanges[1], mockChanges[2]],
    category: ChangeCategory.STYLE,
    confidence: 0.75,
    title: 'Style Improvements',
    description: 'Enhance clarity and impact',
    status: ChangeStatus.PENDING
  }
];

export const mockSession: TrackingSession = {
  id: 'session-1',
  documentId: 'doc-123',
  startTime: Date.now() - 600000,
  changes: mockChanges,
  clusters: mockClusters,
  statistics: {
    totalChanges: 5,
    acceptedChanges: 1,
    rejectedChanges: 1,
    pendingChanges: 3,
    avgConfidence: 0.86
  }
};

export const mockTimeline: TimelineEntry[] = [
  {
    timestamp: Date.now() - 300000,
    changeId: 'change-1',
    action: 'added'
  },
  {
    timestamp: Date.now() - 240000,
    changeId: 'change-2',
    action: 'added'
  },
  {
    timestamp: Date.now() - 180000,
    changeId: 'change-3',
    action: 'added'
  },
  {
    timestamp: Date.now() - 120000,
    changeId: 'change-4',
    action: 'added'
  },
  {
    timestamp: Date.now() - 90000,
    changeId: 'change-3',
    action: 'accepted',
    user: 'user-1'
  },
  {
    timestamp: Date.now() - 60000,
    changeId: 'change-5',
    action: 'added'
  },
  {
    timestamp: Date.now() - 30000,
    changeId: 'change-5',
    action: 'rejected',
    user: 'user-1'
  }
];

export const mockHeatmapData: RevisionHeatmapData = {
  documentId: 'doc-123',
  revisions: [
    {
      timestamp: Date.now() - 86400000, // 1 day ago
      changeCount: 12,
      intensity: 0.8,
      categories: {
        [ChangeCategory.GRAMMAR]: 5,
        [ChangeCategory.STYLE]: 4,
        [ChangeCategory.CONTENT]: 2,
        [ChangeCategory.SPELLING]: 1,
        [ChangeCategory.STRUCTURE]: 0,
        [ChangeCategory.FORMATTING]: 0
      }
    },
    {
      timestamp: Date.now() - 43200000, // 12 hours ago
      changeCount: 8,
      intensity: 0.6,
      categories: {
        [ChangeCategory.GRAMMAR]: 3,
        [ChangeCategory.STYLE]: 3,
        [ChangeCategory.CONTENT]: 1,
        [ChangeCategory.SPELLING]: 1,
        [ChangeCategory.STRUCTURE]: 0,
        [ChangeCategory.FORMATTING]: 0
      }
    },
    {
      timestamp: Date.now() - 21600000, // 6 hours ago
      changeCount: 15,
      intensity: 1.0,
      categories: {
        [ChangeCategory.GRAMMAR]: 4,
        [ChangeCategory.STYLE]: 5,
        [ChangeCategory.CONTENT]: 4,
        [ChangeCategory.SPELLING]: 1,
        [ChangeCategory.STRUCTURE]: 1,
        [ChangeCategory.FORMATTING]: 0
      }
    },
    {
      timestamp: Date.now() - 10800000, // 3 hours ago
      changeCount: 5,
      intensity: 0.3,
      categories: {
        [ChangeCategory.GRAMMAR]: 2,
        [ChangeCategory.STYLE]: 1,
        [ChangeCategory.CONTENT]: 1,
        [ChangeCategory.SPELLING]: 1,
        [ChangeCategory.STRUCTURE]: 0,
        [ChangeCategory.FORMATTING]: 0
      }
    },
    {
      timestamp: Date.now() - 3600000, // 1 hour ago
      changeCount: 10,
      intensity: 0.7,
      categories: {
        [ChangeCategory.GRAMMAR]: 3,
        [ChangeCategory.STYLE]: 4,
        [ChangeCategory.CONTENT]: 2,
        [ChangeCategory.SPELLING]: 0,
        [ChangeCategory.STRUCTURE]: 1,
        [ChangeCategory.FORMATTING]: 0
      }
    }
  ]
};

export const mockKeyboardShortcuts = [
  { key: 'a', modifiers: ['ctrl'], action: 'accept-change', description: 'Accept current change' },
  { key: 'r', modifiers: ['ctrl'], action: 'reject-change', description: 'Reject current change' },
  { key: 'n', modifiers: ['ctrl'], action: 'next-change', description: 'Go to next change' },
  { key: 'p', modifiers: ['ctrl'], action: 'previous-change', description: 'Go to previous change' },
  { key: 'c', modifiers: ['ctrl'], action: 'cluster-changes', description: 'Cluster selected changes' },
  { key: 'f', modifiers: ['ctrl'], action: 'filter-changes', description: 'Open filter dialog' },
  { key: 't', modifiers: ['ctrl'], action: 'toggle-timeline', description: 'Toggle timeline view' },
  { key: 'h', modifiers: ['ctrl'], action: 'toggle-heatmap', description: 'Toggle heatmap view' },
  { key: 'Enter', action: 'accept-change', description: 'Accept current change' },
  { key: 'Escape', action: 'cancel-action', description: 'Cancel current action' }
] as const;