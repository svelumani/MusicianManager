import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface GenerateContractButtonProps {
  plannerId: number;
  plannerName: string;
  plannerMonth: string;
  plannerYear: number;
  musicianId?: number;
}

const GenerateContractButton = ({
  plannerId,
  plannerName,
  plannerMonth,
  plannerYear,
  musicianId,
}: GenerateContractButtonProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Mutation for generating the contract
  const generateContractMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      try {
        const data = {
          plannerId,
          month: parseInt(format(new Date(`${plannerMonth} 1, ${plannerYear}`), 'M')),
          year: plannerYear,
          musicianId: musicianId // This is optional and will generate just for this musician if provided
        };
        console.log("Generating contract with data:", data);
        
        return await apiRequest('/api/monthly-contracts/generate', 'POST', data);
      } finally {
        setIsGenerating(false);
      }
    },
    onSuccess: (data) => {
      console.log("Contract generated successfully:", data);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/monthly-contracts'] });
      
      // Show success message
      toast({
        title: "Contract Generated",
        description: musicianId 
          ? "Contract has been generated for the selected musician."
          : "Monthly contracts have been generated for all musicians with assignments.",
      });
      
      // Close the dialog
      setDialogOpen(false);
    },
    onError: (error: any) => {
      console.error("Error generating contract:", error);
      
      // Show error message
      toast({
        title: "Error",
        description: error?.message || "Failed to generate contract. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleGenerateContract = () => {
    generateContractMutation.mutate();
  };

  return (
    <>
      <Button 
        onClick={() => setDialogOpen(true)}
        size="sm"
        variant="outline"
      >
        Generate Contract
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Contract</DialogTitle>
            <DialogDescription>
              {musicianId 
                ? "This will generate a contract for this musician based on their assignments in the planner."
                : "This will generate contracts for all musicians with assignments in this planner."}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p><strong>Planner:</strong> {plannerName}</p>
            <p><strong>Month/Year:</strong> {plannerMonth} {plannerYear}</p>
            {musicianId && <p><strong>Generating for:</strong> Musician ID {musicianId}</p>}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateContract}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GenerateContractButton;