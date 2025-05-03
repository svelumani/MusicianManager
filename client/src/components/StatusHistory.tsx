import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Info, AlertTriangle } from "lucide-react";
import { useEntityStatusConfig } from "@/hooks/use-status";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent
} from "@/components/ui/timeline";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatusHistoryProps {
  entityType: string;
  entityId: number;
  eventId?: number;
  maxItems?: number;
}

export default function StatusHistory({ 
  entityType, 
  entityId, 
  eventId, 
  maxItems = 10 
}: StatusHistoryProps) {
  const { data: statusConfig } = useEntityStatusConfig(entityType);
  const [expandHistory, setExpandHistory] = useState(false);

  // Fetch status history
  const { data: statusHistory, isLoading, error } = useQuery({
    queryKey: ["/api/status/history", entityType, entityId, eventId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('entityType', entityType);
      params.append('entityId', entityId.toString());
      
      if (eventId) {
        params.append('eventId', eventId.toString());
      }
      
      const response = await fetch(`/api/status/history?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch status history");
      }
      return response.json();
    },
    staleTime: 60000 // Cache for 1 minute
  });

  const getColorForStatus = (status: string) => {
    if (!statusConfig) return "default";
    
    const statusInfo = statusConfig.statuses.find(s => s.value === status);
    if (!statusInfo) return "default";
    
    switch (statusInfo.colorType) {
      case "success": return "success";
      case "warning": return "warning";
      case "error": return "error";
      case "info": return "info";
      case "primary": return "primary";
      case "secondary": return "secondary";
      default: return "default";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status History</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !statusHistory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
          <h3 className="font-medium">Could Not Load History</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {error instanceof Error ? error.message : "An error occurred while loading status history."}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (statusHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6 text-center">
          <Info className="h-8 w-8 text-blue-500 mb-2" />
          <h3 className="font-medium">No Status History</h3>
          <p className="text-muted-foreground text-sm mt-1">
            There is no status history available for this {entityType}.
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayHistory = expandHistory 
    ? statusHistory 
    : statusHistory.slice(0, maxItems);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Status History</CardTitle>
      </CardHeader>
      <CardContent>
        <Timeline position="alternate">
          {displayHistory.map((entry, index) => (
            <TimelineItem key={`${entry.id}-${index}`}>
              <TimelineOppositeContent className="text-xs text-muted-foreground">
                {format(new Date(entry.timestamp), "MMM d, yyyy - h:mm a")}
              </TimelineOppositeContent>
              
              <TimelineSeparator>
                <TimelineDot 
                  color={getColorForStatus(entry.status)} 
                  variant={index === 0 ? "filled" : "outlined"}
                  size={index === 0 ? "large" : "medium"}
                />
                {index < displayHistory.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              
              <TimelineContent className="py-1">
                <div className="text-sm font-medium mb-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`
                            ${index === 0 ? 'border-2' : 'border'}
                            ${statusConfig?.getColorClass?.(entry.status) || ''}
                          `}
                        >
                          {entry.statusLabel || entry.status}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {statusConfig?.getDescription?.(entry.status) || "Status update"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {entry.details && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {entry.details}
                  </div>
                )}
                
                {entry.userName && (
                  <div className="text-xs text-muted-foreground mt-1">
                    By: {entry.userName}
                  </div>
                )}
                
                {/* Display signature information for contract-signed status */}
                {entry.status === 'contract-signed' && entry.metadata && (
                  <div className="text-xs mt-2 p-2 bg-muted/30 rounded-sm space-y-1">
                    {entry.metadata.signatureValue && (
                      <div className="font-medium">
                        Signature: <span className="italic">{entry.metadata.signatureValue}</span>
                      </div>
                    )}
                    {entry.metadata.signedAt && (
                      <div className="text-muted-foreground">
                        Signed: {format(new Date(entry.metadata.signedAt), "MMM d, yyyy h:mm a")}
                      </div>
                    )}
                    {entry.metadata.ipAddress && (
                      <div className="text-muted-foreground">
                        IP: {entry.metadata.ipAddress}
                      </div>
                    )}
                  </div>
                )}
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
        
        {statusHistory.length > maxItems && (
          <div className="text-center mt-4">
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => setExpandHistory(!expandHistory)}
            >
              {expandHistory ? "Show less" : `Show ${statusHistory.length - maxItems} more entries`}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}