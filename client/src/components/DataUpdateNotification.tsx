/**
 * Real-time Data Update Notification Component
 * 
 * This component displays notifications when data is updated in real-time
 * through WebSockets. It provides a visual indicator and toast notifications
 * when data changes occur on the server.
 */
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Check, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { onSystemMessage, UpdateEntity } from '@/lib/ws/dataSync';
import { queryClient } from '@/lib/queryClient';

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

// Map entity types to human-readable names
const entityLabels: Record<UpdateEntity, string> = {
  planners: 'Monthly Calendar',
  plannerSlots: 'Calendar Events',
  plannerAssignments: 'Musician Assignments',
  musicians: 'Musicians',
  venues: 'Venues',
  categories: 'Categories',
  musicianPayRates: 'Pay Rates',
  eventCategories: 'Event Types',
  availability: 'Musician Availability',
  monthlyContracts: 'Monthly Contracts',
  all: 'All Data'
};

export function DataUpdateNotification({
  entityType = 'all',
  showConnectionStatus = true,
  showToasts = true,
  className
}: DataUpdateNotificationProps) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  // Check connection status
  useEffect(() => {
    const checkConnection = () => {
      // This is a rough approximation - in a real app, you'd use the actual WebSocket state
      setIsConnected(navigator.onLine);
    };

    // Check immediately
    checkConnection();

    // Add event listeners for connection status
    window.addEventListener('online', () => setIsConnected(true));
    window.addEventListener('offline', () => setIsConnected(false));

    // Regularly check connection
    const interval = setInterval(checkConnection, 10000);

    return () => {
      window.removeEventListener('online', () => setIsConnected(true));
      window.removeEventListener('offline', () => setIsConnected(false));
      clearInterval(interval);
    };
  }, []);

  // Listen for system messages
  useEffect(() => {
    const unsubscribe = onSystemMessage((message) => {
      if (showToasts) {
        toast({
          title: 'System Message',
          description: message,
          duration: 5000,
        });
      }
    });

    return unsubscribe;
  }, [showToasts, toast]);

  // Listen for data updates by updating the component when query cache is updated
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      setLastUpdate(new Date());
    });

    return unsubscribe;
  }, []);

  // Function to manually refresh data
  const refreshData = async () => {
    setIsUpdating(true);
    try {
      // Determine which queries to invalidate based on entityType
      if (entityType === 'all') {
        await queryClient.invalidateQueries();
      } else {
        // Construct the appropriate query key based on the entity type
        const queryKey = [`/api/${getEndpointFromEntity(entityType)}`];
        await queryClient.invalidateQueries({ queryKey });
      }
      setLastUpdate(new Date());
      
      if (showToasts) {
        toast({
          title: 'Data Refreshed',
          description: `${entityLabels[entityType]} data has been updated.`,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      if (showToasts) {
        toast({
          variant: 'destructive',
          title: 'Refresh Failed',
          description: 'Could not refresh data. Please try again.',
          duration: 5000,
        });
      }
    } finally {
      setIsUpdating(false);
    }
  };

  function getEndpointFromEntity(entity: UpdateEntity): string {
    // Convert entity type to API endpoint
    switch (entity) {
      case 'planners': return 'planners';
      case 'plannerSlots': return 'planner-slots';
      case 'plannerAssignments': return 'planner-assignments';
      case 'musicians': return 'musicians';
      case 'venues': return 'venues';
      case 'categories': return 'categories';
      case 'musicianPayRates': return 'musician-pay-rates';
      case 'eventCategories': return 'event-categories';
      case 'availability': return 'availability';
      case 'monthlyContracts': return 'monthly-contracts';
      default: return 'all-data';
    }
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {showConnectionStatus && (
        <Badge 
          variant={isConnected ? 'secondary' : 'destructive'}
          className="flex items-center gap-1"
        >
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              <span className="text-xs">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              <span className="text-xs">Offline</span>
            </>
          )}
        </Badge>
      )}

      {lastUpdate && (
        <Badge variant="outline" className="text-xs">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </Badge>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={refreshData}
        disabled={isUpdating || !isConnected}
        className={cn(
          "gap-1 h-8 px-2 transition-all duration-200",
          isUpdating && "opacity-70"
        )}
      >
        {isUpdating ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Refreshing...</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh {entityLabels[entityType]}</span>
          </>
        )}
      </Button>
    </div>
  );
}

// More comprehensive component that shows updates for all entity types
export function DataRefreshControl() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Alert className="mb-4 bg-white shadow border-blue-100">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-blue-500" />
          <AlertTitle>Real-time Data Updates</AlertTitle>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-7 px-2"
        >
          {isExpanded ? "Show Less" : "Show More"}
        </Button>
      </div>
      
      <AlertDescription className="mt-2">
        <p className="text-sm text-muted-foreground mb-2">
          Data updates automatically in real-time. You can also manually refresh specific data below.
        </p>
        
        <DataUpdateNotification 
          entityType="all" 
          className="mb-2" 
        />
        
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
            <DataUpdateNotification 
              entityType="planners" 
              showConnectionStatus={false} 
            />
            <DataUpdateNotification 
              entityType="plannerSlots" 
              showConnectionStatus={false} 
            />
            <DataUpdateNotification 
              entityType="plannerAssignments" 
              showConnectionStatus={false} 
            />
            <DataUpdateNotification 
              entityType="musicians" 
              showConnectionStatus={false} 
            />
            <DataUpdateNotification 
              entityType="venues" 
              showConnectionStatus={false} 
            />
            <DataUpdateNotification 
              entityType="categories" 
              showConnectionStatus={false} 
            />
            <DataUpdateNotification 
              entityType="musicianPayRates" 
              showConnectionStatus={false} 
            />
            <DataUpdateNotification 
              entityType="eventCategories" 
              showConnectionStatus={false} 
            />
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}