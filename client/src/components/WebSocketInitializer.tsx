/**
 * WebSocket Initializer Component
 * 
 * This component initializes the WebSocket connection when the application loads,
 * but only after authentication is successful.
 * It doesn't render anything visible but ensures the connection is established
 * after the user is authenticated.
 */
import { useEffect } from 'react';
import { initWebSocketConnection } from '@/lib/ws/dataSync';
import { useAuth } from '@/lib/auth';

export function WebSocketInitializer() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Only initialize the WebSocket connection when the user is authenticated
    if (user && !isLoading) {
      console.log('[WebSocket] User authenticated, initializing connection from WebSocketInitializer');
      initWebSocketConnection();
    } else if (!user && !isLoading) {
      console.log('[WebSocket] No authenticated user, skipping WebSocket initialization');
    }

    // Return cleanup function
    return () => {
      // The WebSocket connection will be closed automatically when the page unloads
      console.log('[WebSocket] WebSocketInitializer unmounting');
    };
  }, [user, isLoading]);

  // This component doesn't render anything visible
  return null;
}