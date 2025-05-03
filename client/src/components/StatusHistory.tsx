import { 
  Timeline, 
  TimelineItem, 
  TimelineConnector, 
  TimelineContent, 
  TimelineDot, 
  TimelineOppositeContent, 
  TimelineSeparator 
} from "@/components/ui/timeline";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { format, formatDistance } from "date-fns";
import StatusBadge from "@/components/StatusBadge";
import { FileClockIcon, InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStatusHistory } from "@/hooks/use-status";

interface StatusHistoryProps {
  entityType: string;
  entityId: number;
  eventId: number;
  maxHeight?: string;
}

export default function StatusHistory({
  entityType,
  entityId,
  eventId,
  maxHeight = "300px"
}: StatusHistoryProps) {
  const { statuses, isLoading, error } = useStatusHistory(entityType, entityId, eventId);
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <FileClockIcon className="text-muted-foreground h-5 w-5" />
            <p className="text-sm text-muted-foreground">Loading status history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <InfoIcon className="text-red-500 h-5 w-5" />
            <p className="text-sm text-red-500">Failed to load status history</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!statuses || statuses.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <FileClockIcon className="text-muted-foreground h-5 w-5" />
            <p className="text-sm text-muted-foreground">No status history available</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-2 mb-3">
          <FileClockIcon className="text-muted-foreground h-5 w-5" />
          <h3 className="text-sm font-medium">Status History</h3>
        </div>
        <Separator className="mb-3" />
        <ScrollArea className={`pr-4 ${maxHeight ? `max-h-[${maxHeight}]` : ''}`}>
          <Timeline position="right">
            {statuses.map((status, index) => (
              <TimelineItem key={status.id}>
                <TimelineOppositeContent className="min-w-[120px] text-xs text-muted-foreground">
                  <div>
                    {format(new Date(status.statusDate), "MMM d, yyyy")}
                  </div>
                  <div>
                    {format(new Date(status.statusDate), "h:mm a")}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-[10px] cursor-help underline decoration-dotted underline-offset-2">
                          {formatDistance(new Date(status.statusDate), new Date(), { addSuffix: true })}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">
                          {format(new Date(status.statusDate), "PPpp")}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TimelineOppositeContent>
                
                <TimelineSeparator>
                  <TimelineDot />
                  {index < statuses.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                
                <TimelineContent className="py-1">
                  <div className="flex flex-col gap-1">
                    <StatusBadge 
                      status={status.primaryStatus} 
                      entityType={status.entityType}
                      size="sm"
                      showTooltip={false}
                    />
                    
                    {status.metadata && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {typeof status.metadata === 'object' 
                          ? Object.entries(status.metadata).map(([key, value]) => (
                              <div key={key} className="flex items-start">
                                <span className="font-medium mr-1">{key}:</span> 
                                <span>{String(value)}</span>
                              </div>
                            ))
                          : status.metadata}
                      </div>
                    )}
                  </div>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}