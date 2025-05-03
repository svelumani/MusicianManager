import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

// Status configuration for different entity types
const statusConfig: Record<string, Record<string, { color: string; label: string; description: string }>> = {
  contract: {
    pending: { 
      color: "bg-yellow-100 text-yellow-800", 
      label: "Pending", 
      description: "Contract is created but not yet sent to musician" 
    },
    accepted: { 
      color: "bg-green-100 text-green-800", 
      label: "Accepted", 
      description: "Contract has been accepted by the musician" 
    },
    rejected: { 
      color: "bg-red-100 text-red-800", 
      label: "Rejected", 
      description: "Contract has been rejected by the musician" 
    },
    expired: { 
      color: "bg-gray-100 text-gray-800", 
      label: "Expired", 
      description: "Contract link has expired" 
    },
    cancelled: { 
      color: "bg-red-100 text-red-800", 
      label: "Cancelled", 
      description: "Contract has been cancelled" 
    },
    "contract-sent": { 
      color: "bg-blue-100 text-blue-800", 
      label: "Contract Sent", 
      description: "Contract has been sent to musician, awaiting response" 
    },
    "contract-signed": { 
      color: "bg-green-100 text-green-800", 
      label: "Contract Signed", 
      description: "Musician has signed the contract" 
    }
  },
  invitation: {
    pending: { 
      color: "bg-yellow-100 text-yellow-800", 
      label: "Pending", 
      description: "Invitation is created but not yet sent" 
    },
    sent: { 
      color: "bg-blue-100 text-blue-800", 
      label: "Sent", 
      description: "Invitation has been sent to musician" 
    },
    viewed: { 
      color: "bg-purple-100 text-purple-800", 
      label: "Viewed", 
      description: "Musician has viewed the invitation" 
    },
    accepted: { 
      color: "bg-green-100 text-green-800", 
      label: "Accepted", 
      description: "Musician has accepted the invitation" 
    },
    rejected: { 
      color: "bg-red-100 text-red-800", 
      label: "Rejected", 
      description: "Musician has rejected the invitation" 
    },
    expired: { 
      color: "bg-gray-100 text-gray-800", 
      label: "Expired", 
      description: "Invitation has expired" 
    },
    cancelled: { 
      color: "bg-red-100 text-red-800", 
      label: "Cancelled", 
      description: "Invitation has been cancelled" 
    }
  },
  event: {
    draft: { 
      color: "bg-gray-100 text-gray-800", 
      label: "Draft", 
      description: "Event is in draft mode" 
    },
    planning: { 
      color: "bg-blue-100 text-blue-800", 
      label: "Planning", 
      description: "Event is in the planning phase" 
    },
    confirmed: { 
      color: "bg-green-100 text-green-800", 
      label: "Confirmed", 
      description: "Event is confirmed" 
    },
    cancelled: { 
      color: "bg-red-100 text-red-800", 
      label: "Cancelled", 
      description: "Event has been cancelled" 
    },
    completed: { 
      color: "bg-purple-100 text-purple-800", 
      label: "Completed", 
      description: "Event has been completed" 
    }
  },
  musician: {
    available: { 
      color: "bg-green-100 text-green-800", 
      label: "Available", 
      description: "Musician is available" 
    },
    unavailable: { 
      color: "bg-red-100 text-red-800", 
      label: "Unavailable", 
      description: "Musician is not available" 
    },
    tentative: { 
      color: "bg-yellow-100 text-yellow-800", 
      label: "Tentative", 
      description: "Musician's availability is tentative" 
    },
    booked: { 
      color: "bg-blue-100 text-blue-800", 
      label: "Booked", 
      description: "Musician is booked" 
    }
  },
  payment: {
    pending: { 
      color: "bg-yellow-100 text-yellow-800", 
      label: "Pending", 
      description: "Payment is pending" 
    },
    processing: { 
      color: "bg-blue-100 text-blue-800", 
      label: "Processing", 
      description: "Payment is being processed" 
    },
    completed: { 
      color: "bg-green-100 text-green-800", 
      label: "Completed", 
      description: "Payment is completed" 
    },
    failed: { 
      color: "bg-red-100 text-red-800", 
      label: "Failed", 
      description: "Payment has failed" 
    },
    refunded: { 
      color: "bg-purple-100 text-purple-800", 
      label: "Refunded", 
      description: "Payment has been refunded" 
    }
  }
};

// Default status styling
const defaultStatus = { 
  color: "bg-gray-100 text-gray-800", 
  label: "Unknown", 
  description: "Status information not available" 
};

interface StatusBadgeProps {
  status: string;
  entityType: string;
  timestamp?: string;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function StatusBadge({
  status,
  entityType,
  timestamp,
  showTooltip = true,
  size = "md",
  className = ""
}: StatusBadgeProps) {
  // Get status config based on entity type and status
  const statusInfo = statusConfig[entityType]?.[status] || defaultStatus;
  const { color, label, description } = statusInfo;

  // Size classes
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
    lg: "px-3 py-1"
  };
  
  const badge = (
    <Badge 
      className={`${color} capitalize ${sizeClasses[size]} ${className}`}
    >
      {label}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {badge}
            <InfoIcon className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[250px]">
          <div className="text-xs">
            <p className="font-medium">{description}</p>
            {timestamp && (
              <p className="text-muted-foreground mt-1">
                Updated {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}