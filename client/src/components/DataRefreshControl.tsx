/**
 * DataRefreshControl Component
 * 
 * This component provides a visual indicator of data freshness
 * and a button to manually refresh data.
 */
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { VersionedEntity, forceRefreshEntity } from '@/lib/utils/versionTracker';

interface DataRefreshControlProps {
  /**
   * The entities to refresh when the refresh button is clicked
   */
  entities: VersionedEntity[];
  
  /**
   * Optional callback function to run after refresh
   */
  onRefresh?: () => void;
  
  /**
   * The size of the refresh button
   */
  size?: 'sm' | 'default' | 'lg' | 'icon';
  
  /**
   * Whether to display the refresh button as an icon only
   */
  iconOnly?: boolean;
  
  /**
   * A label to display next to the refresh button
   */
  label?: string;
  
  /**
   * Variant for the refresh button
   */
  variant?: 'default' | 'outline' | 'ghost';
  
  /**
   * Time in milliseconds after which data is considered stale
   */
  staleTime?: number;
}

export default function DataRefreshControl({
  entities,
  onRefresh,
  size = 'default',
  iconOnly = false,
  label = 'Refresh',
  variant = 'outline',
  staleTime = 60000 // Default to 1 minute
}: DataRefreshControlProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);
  
  // Check for staleness periodically
  useEffect(() => {
    if (!lastRefreshed) {
      setLastRefreshed(new Date());
      return;
    }
    
    const checkStaleness = () => {
      const now = new Date();
      const timeSinceRefresh = now.getTime() - lastRefreshed.getTime();
      setIsStale(timeSinceRefresh > staleTime);
    };
    
    // Check immediately
    checkStaleness();
    
    // Then check every 10 seconds
    const interval = setInterval(checkStaleness, 10000);
    
    return () => clearInterval(interval);
  }, [lastRefreshed, staleTime]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Force refresh for each entity
      entities.forEach(entity => {
        forceRefreshEntity(entity);
      });
      
      // Invalidate related queries
      const entityPrefixes = entities.map(entity => `${entity}:`);
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const queryKeyString = String(query.queryKey[0]);
          return entityPrefixes.some(prefix => queryKeyString.startsWith(prefix));
        }
      });
      
      // Wait a moment for visual feedback
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Update last refreshed time
      setLastRefreshed(new Date());
      setIsStale(false);
      
      // Call the onRefresh callback if provided
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Size to Lucide icon size mapping
  const iconSize = size === 'sm' ? 14 : size === 'icon' ? 16 : 20;
  
  // Button sizing class
  const buttonSizeClass = size === 'sm' 
    ? 'h-8 text-xs' 
    : size === 'default' 
      ? 'h-9 text-sm' 
      : 'h-10 text-base';
  
  // Time since last refresh
  const getTimeSinceRefresh = () => {
    if (!lastRefreshed) return 'Never refreshed';
    
    const seconds = Math.floor((new Date().getTime() - lastRefreshed.getTime()) / 1000);
    
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`flex items-center justify-center group ${buttonSizeClass} ${isStale ? 'border-amber-500' : ''}`}
          >
            {isRefreshing ? (
              <RefreshCw className={`h-${iconSize} w-${iconSize} animate-spin`} />
            ) : (
              <RefreshCw className={`h-${iconSize} w-${iconSize} ${isStale ? 'text-amber-500' : 'group-hover:rotate-90 transition-transform duration-300'}`} />
            )}
            
            {!iconOnly && (
              <span className="ml-2">
                {isRefreshing ? 'Refreshing...' : label}
              </span>
            )}
            
            {isStale && !iconOnly && (
              <AlertTriangle className="ml-1 h-3 w-3 text-amber-500" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex flex-col space-y-1">
            <div className="flex items-center">
              <span className="font-semibold">Last refreshed:</span>
              <span className="ml-1">{getTimeSinceRefresh()}</span>
              {!isStale && <Check className="ml-1 h-3 w-3 text-green-500" />}
              {isStale && <AlertTriangle className="ml-1 h-3 w-3 text-amber-500" />}
            </div>
            <div className="text-xs text-gray-500">
              Click to refresh {entities.join(', ')} data
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}