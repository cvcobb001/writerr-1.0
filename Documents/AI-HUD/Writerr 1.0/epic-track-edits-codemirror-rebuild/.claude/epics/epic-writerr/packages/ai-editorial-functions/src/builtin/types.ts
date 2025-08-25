/**
 * @fileoverview Types for built-in editorial functions
 */

import { TrackEditsConfig } from '../types';

export type BuiltinFunctionType = 'copy-editor' | 'proofreader' | 'developmental-editor' | 'co-writer';

export interface BuiltinFunctionConfig {
  enabled: boolean;
  priority: number;
  trackEditsConfig: TrackEditsConfig;
  constraints?: {
    maxOutputLength?: number;
    minConfidenceScore?: number;
    executionTimeout?: number;
  };
}

export interface CopyEditorConfig extends BuiltinFunctionConfig {
  preserveVoice: boolean;
  minimalIntervention: boolean;
  focusAreas: Array<'grammar' | 'style' | 'clarity' | 'flow' | 'conciseness'>;
}

export interface ProofreaderConfig extends BuiltinFunctionConfig {
  strictMode: boolean;
  errorTypes: Array<'grammar' | 'spelling' | 'punctuation' | 'capitalization' | 'syntax'>;
  confidenceThreshold: number;
}

export interface DevelopmentalEditorConfig extends BuiltinFunctionConfig {
  analysisDepth: 'surface' | 'moderate' | 'comprehensive';
  focusAreas: Array<'structure' | 'argument' | 'organization' | 'content' | 'audience'>;
  provideSuggestions: boolean;
}

export interface CoWriterConfig extends BuiltinFunctionConfig {
  voiceMatching: boolean;
  creativityLevel: 'conservative' | 'moderate' | 'creative';
  contentTypes: Array<'expansion' | 'bridge' | 'development' | 'creative'>;
}

export interface BuiltinFunctionResult {
  functionId: string;
  success: boolean;
  output?: string;
  metadata?: any;
  confidence?: number;
  changes?: Array<{
    type: string;
    original: string;
    revised: string;
    reason: string;
    position: { start: number; end: number };
  }>;
  error?: string;
  executionTime?: number;
}

export interface VoiceAnalysis {
  formalityLevel: 'formal' | 'semi-formal' | 'casual' | 'informal';
  averageSentenceLength: number;
  vocabularyComplexity: 'basic' | 'intermediate' | 'advanced' | 'expert';
  toneCharacteristics: string[];
  uniquePatterns: string[];
}

export interface EditorialChange {
  type: string;
  severity: 'minor' | 'moderate' | 'significant';
  original: string;
  revised: string;
  rationale: string;
  position: { start: number; end: number };
  confidence: number;
}

export interface StructuralAnalysis {
  currentStructure: Array<{
    section: string;
    purpose: string;
    effectiveness: 'strong' | 'adequate' | 'weak';
    issues: string[];
  }>;
  overallOrganization: 'excellent' | 'good' | 'adequate' | 'needs-improvement' | 'poor';
  primaryStructuralIssues: string[];
}

export interface ContentAnalysis {
  argumentStrength: 'compelling' | 'solid' | 'adequate' | 'weak' | 'unclear';
  evidenceQuality: 'excellent' | 'good' | 'adequate' | 'insufficient' | 'poor';
  contentGaps: Array<{
    type: 'missing-info' | 'underdeveloped' | 'unclear' | 'unsupported';
    location: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  audienceAlignment: 'excellent' | 'good' | 'adequate' | 'misaligned' | 'unclear';
}