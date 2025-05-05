/**
 * Data Update Notification Component
 * 
 * This component shows a visual indicator when data is being updated in real-time
 * via WebSocket connections. It provides users with feedback about background
 * data synchronization.
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useConnectionStatus, useDataUpdate } from '@/hooks/use-websocket';
import { type UpdateEntity } from '@/lib/ws/dataSync';

export function DataUpdateNotification() {
  const { isConnected, isReconnecting } = useConnectionStatus();
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);

  // Subscribe to data updates
  useDataUpdate((entity: UpdateEntity) => {
    setLastUpdate(entity);
    
    // Show update indicator temporarily
    setShowUpdateIndicator(true);
    setTimeout(() => {
      setShowUpdateIndicator(false);
    }, 3000); // Hide after 3 seconds
  });

  if (!isConnected && !isReconnecting) {
    return (
      <Badge variant="destructive" className="animate-pulse ml-2">
        Offline
      </Badge>
    );
  }

  if (isReconnecting) {
    return (
      <Badge variant="outline" className="animate-pulse ml-2">
        Reconnecting...
      </Badge>
    );
  }

  if (showUpdateIndicator && lastUpdate) {
    return (
      <Badge variant="secondary" className="ml-2">
        Updated: {lastUpdate}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="ml-2">
      Connected
    </Badge>
  );
}