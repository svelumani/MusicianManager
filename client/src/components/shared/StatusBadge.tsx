import React from "react";
import { Badge } from "@/components/ui/badge";

/**
 * This is a legacy component for backward compatibility.
 * New code should use the StatusBadge component from '@/components/StatusBadge'
 * which integrates with the centralized status system.
 */

interface LegacyStatusBadgeProps {
  status: string;
  className?: string;
}

export default function LegacyStatusBadge({ status, className }: LegacyStatusBadgeProps) {
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let innerClassName = "";
  
  // Map status to appropriate badge style
  switch (status?.toLowerCase()) {
    case "confirmed":
    case "accepted":
    case "approved":
    case "completed":
    case "contract-signed":
      variant = "default";
      innerClassName = "bg-green-600";
      break;
      
    case "pending":
    case "awaiting":
    case "in progress":
    case "in-progress":
    case "contract-sent":
      variant = "secondary";
      innerClassName = "bg-blue-600";
      break;
      
    case "cancelled":
    case "rejected":
    case "declined":
    case "not available":
    case "not-available":
      variant = "destructive";
      break;
      
    default:
      variant = "outline";
  }
  
  return (
    <Badge 
      variant={variant} 
      className={`${innerClassName} ${className || ""}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' ')}
    </Badge>
  );
}