/**
 * Data Update Notification Component
 * 
 * This component shows a visual indicator when data is being updated in real-time
 * via WebSocket connections. It provides users with feedback about background
 * data synchronization.
 * 
 * Now enhanced to show version information from the server.
 */
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { useConnectionStatus, useDataUpdate } from '@/hooks/use-websocket';
import { type UpdateEntity } from '@/lib/ws/dataSync';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { RefreshCw, Calendar } from 'lucide-react';

interface DataVersion {
  planner_data?: number;
  monthly_data?: number;
  monthly_contracts?: number;
  monthly_planners?: number;
  planner_slots?: number;
  planner_assignments?: number;
  [key: string]: number | undefined;
}

export function DataUpdateNotification() {
  const { isConnected, isReconnecting } = useConnectionStatus();
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  const [versions, setVersions] = useState<DataVersion>({});
  const [lastVersionCheck, setLastVersionCheck] = useState<Date | null>(null);

  // Fetch versions from the server
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const response = await fetch('/api/versions', {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setVersions(data);
          setLastVersionCheck(new Date());
        }
      } catch (error) {
        console.error("Failed to fetch versions:", error);
      }
    };
    
    // Fetch versions immediately
    fetchVersions();
    
    // Set up periodic version checking
    const interval = setInterval(fetchVersions, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);

  // Subscribe to data updates
  useDataUpdate((entity: UpdateEntity) => {
    setLastUpdate(entity);
    
    // Show update indicator temporarily
    setShowUpdateIndicator(true);
    setTimeout(() => {
      setShowUpdateIndicator(false);
    }, 3000); // Hide after 3 seconds
    
    // Refresh versions when data is updated
    fetchVersions();
  });
  
  // Function to fetch versions
  const fetchVersions = async () => {
    try {
      const response = await fetch('/api/versions', {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
        setLastVersionCheck(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch versions:", error);
    }
  };
  
  // Get version info for tooltip
  const getVersionInfo = () => {
    return (
      <div className="text-xs space-y-1">
        <div className="font-bold">Current Data Versions:</div>
        <div>Planner Data: v{versions.planner_data || '?'}</div>
        <div>Planner Slots: v{versions.planner_slots || '?'}</div>
        <div>Planner Assignments: v{versions.planner_assignments || '?'}</div>
        <div>Monthly Planners: v{versions.monthly_planners || '?'}</div>
        <div>Monthly Contracts: v{versions.monthly_contracts || '?'}</div>
        {lastVersionCheck && (
          <div className="pt-1 text-gray-500">
            Last check: {lastVersionCheck.toLocaleTimeString()}
          </div>
        )}
      </div>
    );
  };

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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="ml-2 flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Updated: {lastUpdate}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {getVersionInfo()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="ml-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Connected v{versions.planner_data || '?'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {getVersionInfo()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}