/**
 * Integration layer exports for Writerr Chat Plugin
 */

export { TrackEditsIntegration, trackEditsIntegration } from './TrackEditsIntegration';
export { ResponseRouter } from './ResponseRouter';
export { 
  IntegrationErrorHandler, 
  integrationErrorHandler,
  ErrorType,
  ErrorSeverity 
} from './ErrorHandler';
export { 
  IntegrationManager, 
  integrationManager,
  type IntegrationStatus,
  type ProcessedResponse 
} from './IntegrationManager';

export type {
  TrackEditsAPI,
  TrackEditsIntegrationConfig
} from './TrackEditsIntegration';

export type {
  RouterDecision,
  RoutingConfig
} from './ResponseRouter';

export type {
  ErrorInfo,
  ErrorContext,
  RecoveryStrategy,
  FallbackOption
} from './ErrorHandler';