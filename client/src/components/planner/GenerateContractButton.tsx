import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Mail } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Spinner } from "@/components/ui/spinner";

interface GenerateContractButtonProps {
  plannerId: number;
  month: number;
  year: number;
  musicianId?: number;
  assignmentIds?: number[];
  onContractGenerated?: () => void;
}

export default function GenerateContractButton({
  plannerId,
  month,
  year,
  musicianId,
  assignmentIds,
  onContractGenerated
}: GenerateContractButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateContractMutation = useMutation({
    mutationFn: (data: {
      plannerId: number;
      month: number;
      year: number;
      musicianId?: number;
      assignmentIds?: number[];
    }) => apiRequest('/api/monthly-contracts/generate', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    }),
    onSuccess: () => {
      toast({
        title: 'Contract generated',
        description: 'The contract has been generated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician/${plannerId}`] });
      
      // Notify parent component if needed
      if (onContractGenerated) {
        onContractGenerated();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to generate contract: ' + (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  const handleClick = () => {
    generateContractMutation.mutate({
      plannerId,
      month,
      year,
      musicianId,
      assignmentIds
    });
  };

  return (
    <Button
      onClick={handleClick}
      disabled={generateContractMutation.isPending}
      variant="default"
      className="gap-2"
    >
      {generateContractMutation.isPending ? (
        <Spinner size="sm" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      Generate Contract
    </Button>
  );
}