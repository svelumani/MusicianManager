// This is a legacy component that now uses the central StatusBadge component
// Using this wrapper for backward compatibility with existing code
import StatusBadge from "@/components/StatusBadge";

interface LegacyStatusBadgeProps {
  status: string;
}

export default function LegacyStatusBadge({ status }: LegacyStatusBadgeProps) {
  // Map event status to use the correct entity type from the central component
  const mapStatusToEntityType = (status: string): string => {
    if (status.includes('contract')) {
      return 'contract';
    }
    if (status === 'paid' || status === 'partial') {
      return 'payment';
    }
    return 'event';
  };
  
  return (
    <StatusBadge 
      status={status} 
      entityType={mapStatusToEntityType(status)}
      showTooltip={false}
    />
  );
}
