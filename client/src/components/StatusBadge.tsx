import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';

// Define status color mapping
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  // Contract statuses
  'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  'sent': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  'signed': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  'cancelled': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  'expired': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  'contract-sent': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  'contract-signed': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  
  // Event statuses
  'draft': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  'published': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  'completed': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  'archived': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  
  // Musician statuses
  'available': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  'pending-contract': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  'booked': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  'confirmed': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  'declined': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  
  // Payment statuses
  'unpaid': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  'partial': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  'paid': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  
  // Default
  'default': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
};

type StatusBadgeProps = {
  status: string;
  entityType?: string;
  metadata?: any;
  timestamp?: string | Date;
  className?: string;
  showTooltip?: boolean;
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  entityType,
  metadata,
  timestamp,
  className = '',
  showTooltip = true
}) => {
  // Normalize status for display
  const normalizedStatus = status.toLowerCase().replace(/_/g, '-');
  
  // Get colors from mapping or default
  const colors = statusColors[normalizedStatus] || statusColors.default;
  
  // Format display status
  const displayStatus = normalizedStatus
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Format timestamp if exists
  const formattedTimestamp = timestamp
    ? format(new Date(timestamp), 'MMM d, yyyy h:mm a')
    : '';
  
  // Prepare tooltip content
  const tooltipContent = (
    <div className="text-sm">
      <p className="font-bold">{displayStatus}</p>
      {entityType && <p>Type: {entityType}</p>}
      {formattedTimestamp && <p>Updated: {formattedTimestamp}</p>}
      {metadata && metadata.reason && <p>Reason: {metadata.reason}</p>}
    </div>
  );
  
  const badge = (
    <Badge 
      className={`${colors.bg} ${colors.text} ${colors.border} border py-1 px-2 font-medium ${className}`}
    >
      {displayStatus}
    </Badge>
  );
  
  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return badge;
};

export default StatusBadge;