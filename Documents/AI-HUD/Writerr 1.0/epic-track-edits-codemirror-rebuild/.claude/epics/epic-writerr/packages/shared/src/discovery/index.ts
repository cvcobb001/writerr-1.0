/**
 * Service Discovery Module
 * Main exports for service discovery and dependency resolution
 */

export { ServiceDiscovery } from './ServiceDiscovery';
export { DependencyResolver } from './DependencyResolver';

export {
  ServiceEndpoint,
  ServiceMethod,
  ServiceEvent,
  ServiceQuery,
  ApiCallRecord
} from './ServiceDiscovery';

export {
  DependencyResolution,
  DependencyConflict
} from './DependencyResolver';