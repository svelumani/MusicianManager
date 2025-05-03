import React from "react";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import { useEntityStatusConfig } from "@/hooks/use-status";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatusBadgeProps {
  status: string;
  entityType?: string;
  timestamp?: string | Date;
  className?: string;
}

export default function StatusBadge({ 
  status, 
  entityType = "default", 
  timestamp, 
  className = ""
}: StatusBadgeProps) {
  const { data: statusConfig } = useEntityStatusConfig(entityType);
  
  // Format the timestamp
  let formattedTime = "";
  let relativeTime = "";
  
  if (timestamp) {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    formattedTime = format(date, "MMM d, yyyy, h:mm a");
    relativeTime = formatDistanceToNow(date, { addSuffix: true });
  }
  
  // Find the status configuration
  const statusInfo = statusConfig?.statuses.find(s => s.value === status);
  const colorClass = statusInfo?.colorClass || "";
  const label = statusInfo?.label || status;
  const description = statusInfo?.description || "";
  
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
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}