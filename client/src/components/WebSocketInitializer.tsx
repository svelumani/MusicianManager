/**
 * WebSocket Initializer Component
 * 
 * This component initializes the WebSocket connection when the application loads.
 * It doesn't render anything visible but ensures the connection is established
 * early in the application lifecycle.
 */
import { useEffect } from 'react';
import { initWebSocketConnection } from '@/lib/ws/dataSync';

export function WebSocketInitializer() {
  useEffect(() => {
    // Initialize the WebSocket connection when the component mounts
    console.log('[WebSocket] Initializing connection from WebSocketInitializer');
    initWebSocketConnection();

    // Return cleanup function
    return () => {
      // The WebSocket connection will be closed automatically when the page unloads
      console.log('[WebSocket] WebSocketInitializer unmounting');
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}