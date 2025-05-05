import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Mail, SendHorizontal } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Spinner } from "@/components/ui/spinner";
import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group";
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
  const [generatedContractId, setGeneratedContractId] = React.useState<number | null>(null);

  // Mutation for contract generation
  const generateContractMutation = useMutation({
    mutationFn: (data: {
      plannerId: number;
      month: number;
      year: number;
      musicianId?: number;
      assignmentIds?: number[];
    }) => apiRequest('/api/monthly-contracts/generate', 'POST', data),
    onSuccess: (data) => {
      toast({
        title: 'Contract generated',
        description: 'The contract has been generated successfully.',
      });
      
      // Store the newly generated contract ID for sending
      if (data && data.contractId) {
        setGeneratedContractId(data.contractId);
      }
      
      // Invalidate both query patterns to ensure UI updates
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician/${plannerId}`] });
      // This is the actual query key used in MusicianAssignmentsView
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician`] });
      
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

  // Mutation for sending a generated contract
  const sendContractMutation = useMutation({
    mutationFn: (contractId: number) => apiRequest(`/api/monthly-contracts/${contractId}/send`, 'POST'),
    onSuccess: () => {
      toast({
        title: 'Contract sent',
        description: 'The contract has been sent successfully.',
      });
      
      // Invalidate relevant queries to update UI
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician/${plannerId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician`] });
      queryClient.invalidateQueries({ queryKey: [`/api/monthly-contracts`] });
      
      // Reset the contract ID after successful send
      setGeneratedContractId(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to send contract: ' + (error as Error).message,
        variant: 'destructive',
      });
    },
  });

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
      const generateResponse = await apiRequest('/api/monthly-contracts/generate', 'POST', data);
      
      // Step 2: Send the contract
      if (generateResponse && generateResponse.contractId) {
        await apiRequest(`/api/monthly-contracts/${generateResponse.contractId}/send`, 'POST');
      } else {
        throw new Error("Failed to generate contract: No contract ID was returned");
      }
      
      return generateResponse;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Contract generated and sent successfully.',
      });
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician/${plannerId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician`] });
      queryClient.invalidateQueries({ queryKey: [`/api/monthly-contracts`] });
      
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

  // Handlers for the different buttons
  const handleGenerate = () => {
    generateContractMutation.mutate({
      plannerId,
      month,
      year,
      musicianId,
      assignmentIds
    });
  };

  const handleSend = () => {
    if (generatedContractId) {
      sendContractMutation.mutate(generatedContractId);
    }
  };

  const handleGenerateAndSend = () => {
    generateAndSendMutation.mutate({
      plannerId,
      month,
      year,
      musicianId,
      assignmentIds
    });
  };

  // Check if any mutation is in progress
  const isLoading = generateContractMutation.isPending || 
                    sendContractMutation.isPending ||
                    generateAndSendMutation.isPending;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Generate Contract Button */}
      <Button
        onClick={handleGenerate}
        disabled={isLoading}
        variant="default"
        className="gap-2"
      >
        {generateContractMutation.isPending ? (
          <Spinner size="small" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        Generate Contract
      </Button>
      
      {/* Send Button (only visible if we have a generated contract) */}
      {generatedContractId && (
        <Button
          onClick={handleSend}
          disabled={isLoading}
          variant="outline"
          className="gap-2"
        >
          {sendContractMutation.isPending ? (
            <Spinner size="small" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          Send Contract
        </Button>
      )}
      
      {/* Generate & Send Button */}
      <Button
        onClick={handleGenerateAndSend}
        disabled={isLoading}
        variant="secondary"
        className="gap-2"
      >
        {generateAndSendMutation.isPending ? (
          <Spinner size="small" />
        ) : (
          <SendHorizontal className="h-4 w-4" />
        )}
        Generate & Send
      </Button>
    </div>
  );
}