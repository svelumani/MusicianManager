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
  // If entityId is provided, try to use the centralized system
  const shouldUseCentralized = useCentralizedSystem && !!entityId;
  
  // If using centralized system, fetch the status
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

  // Determine which status value to use
  const effectiveStatus = shouldUseCentralized 
    ? entityStatus?.status // Use status from centralized system if available 
    : status; // Otherwise use the directly provided status

  // Timestamp will be from entity status or from props
  const effectiveTimestamp = shouldUseCentralized && entityStatus?.updatedAt
    ? entityStatus.updatedAt
    : timestamp;

  // Get status config for display - IMPORTANT: keep all hooks at the top level before any conditionals
  const { data: statusConfig } = useEntityStatusConfig(entityType);
  const updateStatus = useUpdateEntityStatus();
  
  // Format the timestamp
  let formattedTime = "";
  let relativeTime = "";
  
  if (effectiveTimestamp) {
    const date = typeof effectiveTimestamp === 'string' 
      ? new Date(effectiveTimestamp) 
      : effectiveTimestamp;
    
    formattedTime = format(date, "MMM d, yyyy, h:mm a");
    relativeTime = formatDistanceToNow(date, { addSuffix: true });
  }
  
  // If loading status from centralized system, show loading indicator
  if (shouldUseCentralized && isLoading) {
    return (
      <Badge variant="outline" className={`bg-gray-100 text-gray-500 ${className}`}>
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        <span>Loading...</span>
      </Badge>
    );
  }
  
  // Helper functions for status formatting - defined outside of conditional
  const getStatusLabel = (statusValue: string, entityType: string) => {
    const config = statusConfig?.statuses.find((s: any) => s.value === statusValue);
    return config?.label || statusValue;
  };
  
  const getStatusColorClass = (statusValue: string, entityType: string) => {
    const config = statusConfig?.statuses.find((s: any) => s.value === statusValue);
    return config?.colorClass || 'bg-gray-100 text-gray-500';
  };
  
  // Handle missing status in centralized system for contracts by auto-syncing
  
  // If there was an error or no status is available but we have a direct status value
  if ((shouldUseCentralized && error) || !effectiveStatus) {
    // If we have a direct status value from props, we can try to sync it with the centralized system
    if (status && entityType === 'contract' && entityId && eventId) {
      console.log(`Auto-syncing status for ${entityType} #${entityId}: ${status}`);
      
      // Queue a background update of the status
      setTimeout(() => {
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
      }, 100);
      
      // For now, use the direct value
      return (
        <Badge 
          variant="outline" 
          className={`${getStatusColorClass(status, entityType)} ${className}`}
          title="Using direct status (auto-syncing with centralized system)"
        >
          {getStatusLabel(status, entityType)}
        </Badge>
      );
    }
    
    // Otherwise, show Unknown
    return (
      <Badge variant="outline" className={`bg-gray-100 text-gray-500 ${className}`}>
        Unknown
      </Badge>
    );
  }
  
  // Find the status configuration
  const statusInfo = statusConfig?.statuses.find((s: { value: string }) => s.value === effectiveStatus);
  const colorClass = statusInfo?.colorClass || "";
  const label = statusInfo?.label || effectiveStatus;
  const description = statusInfo?.description || "";
  
  // Show info about data source in the tooltip if using centralized system
  const dataSourceInfo = shouldUseCentralized && entityStatus
    ? `Data source: ${entityStatus.source === 'centralized' ? 'Centralized Status System' : 'Legacy System'}`
    : '';
  
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