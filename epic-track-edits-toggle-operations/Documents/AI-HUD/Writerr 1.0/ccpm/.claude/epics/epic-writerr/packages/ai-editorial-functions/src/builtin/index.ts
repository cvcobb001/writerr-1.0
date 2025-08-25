/**
 * @fileoverview Built-in function implementations for default editorial functions
 */

export { CopyEditor } from './CopyEditor';
export { Proofreader } from './Proofreader';
export { DevelopmentalEditor } from './DevelopmentalEditor';
export { CoWriter } from './CoWriter';
export { BuiltinFunctionManager } from './BuiltinFunctionManager';

// Export types for built-in functions
export type {
  CopyEditorConfig,
  ProofreaderConfig,
  DevelopmentalEditorConfig,
  CoWriterConfig,
  BuiltinFunctionType,
  BuiltinFunctionResult
} from './types';