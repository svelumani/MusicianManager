import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SendHorizontal } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Spinner } from "@/components/ui/spinner";
import React from "react";

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

  // Combined generate and send mutation
  const generateAndSendMutation = useMutation({
    mutationFn: async (data: {
      plannerId: number;
      month: number;
      year: number;
      musicianId?: number;
      assignmentIds?: number[];
    }) => {
      // Step 1: Generate the contract
      console.log("Generating contract with data:", data);
      const generateResponse = await apiRequest('/api/monthly-contracts/generate', 'POST', data);
      
      if (!generateResponse) {
        throw new Error("Failed to generate contract: No response received");
      }
      
      console.log("Generate response:", generateResponse);
      
      // Step 2: Send the contract if we got an ID back
      if (generateResponse && generateResponse.id) {
        console.log(`Sending contract with ID: ${generateResponse.id}`);
        await apiRequest(`/api/monthly-contracts/${generateResponse.id}/send`, 'POST');
      } else {
        throw new Error("Failed to generate contract: No contract ID was returned");
      }
      
      return generateResponse;
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Contract generated and sent successfully.',
      });
      
      // Invalidate all relevant queries to update UI
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician/${plannerId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician`] });
      queryClient.invalidateQueries({ queryKey: [`/api/monthly-contracts`] });
      queryClient.invalidateQueries({ queryKey: [`/api/monthly-contracts/planner/${plannerId}`] });
      
      // Notify parent component if needed
      if (onContractGenerated) {
        onContractGenerated();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Operation failed: ' + (error as Error).message,
        variant: 'destructive',
      });
    },
  });

  const handleGenerateAndSend = () => {
    generateAndSendMutation.mutate({
      plannerId,
      month,
      year,
      musicianId,
      assignmentIds
    });
  };

  return (
    <Button
      onClick={handleGenerateAndSend}
      disabled={generateAndSendMutation.isPending}
      variant="outline"
      className="gap-2"
    >
      {generateAndSendMutation.isPending ? (
        <Spinner size="small" />
      ) : (
        <SendHorizontal className="h-4 w-4" />
      )}
      Generate & Send Contract
    </Button>
  );
}