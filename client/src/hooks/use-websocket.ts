/**
 * WebSocket Hooks
 * 
 * This file provides React hooks for WebSocket functionality
 * to make it easier to use WebSockets in functional components.
 */
import { useEffect, useState } from 'react';
import { 
  onDataUpdate, 
  onConnectionStatus, 
  onSystemMessage,
  getConnectionStatus,
  reconnect,
  type ConnectionStatus,
  type UpdateEntity
} from '@/lib/ws/dataSync';

/**
 * Hook to subscribe to real-time data updates via WebSocket
 * 
 * @param callback Function to call when data updates are received
 * @param entityFilter Optional array of entity types to filter by
 * @returns void
 */
export function useDataUpdate(
  callback: (entity: UpdateEntity) => void,
  entityFilter?: UpdateEntity[]
) {
  useEffect(() => {
    // Create a wrapped callback that filters by entity type if needed
    const wrappedCallback = (entity: UpdateEntity) => {
      // If no filter is provided, or the entity is 'all', or the entity is in the filter list, call the callback
      if (!entityFilter || entity === 'all' || entityFilter.includes(entity)) {
        callback(entity);
      }
    };

    // Register callback and get cleanup function
    const cleanup = onDataUpdate(wrappedCallback);
    
    // Return cleanup function to unregister when component unmounts
    return cleanup;
  }, [callback, entityFilter]);
}

/**
 * Hook to get and subscribe to WebSocket connection status
 * 
 * @returns Object with connection status information and reconnect function
 */
export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  useEffect(() => {
    // Register connection status callback
    const cleanup = onConnectionStatus((connected, reconnecting) => {
      setIsConnected(connected);
      setIsReconnecting(reconnecting);
    });
    
    // Return cleanup function
    return cleanup;
  }, []);
  
  return {
    isConnected,
    isReconnecting,
    reconnect: () => reconnect()
  };
}

/**
 * Hook to subscribe to system messages via WebSocket
 * 
 * @param callback Function to call when system messages are received
 * @returns void
 */
export function useSystemMessage(callback: (message: string) => void) {
  useEffect(() => {
    // Register callback and get cleanup function
    const cleanup = onSystemMessage(callback);
    // Return cleanup function to unregister when component unmounts
    return cleanup;
  }, [callback]);
}