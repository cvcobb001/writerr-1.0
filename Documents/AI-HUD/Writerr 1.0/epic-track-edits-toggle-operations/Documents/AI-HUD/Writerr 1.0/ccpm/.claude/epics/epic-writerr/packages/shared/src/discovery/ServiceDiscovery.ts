/**
 * Service Discovery
 * Handles discovery and resolution of plugin services and APIs
 */

import { EventEmitter } from 'events';
import { PluginCapability, ApiExposure, ApiMethod, ApiEvent } from '../registry/types';

export interface ServiceEndpoint {
  pluginId: string;
  capabilityId: string;
  apiName: string;
  methods: Map<string, ServiceMethod>;
  events: Map<string, ServiceEvent>;
  instance?: any;
}

export interface ServiceMethod {
  name: string;
  handler: Function;
  metadata: ApiMethod;
}

export interface ServiceEvent {
  name: string;
  metadata: ApiEvent;
  subscribers: Set<Function>;
}

export interface ServiceQuery {
  pluginId?: string;
  capability?: string;
  apiName?: string;
  method?: string;
  category?: string;
}

export class ServiceDiscovery extends EventEmitter {
  private services: Map<string, ServiceEndpoint> = new Map();
  private servicesByPlugin: Map<string, Set<string>> = new Map();
  private servicesByCapability: Map<string, Set<string>> = new Map();
  private apiCallHistory: Map<string, ApiCallRecord[]> = new Map();

  constructor() {
    super();
  }

  /**
   * Register a service endpoint from a plugin capability
   */
  registerService(
    pluginId: string, 
    capability: PluginCapability, 
    apiExposure: ApiExposure,
    instance: any
  ): void {
    const serviceKey = `${pluginId}:${capability.id}:${apiExposure.name}`;
    
    const methods = new Map<string, ServiceMethod>();
    const events = new Map<string, ServiceEvent>();

    // Register API methods
    for (const method of apiExposure.methods) {
      const handler = instance[method.name];
      if (typeof handler === 'function') {
        methods.set(method.name, {
          name: method.name,
          handler: handler.bind(instance),
          metadata: method
        });
      } else {
        console.warn(`Method ${method.name} not found in plugin ${pluginId} instance`);
      }
    }

    // Register API events
    if (apiExposure.events) {
      for (const event of apiExposure.events) {
        events.set(event.name, {
          name: event.name,
          metadata: event,
          subscribers: new Set()
        });
      }
    }

    const endpoint: ServiceEndpoint = {
      pluginId,
      capabilityId: capability.id,
      apiName: apiExposure.name,
      methods,
      events,
      instance
    };

    this.services.set(serviceKey, endpoint);
    
    // Update indices
    this.updateServiceIndices(pluginId, capability.id, serviceKey);

    this.emit('service:registered', serviceKey, endpoint);
  }

  /**
   * Unregister a service
   */
  unregisterService(pluginId: string, capabilityId: string, apiName: string): void {
    const serviceKey = `${pluginId}:${capabilityId}:${apiName}`;
    const service = this.services.get(serviceKey);
    
    if (service) {
      // Clean up event subscriptions
      for (const [, event] of service.events) {
        event.subscribers.clear();
      }

      this.services.delete(serviceKey);
      this.cleanupServiceIndices(pluginId, capabilityId, serviceKey);

      this.emit('service:unregistered', serviceKey);
    }
  }

  /**
   * Unregister all services for a plugin
   */
  unregisterPluginServices(pluginId: string): void {
    const pluginServices = this.servicesByPlugin.get(pluginId) || new Set();
    
    for (const serviceKey of pluginServices) {
      const service = this.services.get(serviceKey);
      if (service) {
        this.unregisterService(pluginId, service.capabilityId, service.apiName);
      }
    }
  }

  /**
   * Discover services based on query criteria
   */
  discoverServices(query: ServiceQuery): ServiceEndpoint[] {
    const results: ServiceEndpoint[] = [];

    for (const [serviceKey, service] of this.services) {
      if (this.matchesQuery(service, query)) {
        results.push(service);
      }
    }

    return results;
  }

  /**
   * Get a specific service
   */
  getService(pluginId: string, capabilityId: string, apiName: string): ServiceEndpoint | undefined {
    const serviceKey = `${pluginId}:${capabilityId}:${apiName}`;
    return this.services.get(serviceKey);
  }

  /**
   * Call a service method
   */
  async callService(
    pluginId: string, 
    capabilityId: string, 
    apiName: string, 
    methodName: string, 
    ...args: any[]
  ): Promise<any> {
    const service = this.getService(pluginId, capabilityId, apiName);
    if (!service) {
      throw new Error(`Service not found: ${pluginId}:${capabilityId}:${apiName}`);
    }

    const method = service.methods.get(methodName);
    if (!method) {
      throw new Error(`Method ${methodName} not found in service ${apiName}`);
    }

    const callId = this.generateCallId();
    const startTime = Date.now();

    try {
      // Record the API call
      this.recordApiCall(service, methodName, args, startTime, callId);

      // Execute the method
      const result = await method.handler(...args);

      // Update call record with success
      this.updateApiCallRecord(callId, { 
        success: true, 
        result, 
        duration: Date.now() - startTime 
      });

      this.emit('service:call:success', {
        service: service,
        method: methodName,
        args,
        result,
        duration: Date.now() - startTime
      });

      return result;
    } catch (error) {
      // Update call record with error
      this.updateApiCallRecord(callId, { 
        success: false, 
        error, 
        duration: Date.now() - startTime 
      });

      this.emit('service:call:error', {
        service: service,
        method: methodName,
        args,
        error,
        duration: Date.now() - startTime
      });

      throw error;
    }
  }

  /**
   * Subscribe to a service event
   */
  subscribeToEvent(
    pluginId: string, 
    capabilityId: string, 
    apiName: string, 
    eventName: string, 
    handler: Function
  ): () => void {
    const service = this.getService(pluginId, capabilityId, apiName);
    if (!service) {
      throw new Error(`Service not found: ${pluginId}:${capabilityId}:${apiName}`);
    }

    const event = service.events.get(eventName);
    if (!event) {
      throw new Error(`Event ${eventName} not found in service ${apiName}`);
    }

    event.subscribers.add(handler);

    // Return unsubscribe function
    return () => {
      event.subscribers.delete(handler);
    };
  }

  /**
   * Emit a service event
   */
  emitServiceEvent(
    pluginId: string, 
    capabilityId: string, 
    apiName: string, 
    eventName: string, 
    payload?: any
  ): void {
    const service = this.getService(pluginId, capabilityId, apiName);
    if (!service) {
      console.warn(`Service not found for event emission: ${pluginId}:${capabilityId}:${apiName}`);
      return;
    }

    const event = service.events.get(eventName);
    if (!event) {
      console.warn(`Event ${eventName} not found in service ${apiName}`);
      return;
    }

    // Notify all subscribers
    for (const handler of event.subscribers) {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in event handler for ${eventName}:`, error);
        this.emit('service:event:error', { eventName, error, handler });
      }
    }

    this.emit('service:event:emitted', {
      service,
      eventName,
      payload,
      subscriberCount: event.subscribers.size
    });
  }

  /**
   * Get API call history for monitoring and debugging
   */
  getApiCallHistory(pluginId?: string, limit?: number): ApiCallRecord[] {
    let allRecords: ApiCallRecord[] = [];

    if (pluginId) {
      allRecords = this.apiCallHistory.get(pluginId) || [];
    } else {
      for (const records of this.apiCallHistory.values()) {
        allRecords.push(...records);
      }
    }

    // Sort by timestamp descending
    allRecords.sort((a, b) => b.timestamp - a.timestamp);

    if (limit) {
      return allRecords.slice(0, limit);
    }

    return allRecords;
  }

  /**
   * Clear API call history
   */
  clearApiCallHistory(pluginId?: string): void {
    if (pluginId) {
      this.apiCallHistory.delete(pluginId);
    } else {
      this.apiCallHistory.clear();
    }
  }

  private matchesQuery(service: ServiceEndpoint, query: ServiceQuery): boolean {
    if (query.pluginId && service.pluginId !== query.pluginId) {
      return false;
    }

    if (query.capability && service.capabilityId !== query.capability) {
      return false;
    }

    if (query.apiName && service.apiName !== query.apiName) {
      return false;
    }

    if (query.method && !service.methods.has(query.method)) {
      return false;
    }

    return true;
  }

  private updateServiceIndices(pluginId: string, capabilityId: string, serviceKey: string): void {
    // Update plugin index
    if (!this.servicesByPlugin.has(pluginId)) {
      this.servicesByPlugin.set(pluginId, new Set());
    }
    this.servicesByPlugin.get(pluginId)!.add(serviceKey);

    // Update capability index
    if (!this.servicesByCapability.has(capabilityId)) {
      this.servicesByCapability.set(capabilityId, new Set());
    }
    this.servicesByCapability.get(capabilityId)!.add(serviceKey);
  }

  private cleanupServiceIndices(pluginId: string, capabilityId: string, serviceKey: string): void {
    // Clean up plugin index
    const pluginServices = this.servicesByPlugin.get(pluginId);
    if (pluginServices) {
      pluginServices.delete(serviceKey);
      if (pluginServices.size === 0) {
        this.servicesByPlugin.delete(pluginId);
      }
    }

    // Clean up capability index
    const capabilityServices = this.servicesByCapability.get(capabilityId);
    if (capabilityServices) {
      capabilityServices.delete(serviceKey);
      if (capabilityServices.size === 0) {
        this.servicesByCapability.delete(capabilityId);
      }
    }
  }

  private recordApiCall(
    service: ServiceEndpoint, 
    methodName: string, 
    args: any[], 
    startTime: number, 
    callId: string
  ): void {
    const record: ApiCallRecord = {
      id: callId,
      pluginId: service.pluginId,
      capabilityId: service.capabilityId,
      apiName: service.apiName,
      methodName,
      args,
      timestamp: startTime,
      success: false
    };

    if (!this.apiCallHistory.has(service.pluginId)) {
      this.apiCallHistory.set(service.pluginId, []);
    }

    const history = this.apiCallHistory.get(service.pluginId)!;
    history.push(record);

    // Keep only last 1000 records per plugin
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  private updateApiCallRecord(callId: string, update: Partial<ApiCallRecord>): void {
    for (const history of this.apiCallHistory.values()) {
      const record = history.find(r => r.id === callId);
      if (record) {
        Object.assign(record, update);
        break;
      }
    }
  }

  private generateCallId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface ApiCallRecord {
  id: string;
  pluginId: string;
  capabilityId: string;
  apiName: string;
  methodName: string;
  args: any[];
  timestamp: number;
  success: boolean;
  result?: any;
  error?: any;
  duration?: number;
}