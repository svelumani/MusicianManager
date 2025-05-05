/**
 * WebSocket Data Synchronization Service
 * 
 * This module handles the client-side WebSocket connection for
 * receiving real-time data updates from the server, eliminating
 * the need for manual refreshes or polling.
 */
import { queryClient } from '@/lib/queryClient';

// Define entity types that can be updated
export type UpdateEntity = 
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

// Define types of notifications that can be received
export type NotificationType = 
  | 'data-update' 
  | 'refresh-required' 
  | 'system-message';

// Define the structure of update messages from the server
export interface UpdateMessage {
  type: NotificationType;
  entity?: UpdateEntity;
  message?: string;
  timestamp: number;
}

// Callback types for different events
export type DataUpdateCallback = (entity: UpdateEntity) => void;
export type ConnectionStatusCallback = (connected: boolean, reconnecting: boolean) => void;
export type SystemMessageCallback = (message: string) => void;

// WebSocket connection state
let socket: WebSocket | null = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 10;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isConnected = false;
let isReconnecting = false;

// Callback registries
const dataUpdateCallbacks: DataUpdateCallback[] = [];
const connectionStatusCallbacks: ConnectionStatusCallback[] = [];
const systemMessageCallbacks: SystemMessageCallback[] = [];

/**
 * Create and initialize the WebSocket connection
 */
export function initWebSocketConnection(): void {
  // Only initialize once
  if (socket !== null) return;
  
  console.log("Initializing WebSocket connection for real-time updates...");
  
  try {
    // Create WebSocket with correct protocol based on page protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    socket = new WebSocket(wsUrl);
    
    // Set up event handlers
    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);
    socket.addEventListener('close', handleClose);
    socket.addEventListener('error', handleError);
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
    scheduleReconnect();
  }
}

/**
 * Handle successful WebSocket connection
 */
function handleOpen(event: Event): void {
  console.log('WebSocket connection established');
  isConnected = true;
  isReconnecting = false;
  reconnectAttempts = 0;
  
  // Notify all connection status callbacks
  connectionStatusCallbacks.forEach(callback => {
    try {
      callback(true, false);
    } catch (error) {
      console.error('Error in connection status callback:', error);
    }
  });
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(event: MessageEvent): void {
  try {
    const message: UpdateMessage = JSON.parse(event.data);
    console.log('WebSocket message received:', message);
    
    handleServerMessage(message);
  } catch (error) {
    console.error('Error parsing WebSocket message:', error);
  }
}

/**
 * Handle WebSocket connection close
 */
function handleClose(event: CloseEvent): void {
  console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
  isConnected = false;
  
  // Notify all callbacks of disconnection
  connectionStatusCallbacks.forEach(callback => {
    try {
      callback(false, false);
    } catch (error) {
      console.error('Error in connection status callback:', error);
    }
  });
  
  // Attempt to reconnect
  scheduleReconnect();
}

/**
 * Handle WebSocket errors
 */
function handleError(event: Event): void {
  console.error('WebSocket error:', event);
  
  // Socket will be closed after an error, which will trigger reconnect
}

/**
 * Schedule a reconnection attempt with exponential backoff
 */
function scheduleReconnect(): void {
  // Don't schedule if we've hit the max attempts or already have a pending reconnect
  if (reconnectAttempts >= maxReconnectAttempts || reconnectTimer !== null) {
    return;
  }
  
  // Calculate backoff time (1s, 2s, 4s, 8s, etc.)
  const backoffTime = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  reconnectAttempts++;
  isReconnecting = true;
  
  console.log(`Scheduling WebSocket reconnect in ${backoffTime}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
  
  // Notify all callbacks of reconnection attempt
  connectionStatusCallbacks.forEach(callback => {
    try {
      callback(false, true);
    } catch (error) {
      console.error('Error in connection status callback:', error);
    }
  });
  
  // Schedule reconnect
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    
    // Close existing socket if it exists
    closeWebSocketConnection();
    
    // Try to reconnect
    initWebSocketConnection();
  }, backoffTime);
}

/**
 * Close the WebSocket connection
 */
export function closeWebSocketConnection(): void {
  if (!socket) return;
  
  try {
    // Remove event listeners
    socket.removeEventListener('open', handleOpen);
    socket.removeEventListener('message', handleMessage);
    socket.removeEventListener('close', handleClose);
    socket.removeEventListener('error', handleError);
    
    // Close the connection
    socket.close();
  } catch (error) {
    console.error('Error closing WebSocket connection:', error);
  } finally {
    socket = null;
  }
}

/**
 * Register a callback for data updates
 */
export function onDataUpdate(callback: DataUpdateCallback): () => void {
  dataUpdateCallbacks.push(callback);
  
  // Immediately return connection status to the new callback
  setTimeout(() => {
    try {
      callback('all');
    } catch (error) {
      console.error('Error in initial data update callback:', error);
    }
  }, 0);
  
  // Return function to unregister callback
  return () => {
    const index = dataUpdateCallbacks.indexOf(callback);
    if (index !== -1) {
      dataUpdateCallbacks.splice(index, 1);
    }
  };
}

/**
 * Register a callback for connection status changes
 */
export function onConnectionStatus(callback: ConnectionStatusCallback): () => void {
  connectionStatusCallbacks.push(callback);
  
  // Return function to unregister callback
  return () => {
    const index = connectionStatusCallbacks.indexOf(callback);
    if (index !== -1) {
      connectionStatusCallbacks.splice(index, 1);
    }
  };
}

/**
 * Register a callback for system messages
 */
export function onSystemMessage(callback: SystemMessageCallback): () => void {
  systemMessageCallbacks.push(callback);
  
  // Return function to unregister callback
  return () => {
    const index = systemMessageCallbacks.indexOf(callback);
    if (index !== -1) {
      systemMessageCallbacks.splice(index, 1);
    }
  };
}

/**
 * Handle incoming server messages
 */
function handleServerMessage(message: UpdateMessage): void {
  switch (message.type) {
    case 'data-update':
      if (message.entity) {
        console.log(`Invalidating query cache for ${getEndpointFromEntity(message.entity)}`);
        
        // Invalidate the corresponding query cache
        const endpoint = getEndpointFromEntity(message.entity);
        if (endpoint) {
          queryClient.invalidateQueries({ queryKey: [endpoint] });
        }
        
        // Notify all data update callbacks
        dataUpdateCallbacks.forEach(callback => {
          try {
            callback(message.entity!);
          } catch (error) {
            console.error('Error in data update callback:', error);
          }
        });
      }
      break;
      
    case 'refresh-required':
      if (message.entity === 'all') {
        console.log('Global data refresh required, invalidating all queries');
        queryClient.invalidateQueries();
      } else if (message.entity) {
        console.log(`Data refresh required for ${message.entity}`);
        
        // Invalidate the corresponding query cache and force a refetch
        invalidateQueries([getEndpointFromEntity(message.entity)], true);
      }
      
      // Notify all data update callbacks
      if (message.entity) {
        dataUpdateCallbacks.forEach(callback => {
          try {
            callback(message.entity!);
          } catch (error) {
            console.error('Error in data update callback:', error);
          }
        });
      }
      break;
      
    case 'system-message':
      if (message.message) {
        // Notify all system message callbacks
        systemMessageCallbacks.forEach(callback => {
          try {
            callback(message.message!);
          } catch (error) {
            console.error('Error in system message callback:', error);
          }
        });
      }
      break;
  }
}

/**
 * Map entity types to their API endpoints
 */
function getEndpointFromEntity(entity: UpdateEntity): string {
  switch (entity) {
    case 'planners':
      return '/api/planners';
    case 'plannerSlots':
      return '/api/planner-slots';
    case 'plannerAssignments':
      return '/api/planner-assignments';
    case 'musicians':
      return '/api/musicians';
    case 'venues':
      return '/api/venues';
    case 'categories':
      return '/api/event-categories';
    case 'musicianPayRates':
      return '/api/musician-pay-rates';
    case 'eventCategories':
      return '/api/event-categories';
    case 'availability':
      return '/api/availability';
    case 'monthlyContracts':
      return '/api/monthly-contracts';
    default:
      return '';
  }
}

/**
 * Invalidate queries in the cache and optionally force a refetch
 */
function invalidateQueries(queryKeys: string[], forceRefetch: boolean = false): void {
  queryKeys.forEach(key => {
    if (key) {
      queryClient.invalidateQueries({ 
        queryKey: [key],
        refetchType: forceRefetch ? 'active' : 'all'
      });
    }
  });
}