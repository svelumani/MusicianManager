import { useState, useEffect, useMemo } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  isDefault: boolean;
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
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<string>("");
  const [contractTemplateId, setContractTemplateId] = useState<string>("");
  const [emailMessage, setEmailMessage] = useState(
    `Dear {musician_name},

We're pleased to share your ${plannerMonth} performance schedule with VAMP Productions.

Please review the details of your scheduled performances in the attachment and confirm your availability for each date by clicking the link below:

{confirmation_link}

If you have any questions or need to discuss specific dates, please contact us directly.

Thank you for your continued collaboration with VAMP Productions.

Best regards,
The VAMP Team`
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
  
  // Query to get all email templates
  const {
    data: emailTemplates = [] as EmailTemplate[],
    isLoading: isLoadingTemplates,
  } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/email-templates'],
    enabled: open && sendEmails,
  });
  
  // Query to get all contract templates (still needed for contract generation)
  const {
    data: contractTemplates = [] as ContractTemplate[],
    isLoading: isLoadingContractTemplates,
  } = useQuery<ContractTemplate[]>({
    queryKey: ['/api/contract-templates'],
    enabled: open && sendEmails,
  });
  
  // Get selected contract template (default to the first monthly one)
  const defaultContractTemplate = useMemo(() => {
    if (contractTemplates && contractTemplates.length > 0) {
      const monthlyTemplates = contractTemplates.filter(t => t.isMonthly);
      return monthlyTemplates.length > 0 ? monthlyTemplates[0].id.toString() : "";
    }
    return "";
  }, [contractTemplates]);
  
  // Query to get a specific email template by ID
  const {
    data: selectedEmailTemplate,
    isLoading: isLoadingSelectedTemplate,
  } = useQuery({
    queryKey: ['/api/email-templates', selectedEmailTemplateId],
    queryFn: () => apiRequest(`/api/email-templates/${selectedEmailTemplateId}`),
    enabled: !!selectedEmailTemplateId && selectedEmailTemplateId !== "loading" && selectedEmailTemplateId !== "none",
  });
  
  // Effect to update email message when a template is selected
  useEffect(() => {
    if (selectedEmailTemplate) {
      // Replace template variables with planner-specific values
      let content = selectedEmailTemplate.textContent;
      content = content.replace(/{month}/g, plannerMonth);
      content = content.replace(/{year}/g, new Date().getFullYear().toString());
      content = content.replace(/{company_name}/g, "VAMP Productions");
      
      // Set the email message to the template content
      setEmailMessage(content);
    }
  }, [selectedEmailTemplate, plannerMonth]);

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

  // State for confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const handlePrepareFinalize = () => {
    if (sendEmails && (!selectedEmailTemplateId || selectedEmailTemplateId === "none" || selectedEmailTemplateId === "loading")) {
      toast({
        title: "Error",
        description: "Please select an email template",
        variant: "destructive",
      });
      return;
    }
    
    // If no contract template is selected, use the default one
    if (!contractTemplateId && defaultContractTemplate) {
      setContractTemplateId(defaultContractTemplate);
    }
    
    setShowConfirmation(true);
  };

  const handleConfirmFinalize = () => {
    finalizeMutation.mutate({
      sendEmails,
      emailMessage: sendEmails ? emailMessage : null,
      contractTemplateId: sendEmails && contractTemplateId ? parseInt(contractTemplateId) : 
                        defaultContractTemplate ? parseInt(defaultContractTemplate) : null,
      emailTemplateId: sendEmails && selectedEmailTemplateId ? parseInt(selectedEmailTemplateId) : null,
    });
    setShowConfirmation(false);
  };
  
  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  return (
    <>
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
                  <Label htmlFor="email-template">Email Template</Label>
                  <Select 
                    value={selectedEmailTemplateId} 
                    onValueChange={setSelectedEmailTemplateId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an email template" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingTemplates ? (
                        <SelectItem value="loading" disabled>Loading templates...</SelectItem>
                      ) : emailTemplates && emailTemplates.length > 0 ? (
                        emailTemplates.map(template => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No email templates available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose an email template to send to musicians
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
                  <p className="text-xs text-muted-foreground">
                    This is the text that will be included in the email notification, not the actual contract. 
                    Keep it simple and concise.
                  </p>
                </div>

                <div className="mt-4 p-4 bg-muted rounded-md">
                  <h4 className="text-sm font-medium mb-2">Contract Selection</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    The default monthly contract template will be used for all musicians.
                    {defaultContractTemplate ? " A valid template has been detected." : " No valid template found."}
                  </p>
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
              onClick={handlePrepareFinalize} 
              disabled={
                finalizeMutation.isPending || 
                (sendEmails && (!selectedEmailTemplateId || selectedEmailTemplateId === "none" || selectedEmailTemplateId === "loading"))
              }
            >
              {finalizeMutation.isPending ? "Finalizing..." : "Review & Finalize"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Monthly Contract Finalization</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to finalize the {plannerMonth} monthly planner and send contract emails to the following musicians.
              Please review the list carefully before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-4 max-h-[50vh] overflow-auto border rounded-md p-4">
            <div className="space-y-4">
              {musicianAssignments && Object.entries(musicianAssignments).map(([musicianId, assignments]: [string, any]) => (
                <div key={musicianId} className="border-b pb-4 last:border-0">
                  <h4 className="text-md font-semibold">{assignments.musicianName}</h4>
                  <p className="text-sm text-muted-foreground">{assignments.email}</p>
                  
                  <div className="mt-2 space-y-1">
                    <h5 className="text-sm font-medium">Performance Schedule:</h5>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Venue</th>
                          <th className="text-right py-2">Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.assignments.map((assignment: any) => (
                          <tr key={assignment.id} className="border-b border-dashed">
                            <td className="py-2">{format(new Date(assignment.date), "MMM d, yyyy")}</td>
                            <td className="py-2">{assignment.venueName}</td>
                            <td className="py-2 text-right">${assignment.fee || assignment.actualFee}</td>
                          </tr>
                        ))}
                        <tr className="font-medium">
                          <td colSpan={2} className="py-2 text-right">Total:</td>
                          <td className="py-2 text-right">${assignments.totalFee}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConfirmation}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmFinalize}
              disabled={finalizeMutation.isPending}
            >
              {finalizeMutation.isPending ? "Sending Contracts..." : "Confirm & Send Contracts"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FinalizeMonthlyPlanner;