/**
 * WebSocket Data Synchronization
 * 
 * This module provides real-time data synchronization between the client
 * and server using WebSockets. It maintains a connection to the server
 * and notifies subscribers of data changes.
 */
import { toast } from '@/hooks/use-toast';
import type { UpdateEntity, UpdateMessage, NotificationType } from '@/types/websocket';

// Re-export UpdateEntity type so other components can import it directly from this module
export type { UpdateEntity } from '@/types/websocket';

// Connection status states
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Subscriber callback function types
type DataUpdateHandler = (entity: UpdateEntity) => void;
type SystemMessageHandler = (message: string) => void;
type ConnectionStatusHandler = (isConnected: boolean, isReconnecting: boolean) => void;

// WebSocket connection
let socket: WebSocket | null = null;
let connectionStatus: ConnectionStatus = 'disconnected';
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL = 3000; // 3 seconds

// Arrays of registered subscribers/listeners
const subscribers: DataUpdateHandler[] = [];
const systemMessageListeners: SystemMessageHandler[] = [];
const connectionListeners: ((status: ConnectionStatus) => void)[] = [];
const connectionStatusListeners: ConnectionStatusHandler[] = [];

/**
 * Initialize WebSocket connection to the server
 */
export function initWebSocketConnection() {
  // Don't reconnect if we already have an active connection
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log('WebSocket connection already established');
    return;
  }
  
  try {
    // Clean up any existing socket
    if (socket) {
      try {
        socket.close();
      } catch (e) {
        console.error('Error closing previous socket:', e);
      }
      socket = null;
    }
    
    // Update connection status
    setConnectionStatus('connecting');
    
    // Create WebSocket with correct protocol based on window location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Connecting to WebSocket server at ${wsUrl}`);
    
    // Create new WebSocket connection
    const newSocket = new WebSocket(wsUrl);
    
    // Store socket reference
    socket = newSocket;
    
    // Set up ping interval (declared here so it can be referenced in callbacks)
    let pingInterval: NodeJS.Timeout | null = null;
    
    // Handle connection opening
    newSocket.addEventListener('open', () => {
      console.log('WebSocket connection established');
      setConnectionStatus('connected');
      reconnectAttempts = 0;
      
      // Send initial ping to keep connection alive
      try {
        newSocket.send(JSON.stringify({ type: 'ping' }));
      } catch (err) {
        console.error('Error sending initial ping:', err);
      }
      
      // Set up a ping interval to prevent timeouts
      pingInterval = setInterval(() => {
        if (newSocket.readyState === WebSocket.OPEN) {
          try {
            newSocket.send(JSON.stringify({ type: 'ping' }));
          } catch (err) {
            console.error('Error sending ping:', err);
            if (pingInterval) clearInterval(pingInterval);
          }
        } else {
          if (pingInterval) clearInterval(pingInterval);
        }
      }, 15000); // Send ping every 15 seconds (reduced from 30s)
    });
    
    // Handle incoming messages
    newSocket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as UpdateMessage;
        handleMessage(message);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    });
    
    // Handle connection closing
    newSocket.addEventListener('close', (event) => {
      console.log(`WebSocket connection closed: ${event.code} - ${event.reason}`);
      setConnectionStatus('disconnected');
      
      // Clean up ping interval
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      
      // Schedule a reconnect attempt
      scheduleReconnect();
    });
    
    // Handle connection errors
    newSocket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
      
      // Don't schedule reconnect here - the close event will fire after error
    });
    
  } catch (error) {
    console.error('Error initializing WebSocket connection:', error);
    setConnectionStatus('error');
    scheduleReconnect();
  }
}

/**
 * Handle incoming WebSocket message
 */
function handleMessage(message: UpdateMessage) {
  console.log('Received WebSocket message:', message);
  
  switch (message.type) {
    case 'data-update':
      if (message.entity) {
        notifySubscribers(message.entity);
      }
      break;
      
    case 'refresh-required':
      if (message.entity) {
        notifySubscribers(message.entity);
        
        // Show a toast notification for refresh request
        toast({
          title: 'Data Update',
          description: `New ${message.entity} data is available. Refreshing...`,
          variant: 'default',
        });
      }
      break;
      
    case 'system-message':
      if (message.message) {
        // Notify system message listeners
        notifySystemMessageListeners(message.message);
        
        // Show a toast notification for system message
        toast({
          title: 'System Message',
          description: message.message,
          variant: 'default',
        });
      }
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
  }
}

/**
 * Schedule a reconnection attempt
 */
function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    
    const delay = RECONNECT_INTERVAL * Math.min(reconnectAttempts, 10);
    console.log(`Scheduling WebSocket reconnection attempt ${reconnectAttempts} in ${delay}ms`);
    
    reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      initWebSocketConnection();
    }, delay);
  } else {
    console.error(`Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
    
    // Show error toast
    toast({
      title: 'Connection Error',
      description: 'Unable to connect to the server. Please refresh the page.',
      variant: 'destructive',
    });
  }
}

/**
 * Register a callback for data updates
 * Returns a cleanup function to unregister the callback
 */
export function onDataUpdate(callback: DataUpdateHandler): () => void {
  if (!subscribers.includes(callback)) {
    subscribers.push(callback);
  }
  
  // Initialize connection if not already connected
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    initWebSocketConnection();
  }
  
  // Return cleanup function
  return () => {
    const index = subscribers.indexOf(callback);
    if (index !== -1) {
      subscribers.splice(index, 1);
    }
  };
}

/**
 * Register a callback for connection status changes
 * Returns a cleanup function to unregister the callback
 */
export function onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
  // Immediately call with current status
  callback(connectionStatus);
  
  // Add to listeners
  if (!connectionListeners.includes(callback)) {
    connectionListeners.push(callback);
  }
  
  // Return cleanup function
  return () => {
    const index = connectionListeners.indexOf(callback);
    if (index !== -1) {
      connectionListeners.splice(index, 1);
    }
  };
}

/**
 * Notify all subscribers about a data update
 */
function notifySubscribers(entity: UpdateEntity) {
  console.log(`Notifying ${subscribers.length} subscribers about ${entity} update`);
  subscribers.forEach(callback => {
    try {
      callback(entity);
    } catch (err) {
      console.error('Error in subscriber callback:', err);
    }
  });
}

/**
 * Notify all system message listeners
 */
function notifySystemMessageListeners(message: string) {
  console.log(`Notifying ${systemMessageListeners.length} system message listeners`);
  systemMessageListeners.forEach(callback => {
    try {
      callback(message);
    } catch (err) {
      console.error('Error in system message listener:', err);
    }
  });
}

/**
 * Update connection status and notify listeners
 */
function setConnectionStatus(status: ConnectionStatus) {
  if (connectionStatus !== status) {
    connectionStatus = status;
    
    // Notify connection status listeners
    connectionListeners.forEach(listener => {
      try {
        listener(status);
      } catch (err) {
        console.error('Error in connection status listener:', err);
      }
    });
  }
}

/**
 * Get current connection status
 */
export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

/**
 * Force a manual reconnection attempt
 */
export function reconnect() {
  if (socket) {
    socket.close();
  }
  
  reconnectAttempts = 0;
  initWebSocketConnection();
}

/**
 * Register a callback for system messages
 * Returns a cleanup function to unregister the callback
 */
export function onSystemMessage(callback: SystemMessageHandler): () => void {
  if (!systemMessageListeners.includes(callback)) {
    systemMessageListeners.push(callback);
  }
  
  // Initialize connection if not already connected
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    initWebSocketConnection();
  }
  
  // Return cleanup function
  return () => {
    const index = systemMessageListeners.indexOf(callback);
    if (index !== -1) {
      systemMessageListeners.splice(index, 1);
    }
  };
}

/**
 * Register a callback for simplified connection status changes (connected/reconnecting)
 * Returns a cleanup function to unregister the callback
 */
export function onConnectionStatus(callback: ConnectionStatusHandler): () => void {
  // Prepare initial status
  const isConnected = connectionStatus === 'connected';
  const isReconnecting = connectionStatus === 'connecting';
  
  // Immediately call with current status
  callback(isConnected, isReconnecting);
  
  // Add to listeners
  connectionStatusListeners.push(callback);
  
  // Set up status change listener
  const statusChangeListener = (status: ConnectionStatus) => {
    const isConnected = status === 'connected';
    const isReconnecting = status === 'connecting';
    callback(isConnected, isReconnecting);
  };
  
  // Register with the standard status change system
  const cleanup = onConnectionStatusChange(statusChangeListener);
  
  // Return cleanup function
  return () => {
    cleanup();
    const index = connectionStatusListeners.indexOf(callback);
    if (index !== -1) {
      connectionStatusListeners.splice(index, 1);
    }
  };
}