import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface ContractTemplate {
  id: number;
  name: string;
  description: string | null;
  content: string;
  isDefault: boolean | null;
  isMonthly: boolean | null;
  createdAt: Date;
  updatedAt: Date | null;
  createdBy: number | null;
  variables: unknown;
}

interface FinalizeMonthlyPlannerProps {
  plannerId: number;
  plannerName: string;
  plannerMonth: string;
  open: boolean;
  onClose: () => void;
}

const FinalizeMonthlyPlanner = ({
  plannerId,
  plannerName,
  plannerMonth,
  open,
  onClose,
}: FinalizeMonthlyPlannerProps) => {
  const { toast } = useToast();
  const [sendEmails, setSendEmails] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [emailMessage, setEmailMessage] = useState(
    `Dear musician,\n\nPlease find attached your scheduled performances for ${plannerMonth}. Please confirm your availability by clicking the confirmation link in this email.\n\nBest regards,\nThe VAMP Team`
  );

  // Query to get all musicians with assignments in this planner
  const {
    data: musicianAssignments,
    isLoading: isLoadingAssignments,
  } = useQuery({
    queryKey: ['/api/planner-assignments/by-musician', plannerId],
    queryFn: () => apiRequest(`/api/planner-assignments/by-musician?plannerId=${plannerId}`),
    enabled: open && !!plannerId,
  });
  
  // Query to get all monthly contract templates
  const {
    data: contractTemplates = [] as ContractTemplate[],
    isLoading: isLoadingTemplates,
  } = useQuery<ContractTemplate[]>({
    queryKey: ['/api/contract-templates'],
    enabled: open && sendEmails,
  });
  
  // Query to get a specific template by ID
  const {
    data: selectedTemplate,
    isLoading: isLoadingSelectedTemplate,
  } = useQuery({
    queryKey: ['/api/contract-templates', selectedTemplateId],
    queryFn: () => apiRequest(`/api/contract-templates/${selectedTemplateId}`),
    enabled: !!selectedTemplateId && selectedTemplateId !== "loading" && selectedTemplateId !== "none",
  });
  
  // Effect to update email message when a template is selected
  useEffect(() => {
    if (selectedTemplate) {
      // Replace template variables with planner-specific values
      let content = selectedTemplate.content;
      content = content.replace(/{month}/g, plannerMonth);
      content = content.replace(/{year}/g, new Date().getFullYear().toString());
      content = content.replace(/{company_name}/g, "VAMP Productions");
      
      // Set the email message to the template content
      setEmailMessage(content);
    }
  }, [selectedTemplate, plannerMonth]);

  // Finalize planner mutation
  const finalizeMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest(`/api/planners/${plannerId}/finalize`, "POST", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: sendEmails 
          ? "Planner finalized and emails sent to musicians" 
          : "Planner finalized successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/planners'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to finalize planner",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  const handleFinalize = () => {
    finalizeMutation.mutate({
      sendEmails,
      emailMessage: sendEmails ? emailMessage : null,
      contractTemplateId: sendEmails && selectedTemplateId ? parseInt(selectedTemplateId) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Finalize Monthly Planner - {plannerName}</DialogTitle>
          <DialogDescription>
            Review and send consolidated assignments to musicians.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="send-emails" 
              checked={sendEmails} 
              onCheckedChange={(checked) => setSendEmails(!!checked)} 
            />
            <Label htmlFor="send-emails">Send consolidated assignment emails to musicians</Label>
          </div>

          {sendEmails && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contract-template">Contract Template</Label>
                <Select 
                  value={selectedTemplateId} 
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a monthly contract template" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingTemplates ? (
                      <SelectItem value="loading" disabled>Loading templates...</SelectItem>
                    ) : contractTemplates.filter(template => template.isMonthly).length > 0 ? (
                      contractTemplates
                        .filter(template => template.isMonthly)
                        .map(template => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="none" disabled>No monthly templates available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose a monthly contract template that will be used for email notifications
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email-message">Email Message</Label>
                <Textarea
                  id="email-message"
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={5}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Musicians to be notified</h3>
            
            {isLoadingAssignments ? (
              <Skeleton className="h-40 w-full" />
            ) : musicianAssignments && Object.keys(musicianAssignments).length > 0 ? (
              <Accordion type="multiple" className="w-full">
                {Object.entries(musicianAssignments).map(([musicianId, assignments]: [string, any]) => (
                  <AccordionItem key={musicianId} value={musicianId}>
                    <AccordionTrigger>
                      {assignments.musicianName} ({assignments.assignments.length} assignments)
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pl-4">
                        {assignments.assignments.map((assignment: any) => (
                          <div key={assignment.id} className="grid grid-cols-3 text-sm">
                            <div>{format(new Date(assignment.date), "MMM d, yyyy")}</div>
                            <div>{assignment.venueName}</div>
                            <div className="text-right">${assignment.fee || assignment.actualFee}</div>
                          </div>
                        ))}
                        <div className="border-t pt-2 mt-2 font-medium flex justify-between">
                          <span>Total</span>
                          <span>${assignments.totalFee}</span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center p-6 border rounded-md text-gray-500">
                No musicians with assignments found for this month
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleFinalize} 
            disabled={
              finalizeMutation.isPending || 
              (sendEmails && (!selectedTemplateId || selectedTemplateId === "none" || selectedTemplateId === "loading"))
            }
          >
            {finalizeMutation.isPending ? "Finalizing..." : "Finalize & Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinalizeMonthlyPlanner;