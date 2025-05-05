/**
 * WebSocket Data Synchronization Service
 * 
 * This module handles the client-side WebSocket connection for
 * receiving real-time data updates from the server, eliminating
 * the need for manual refreshes or polling.
 */
import { queryClient } from '@/lib/queryClient';

// Entity types that can be updated
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

// Message types from server
export type NotificationType = 
  | 'data-update' 
  | 'refresh-required' 
  | 'system-message';

// Message structure
export interface UpdateMessage {
  type: NotificationType;
  entity?: UpdateEntity;
  message?: string;
  timestamp: number;
}

// Callback for system messages
export type SystemMessageCallback = (message: string) => void;

// Map entity names to their API endpoint paths for cache invalidation
const entityToQueryKey: Record<UpdateEntity, string[]> = {
  planners: ['/api/planners'],
  plannerSlots: ['/api/planner-slots'],
  plannerAssignments: ['/api/planner-assignments'],
  musicians: ['/api/musicians'],
  venues: ['/api/venues'],
  categories: ['/api/categories'],
  musicianPayRates: ['/api/musician-pay-rates'],
  eventCategories: ['/api/event-categories'],
  availability: ['/api/availability'],
  monthlyContracts: ['/api/monthly-contracts'],
  all: ['all-data'] // Special case that will trigger a full refresh
};

// Connection state
let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;
let isConnecting = false;
let systemMessageCallbacks: SystemMessageCallback[] = [];

/**
 * Create and initialize the WebSocket connection
 */
export function initWebSocketConnection(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) || isConnecting) {
    return; // Already connected or connecting
  }

  isConnecting = true;
  console.log('Initializing WebSocket connection for real-time updates...');

  // Determine WebSocket URL based on current protocol and host
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  // Create WebSocket
  ws = new WebSocket(wsUrl);

  // Connection opened
  ws.addEventListener('open', () => {
    console.log('WebSocket connection established');
    isConnecting = false;
    reconnectAttempts = 0; // Reset reconnect counter on successful connection
    
    // Optionally send client info to server
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'client-info',
        clientType: 'web-app',
        timestamp: Date.now()
      }));
    }
  });

  // Listen for messages
  ws.addEventListener('message', (event) => {
    try {
      const message: UpdateMessage = JSON.parse(event.data);
      handleServerMessage(message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  // Connection closed
  ws.addEventListener('close', () => {
    console.log('WebSocket connection closed');
    isConnecting = false;
    ws = null;
    scheduleReconnect();
  });

  // Connection error
  ws.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
    isConnecting = false;
    scheduleReconnect();
  });
}

/**
 * Schedule a reconnection attempt with exponential backoff
 */
function scheduleReconnect(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  // Exponential backoff with max delay of 30 seconds
  const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 30000);
  reconnectAttempts++;

  console.log(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
  
  reconnectTimeout = setTimeout(() => {
    initWebSocketConnection();
  }, delay);
}

/**
 * Close the WebSocket connection
 */
export function closeWebSocketConnection(): void {
  if (ws) {
    ws.close();
    ws = null;
  }
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  systemMessageCallbacks = [];
  isConnecting = false;
}

/**
 * Register a callback for system messages
 */
export function onSystemMessage(callback: SystemMessageCallback): () => void {
  systemMessageCallbacks.push(callback);
  
  // Return a function to unregister this callback
  return () => {
    systemMessageCallbacks = systemMessageCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Handle incoming server messages
 */
function handleServerMessage(message: UpdateMessage): void {
  console.log('WebSocket message received:', message);
  
  switch (message.type) {
    case 'data-update':
      // Data update notification - invalidate the appropriate cache
      if (message.entity && entityToQueryKey[message.entity]) {
        const queryKeys = entityToQueryKey[message.entity];
        invalidateQueries(queryKeys);
      }
      break;
      
    case 'refresh-required':
      // Server explicitly asks for a refresh - force refetch
      if (message.entity && entityToQueryKey[message.entity]) {
        const queryKeys = entityToQueryKey[message.entity];
        if (message.entity === 'all') {
          // Special case - invalidate everything
          queryClient.invalidateQueries();
        } else {
          // Refetch specific data
          invalidateQueries(queryKeys, true);
        }
      }
      break;
      
    case 'system-message':
      // System message - notify UI components that registered for notifications
      if (message.message) {
        systemMessageCallbacks.forEach(callback => {
          try {
            callback(message.message!);
          } catch (error) {
            console.error('Error in system message callback:', error);
          }
        });
      }
      break;
      
    default:
      console.warn('Unknown WebSocket message type:', message.type);
  }
}

/**
 * Invalidate queries in the cache and optionally force a refetch
 */
function invalidateQueries(queryKeys: string[], forceRefetch: boolean = false): void {
  queryKeys.forEach(key => {
    console.log(`Invalidating query cache for ${key}`);
    queryClient.invalidateQueries({ queryKey: [key] });
    
    if (forceRefetch) {
      // Force an immediate refetch
      queryClient.refetchQueries({ queryKey: [key] });
    }
  });
}

// Auto-initialize connection when this module is imported
if (typeof window !== 'undefined') {
  // Only run in browser environment, not during SSR
  window.addEventListener('load', () => {
    initWebSocketConnection();
  });
  
  // Reconnect when the window regains focus
  window.addEventListener('focus', () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      initWebSocketConnection();
    }
  });
}