/**
 * WebSocket Data Synchronization Module
 * 
 * This module establishes a persistent connection to the server
 * that receives real-time updates when data changes, ensuring
 * the UI always displays accurate information without relying on
 * HTTP cache mechanisms.
 */
import { queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { forceRefreshEntity, type VersionedEntity } from '@/lib/utils/versionTracker';
import { useState, useEffect } from 'react';

// Mapping of server entity names to client entity names (if different)
type ServerEntity = 
  | 'planners'
  | 'plannerSlots'
  | 'plannerAssignments'
  | 'musicians'
  | 'venues'
  | 'categories'
  | 'musicianPayRates' 
  | 'eventCategories'
  | 'availability'
  | 'monthlyContracts'
  | 'all';

// Message types received from server
type MessageType = 'data-update' | 'refresh-required' | 'system-message';

// Message structure
interface ServerMessage {
  type: MessageType;
  entity?: ServerEntity;
  message?: string;
  timestamp: number;
}

// WebSocket connection states
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

// Callbacks for connection state changes
type StateCallback = (state: ConnectionState) => void;

// Singleton class to manage WebSocket connection
class DataSyncManager {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private stateListeners: StateCallback[] = [];
  private currentState: ConnectionState = 'disconnected';
  private autoReconnect = true;
  
  constructor() {
    // Auto connect on initialization
    this.connect();
    
    // Set up window event listeners for online/offline
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Listen for visibility changes (tab focus/unfocus)
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }
  
  // Get the connection state
  public getState(): ConnectionState {
    return this.currentState;
  }
  
  // Subscribe to connection state changes
  public onStateChange(callback: StateCallback): () => void {
    this.stateListeners.push(callback);
    return () => {
      this.stateListeners = this.stateListeners.filter(cb => cb !== callback);
    };
  }
  
  // Connect to the WebSocket server
  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }
    
    try {
      this.setState('connecting');
      
      // Determine the correct WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      this.socket = new WebSocket(wsUrl);
      
      // Connection opened
      this.socket.addEventListener('open', this.handleOpen);
      
      // Connection closed
      this.socket.addEventListener('close', this.handleClose);
      
      // Connection error
      this.socket.addEventListener('error', this.handleError);
      
      // Listen for messages
      this.socket.addEventListener('message', this.handleMessage);
      
    } catch (error) {
      console.error('Error establishing WebSocket connection:', error);
      this.setState('error');
      this.scheduleReconnect();
    }
  }
  
  // Disconnect from the WebSocket server
  public disconnect(preventReconnect = false): void {
    this.autoReconnect = !preventReconnect;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.setState('disconnected');
  }
  
  // Check if connected
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
  
  // Event handlers
  private handleOpen = (): void => {
    console.log('WebSocket connection established');
    this.setState('connected');
    this.reconnectAttempts = 0;
    
    // Request a full data refresh when we connect
    this.requestDataRefresh('all');
  };
  
  private handleClose = (event: CloseEvent): void => {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.setState('disconnected');
    this.socket = null;
    
    if (this.autoReconnect) {
      this.scheduleReconnect();
    }
  };
  
  private handleError = (event: Event): void => {
    console.error('WebSocket error:', event);
    this.setState('error');
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.autoReconnect) {
      this.scheduleReconnect();
    }
  };
  
  private handleMessage = (event: MessageEvent): void => {
    try {
      const message = JSON.parse(event.data) as ServerMessage;
      
      switch (message.type) {
        case 'data-update':
          this.handleDataUpdate(message);
          break;
        case 'refresh-required':
          this.handleRefreshRequired(message);
          break;
        case 'system-message':
          this.handleSystemMessage(message);
          break;
        default:
          console.warn('Unknown message type:', message);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  };
  
  // Handle online/offline events
  private handleOnline = (): void => {
    console.log('Internet connection restored, reconnecting WebSocket');
    this.connect();
  };
  
  private handleOffline = (): void => {
    console.log('Internet connection lost, WebSocket will reconnect when online');
    this.setState('disconnected');
  };
  
  // Handle visibility changes (tab focus/blur)
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      // If tab becomes visible and we're disconnected, reconnect
      if (this.currentState !== 'connected' && this.autoReconnect) {
        console.log('Tab visible, reconnecting WebSocket');
        this.connect();
      }
    }
  };
  
  // Process different message types
  private handleDataUpdate(message: ServerMessage): void {
    if (message.entity) {
      console.log(`Data update received for ${message.entity}`);
      
      // Force refresh of the entity in our version tracker
      this.refreshEntity(message.entity);
    }
  }
  
  private handleRefreshRequired(message: ServerMessage): void {
    if (message.entity) {
      console.log(`Server requested refresh of ${message.entity}`);
      
      if (message.entity === 'all') {
        // Refresh all entities
        this.refreshAllEntities();
      } else {
        // Refresh specific entity
        this.refreshEntity(message.entity);
      }
      
      // Show subtle notification for specific entity refreshes
      if (message.entity !== 'all') {
        toast({
          title: 'Data Refreshed',
          description: `${this.formatEntityName(message.entity)} data has been updated.`,
          variant: 'default',
        });
      }
    }
  }
  
  private handleSystemMessage(message: ServerMessage): void {
    if (message.message) {
      console.log(`System message: ${message.message}`);
      
      // Show as toast notification
      toast({
        title: 'System Message',
        description: message.message,
        duration: 5000,
      });
    }
  }
  
  // Helper methods
  private setState(state: ConnectionState): void {
    if (this.currentState !== state) {
      this.currentState = state;
      this.stateListeners.forEach(listener => listener(state));
    }
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached, giving up');
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000);
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }
  
  private refreshEntity(entity: ServerEntity): void {
    // Map server entity name to client entity name if needed
    const clientEntity = entity as VersionedEntity;
    
    // Force refresh using our version tracking system
    forceRefreshEntity(clientEntity);
    
    // Also invalidate related queries
    switch (entity) {
      case 'planners':
        queryClient.invalidateQueries({ queryKey: ['/api/planners'] });
        break;
      case 'plannerSlots':
        queryClient.invalidateQueries({ queryKey: ['/api/planner-slots'] });
        break;
      case 'plannerAssignments':
        queryClient.invalidateQueries({ queryKey: ['/api/planner-assignments'] });
        break;
      case 'musicians':
        queryClient.invalidateQueries({ queryKey: ['/api/musicians'] });
        break;
      case 'venues':
        queryClient.invalidateQueries({ queryKey: ['/api/venues'] });
        break;
      case 'categories':
        queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
        break;
      case 'eventCategories':
        queryClient.invalidateQueries({ queryKey: ['/api/event-categories'] });
        break;
      case 'musicianPayRates':
        queryClient.invalidateQueries({ queryKey: ['/api/musician-pay-rates'] });
        break;
      case 'availability':
        queryClient.invalidateQueries({ queryKey: ['/api/availability'] });
        break;
      case 'monthlyContracts':
        queryClient.invalidateQueries({ queryKey: ['/api/monthly-contracts'] });
        break;
    }
  }
  
  private refreshAllEntities(): void {
    // Force refresh all entity types
    queryClient.clear();
    queryClient.resetQueries();
    
    // Show notification
    toast({
      title: 'Data Refreshed',
      description: 'All data has been refreshed from the server.',
      variant: 'default',
    });
  }
  
  private formatEntityName(entity: string): string {
    // Format entity names for display in notifications
    const nameMap: Record<string, string> = {
      'planners': 'Planner',
      'plannerSlots': 'Planner slots',
      'plannerAssignments': 'Musician assignments',
      'musicians': 'Musician',
      'venues': 'Venue',
      'categories': 'Category',
      'musicianPayRates': 'Musician pay rates',
      'eventCategories': 'Event categories',
      'availability': 'Availability',
      'monthlyContracts': 'Monthly contracts'
    };
    
    return nameMap[entity] || entity;
  }
  
  // Request data refresh from the server (not needed normally)
  public requestDataRefresh(entity: ServerEntity): void {
    if (this.isConnected() && this.socket) {
      const message = {
        type: 'request-refresh',
        entity
      };
      this.socket.send(JSON.stringify(message));
    }
  }
  
  // Clean up event listeners
  public cleanup(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.disconnect(true);
  }
}

// Export singleton instance
export const dataSync = new DataSyncManager();

// React hook for components to monitor connection state
export const useDataSyncStatus = (): ConnectionState => {
  const [state, setState] = useState<ConnectionState>(dataSync.getState());
  
  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = dataSync.onStateChange(setState);
    return unsubscribe;
  }, []);
  
  return state;
};

// Export a function to manually request data refresh
export const refreshData = (entity: ServerEntity = 'all'): void => {
  if (entity === 'all') {
    queryClient.clear();
    queryClient.resetQueries();
  } else {
    dataSync.requestDataRefresh(entity);
  }
};

// Ensure cleanup on app unmount
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    dataSync.cleanup();
  });
}

// Re-export for convenience
export type { ConnectionState, ServerEntity };