import { Badge } from "@/components/ui/badge";
import { cva } from "class-variance-authority";

const statusVariants = cva("", {
  variants: {
    status: {
      pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      confirmed: "bg-green-100 text-green-800 hover:bg-green-100",
      "contract-sent": "bg-blue-100 text-blue-800 hover:bg-blue-100",
      "contract-signed": "bg-purple-100 text-purple-800 hover:bg-purple-100",
      cancelled: "bg-red-100 text-red-800 hover:bg-red-100",
      paid: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
      partial: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    },
  },
  defaultVariants: {
    status: "pending",
  },
});

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  // Map API status values to UI status variants
  const getStatusVariant = (apiStatus: string): string => {
    switch(apiStatus.toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'confirmed':
        return 'confirmed';
      case 'contract-sent':
      case 'contractsent':
        return 'contract-sent';
      case 'contract-signed':
      case 'contractsigned':
        return 'contract-signed';
      case 'cancelled':
        return 'cancelled';
      case 'paid':
        return 'paid';
      case 'partial':
        return 'partial';
      default:
        return 'pending';
    }
  };

  // Map API status values to display text
  const getStatusText = (apiStatus: string): string => {
    switch(apiStatus.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'contract-sent':
      case 'contractsent':
        return 'Contract Sent';
      case 'contract-signed':
      case 'contractsigned':
        return 'Contract Signed';
      case 'cancelled':
        return 'Cancelled';
      case 'paid':
        return 'Paid';
      case 'partial':
        return 'Partial Payment';
      default:
        return apiStatus;
    }
  };

  const statusVariant = getStatusVariant(status);
  const statusText = getStatusText(status);

  return (
    <Badge className={statusVariants({ status: statusVariant as any })} variant="outline">
      {statusText}
    </Badge>
  );
}
