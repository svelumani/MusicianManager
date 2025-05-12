import React from "react";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { 
  useEntityStatus, 
  useEntityStatusConfig, 
  useUpdateEntityStatus 
} from "@/hooks/use-status";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

interface StatusBadgeProps {
  status?: string;
  entityType?: string;
  entityId?: number;
  eventId?: number;
  musicianId?: number;
  eventDate?: string;
  timestamp?: string | Date;
  className?: string;
  useCentralizedSystem?: boolean;
}

/**
 * Enhanced StatusBadge that can either use a direct status value or fetch from the centralized system
 * 
 * When entityId is provided along with entityType, the component will fetch status from the 
 * centralized status system. Otherwise, it uses the directly provided status.
 */
export default function StatusBadge({ 
  status, 
  entityType = "default", 
  entityId,
  eventId,
  musicianId,
  eventDate,
  timestamp, 
  className = "",
  useCentralizedSystem = true
}: StatusBadgeProps) {
  // IMPORTANT: All hooks must be called at the top level, before any conditionals
  // If entityId is provided, try to use the centralized system
  const shouldUseCentralized = useCentralizedSystem && !!entityId;
  
  // Get status from centralized system 
  const { 
    data: entityStatus, 
    isLoading, 
    error 
  } = useEntityStatus(
    entityType, 
    entityId || 0, 
    eventId,
    musicianId,
    eventDate
  );

  // Get status config for styling
  const { data: statusConfig } = useEntityStatusConfig(entityType);
  
  // Hook for updating status (used in auto-sync)
  const updateStatus = useUpdateEntityStatus();

  // Helper functions for status formatting
  const getStatusLabel = React.useCallback((statusValue: string) => {
    if (!statusConfig) return statusValue;
    const config = statusConfig.statuses.find((s: any) => s.value === statusValue);
    return config?.label || statusValue;
  }, [statusConfig]);
  
  const getStatusColorClass = React.useCallback((statusValue: string) => {
    if (!statusConfig) return 'bg-gray-100 text-gray-500';
    const config = statusConfig.statuses.find((s: any) => s.value === statusValue);
    return config?.colorClass || 'bg-gray-100 text-gray-500';
  }, [statusConfig]);
  
  // Flag to prevent repeated sync attempts - define it outside the effect
  const syncAttemptFlag = React.useRef(false);
  
  // Auto-sync legacy status if needed - only once when needed
  React.useEffect(() => {
    // Only auto-sync if we have a direct status from props but centralized system has none
    // Only do this once per component instance
    const shouldAutoSync = shouldUseCentralized && 
                          status && 
                          (error || (entityStatus === undefined)) && 
                          entityType === 'contract' && 
                          !!entityId && 
                          !!eventId;
    
    if (shouldAutoSync && !syncAttemptFlag.current) {
      // Mark that we've attempted a sync
      syncAttemptFlag.current = true;
      
      console.log(`Auto-syncing status for ${entityType} #${entityId}: ${status}`);
      updateStatus.mutate({
        entityType,
        entityId,
        status: status,
        eventId,
        musicianId,
        eventDate: eventDate?.toString(),
        details: 'Auto-synced from legacy system',
        metadata: {
          autoSynced: true,
          source: 'legacy',
          syncedAt: new Date().toISOString()
        }
      });
    }
  // Run this effect ONCE on mount, not on every status update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Determine which status value to use
  const effectiveStatus = shouldUseCentralized && entityStatus?.status 
    ? entityStatus.status // Use status from centralized system if available 
    : status; // Otherwise use the directly provided status

  // Timestamp will be from entity status or from props
  const effectiveTimestamp = shouldUseCentralized && entityStatus?.updatedAt
    ? entityStatus.updatedAt
    : timestamp;

  // Format the timestamp if we have one
  let formattedTime = "";
  let relativeTime = "";
  
  if (effectiveTimestamp) {
    try {
      const date = typeof effectiveTimestamp === 'string' 
        ? new Date(effectiveTimestamp) 
        : effectiveTimestamp;
      
      formattedTime = format(date, "MMM d, yyyy, h:mm a");
      relativeTime = formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      console.error("Error formatting date:", e);
    }
  }
  
  // Render loading state
  if (shouldUseCentralized && isLoading) {
    return (
      <Badge variant="outline" className={`bg-gray-100 text-gray-500 ${className}`}>
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        <span>Loading...</span>
      </Badge>
    );
  }
  
  // Render unknown state if no status is available
  if (!effectiveStatus) {
    return (
      <Badge variant="outline" className={`bg-gray-100 text-gray-500 ${className}`}>
        Unknown
      </Badge>
    );
  }
  
  // Calculate badge properties 
  const colorClass = getStatusColorClass(effectiveStatus);
  const label = getStatusLabel(effectiveStatus);
  
  // Get description from config
  const statusInfo = statusConfig?.statuses.find((s: { value: string }) => s.value === effectiveStatus);
  const description = statusInfo?.description || "";
  
  // Show info about data source in the tooltip if using centralized system
  const dataSourceInfo = shouldUseCentralized && entityStatus
    ? `Data source: ${entityStatus.source === 'centralized' ? 'Centralized Status System' : 'Legacy System'}`
    : '';
  
  // Render the badge with tooltip
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${colorClass} ${className}`}
          >
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p>{description}</p>
            {formattedTime && (
              <p className="text-xs opacity-75">
                Updated {relativeTime} ({formattedTime})
              </p>
            )}
            {dataSourceInfo && (
              <p className="text-xs opacity-75 italic">
                {dataSourceInfo}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}