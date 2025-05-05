/**
 * Real-time Data Update Notification Component
 * 
 * This component displays notifications when data is updated in real-time
 * through WebSockets. It provides a visual indicator and toast notifications
 * when data changes occur on the server.
 */
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  initWebSocketConnection, 
  onSystemMessage, 
  onConnectionStatus,
  onDataUpdate,
  UpdateEntity
} from '@/lib/ws/dataSync';

interface DataUpdateNotificationProps {
  /** Which entity type to listen for updates on */
  entityType?: UpdateEntity;
  /** Whether to show connection status */
  showConnectionStatus?: boolean;
  /** Whether to show toast notifications */
  showToasts?: boolean;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Component that displays a notification when data is updated in real-time
 */
export function DataUpdateNotification({
  entityType = 'all',
  showConnectionStatus = false,
  showToasts = true,
  className = ''
}: DataUpdateNotificationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasUpdate, setHasUpdate] = useState(false);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    initWebSocketConnection();
    
    // Set up connection status handler
    const connectionStatusHandler = (isConnected: boolean, isReconnecting: boolean) => {
      setConnected(isConnected);
      setReconnecting(isReconnecting);
      
      if (isConnected && showToasts) {
        toast({
          title: "Connected to server",
          description: "You'll receive real-time updates for changes",
          variant: "default"
        });
      }
      
      if (!isConnected && showToasts) {
        toast({
          title: "Connection lost",
          description: "Reconnecting to server...",
          variant: "destructive"
        });
      }
    };
    
    // Set up data update handler
    const updateHandler = (entity: UpdateEntity) => {
      console.log(`Data update received for: ${entity}`);
      
      // If we're listening for all updates, or this specific entity
      if (entityType === 'all' || entityType === entity) {
        setHasUpdate(true);
        
        // Auto-refresh the data
        if (entity === 'all') {
          queryClient.invalidateQueries();
        } else {
          // Map entity types to their respective API endpoints
          const endpoint = getEndpointFromEntity(entity);
          if (endpoint) {
            queryClient.invalidateQueries({ queryKey: [endpoint] });
          }
        }
        
        // Show toast notification if enabled
        if (showToasts) {
          toast({
            title: "Data Updated",
            description: `New ${entity === 'all' ? 'data' : entity} is available`,
            variant: "default",
            action: (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleRefresh()}
              >
                Refresh
              </Button>
            )
          });
        }
      }
    };
    
    // Set up system message handler
    const messageHandler = (message: string) => {
      if (showToasts) {
        toast({
          title: "System Message",
          description: message,
          variant: "default"
        });
      }
    };
    
    // Register handlers
    const cleanupDataUpdate = onDataUpdate(updateHandler);
    const cleanupConnectionStatus = onConnectionStatus(connectionStatusHandler);
    const cleanupSystemMessage = onSystemMessage(messageHandler);
    
    return () => {
      cleanupDataUpdate();
      cleanupConnectionStatus();
      cleanupSystemMessage();
      // Don't close the connection on unmount as it might be used by other components
    };
  }, [entityType, showToasts, queryClient, toast]);
  
  const handleRefresh = useCallback(() => {
    // Invalidate relevant queries
    if (entityType === 'all') {
      queryClient.invalidateQueries();
    } else {
      const endpoint = getEndpointFromEntity(entityType);
      if (endpoint) {
        queryClient.invalidateQueries({ queryKey: [endpoint] });
      }
    }
    
    // Reset update flag
    setHasUpdate(false);
    
    // Show toast notification
    if (showToasts) {
      toast({
        title: "Data Refreshed",
        description: "You now have the most recent data",
        variant: "default"
      });
    }
  }, [entityType, queryClient, toast, showToasts]);
  
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
  
  // If nothing to show, return null
  if (!hasUpdate && !showConnectionStatus) {
    return null;
  }
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showConnectionStatus && (
        <Badge 
          variant={connected ? "outline" : "destructive"} 
          className={`text-xs ${connected ? 'bg-green-50' : ''} ${reconnecting ? 'animate-pulse' : ''}`}
        >
          {connected ? (
            <>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3 mr-1" />
              {reconnecting ? 'Reconnecting...' : 'Disconnected'}
            </>
          )}
        </Badge>
      )}
      
      {hasUpdate && (
        <Badge 
          variant="outline" 
          className="text-xs bg-yellow-50 animate-pulse"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Updates Available
        </Badge>
      )}
      
      {hasUpdate && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="text-xs h-7 flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      )}
    </div>
  );
}

/**
 * Simple refresh control for quick data refreshes
 */
export function DataRefreshControl() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleRefresh = useCallback(() => {
    setIsUpdating(true);
    
    // Force all queries to refetch
    queryClient.invalidateQueries();
    
    setTimeout(() => {
      setIsUpdating(false);
      toast({
        title: "Data Refreshed",
        description: "You now have the most recent data",
        variant: "default"
      });
    }, 500);
  }, [queryClient, toast]);
  
  return (
    <div className="inline-flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        className={`p-0 h-7 w-7 rounded-full ${isUpdating ? 'animate-spin' : ''}`}
        aria-label="Refresh data"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
      {isUpdating && (
        <span className="text-xs text-muted-foreground">Updating...</span>
      )}
    </div>
  );
}