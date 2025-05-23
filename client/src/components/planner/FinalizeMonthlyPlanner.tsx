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
    error: assignmentsError,
  } = useQuery({
    queryKey: ['/api/planner-assignments/by-musician', plannerId],
    queryFn: async () => {
      // Improved error handling to resolve the "Error retrieving musician data" issue
      // Enhanced logging to track what values are being sent
      console.log("FinalizeMonthlyPlanner - API request parameters:", {
        plannerId,
        isNumber: typeof plannerId === 'number',
        isNaN: isNaN(plannerId),
        stringValue: String(plannerId),
        asInt: parseInt(String(plannerId)),
        plannerIdType: typeof plannerId
      });
      
      // Ensure plannerId is a valid number
      if (!plannerId || isNaN(plannerId)) {
        console.error("Invalid plannerId:", plannerId);
        throw new Error("Invalid planner ID. Please try again with a valid monthly planner.");
      }
      
      // Instead of throwing errors, we'll handle all errors gracefully to ensure the finalize dialog
      // always loads, even if with limited data
      
      // Ensure we're passing a number, not a string that looks like a number
      const numericPlannerId = typeof plannerId === 'number' ? plannerId : parseInt(String(plannerId), 10);
      const url = `/api/planner-assignments/by-musician?plannerId=${numericPlannerId}`;
      console.log("Making API request to:", url);
      
      try {
        // Get the musician assignments first
        const response = await apiRequest(url);
        console.log("API response received:", {
          responseType: typeof response,
          isObject: response && typeof response === 'object',
          hasKeys: response && typeof response === 'object' ? Object.keys(response).length : 0,
          firstKeys: response && typeof response === 'object' ? Object.keys(response).slice(0, 5) : []
        });
        
        // Add metadata about the response
        if (response && typeof response === 'object') {
          // Special handling for _status fields returned by our enhanced error handling
          if (response._status === "error") {
            console.warn(`Server returned error status: ${response._message}`, {
              errorType: response._errorType,
              details: response._details
            });
            
            // Different error types require different handling
            if (response._errorType === "InvalidAssignmentID") {
              // For this specific error, we want to show a custom message
              console.warn("Assignment validation error - using empty results structure");
            } else if (response._errorType === "AssignmentDataIntegrityError") {
              // Data integrity issue - we can use the dummy entry provided by the server
              console.warn("Assignment data integrity error - using server-provided dummy entry");
            } else if (response._errorType === "ServerError") {
              // General server error
              console.error("Server error occurred:", response._details || "Unknown server error");
            }
            
            // All error types show the same toast and return a usable structure
            toast({
              title: "Musician data is incomplete",
              description: "Some assignments might not be shown correctly. You can continue, but verify the musician list.",
              variant: "default",
              duration: 5000
            });
            
            // Return the server response (which should include a dummy entry)
            // or create our own if it doesn't
            if (Object.keys(response).some(key => !key.startsWith('_'))) {
              return response; // Return the response with any existing entries
            }
            
            // Empty structure that matches what the component expects
            return {
              _status: "warning",
              _message: "Limited musician data available",
              // Add a dummy entry to ensure the component doesn't crash
              999: {
                musicianId: 999,
                musicianName: "Unknown musician(s)",
                assignments: [],
                totalFee: 0
              }
            };
          }
          
          const musicianCount = Object.keys(response).filter(key => !key.startsWith('_')).length;
          console.log(`Response contains ${musicianCount} musicians with assignments`);
          
          if (musicianCount === 0) {
            console.warn("Empty response received (no musicians) - adding diagnostic info");
            return {
              _status: "empty",
              _message: "No musicians with assignments found for this planner",
              999: {
                musicianId: 999,
                musicianName: "No musicians with assignments",
                assignments: [],
                totalFee: 0
              }
            };
          }
          
          return response;
        } else {
          console.error("Invalid response format:", response);
          // Instead of throwing an error, return a usable structure
          toast({
            title: "Warning",
            description: "The server returned an unexpected response. The musician list may be incomplete.",
            variant: "destructive",
            duration: 5000
          });
          
          return {
            _status: "error",
            _message: "Invalid server response format",
            999: {
              musicianId: 999,
              musicianName: "Error in server response",
              assignments: [],
              totalFee: 0
            }
          };
        }
      } catch (error) {
        console.error("Error fetching musician assignments:", error);
        
        // Check the error type and message
        const errorMessage = (error as any)?.message || "Unknown error";
        console.log("Error details:", { 
          message: errorMessage,
          isAxiosError: (error as any)?.isAxiosError,
          responseStatus: (error as any)?.response?.status,
          responseData: (error as any)?.response?.data 
        });
        
        // Try to extract structured error data if possible
        let errorData = null;
        try {
          if ((error as any)?.response?.data) {
            errorData = (error as any).response.data;
            console.log("Error has structured data:", errorData);
          }
        } catch (extractError) {
          console.error("Failed to extract error data:", extractError);
        }
        
        // Show a toast with appropriate message
        toast({
          title: "Error retrieving musician data",
          description: errorData?._message || "The server encountered an issue. You can continue, but verify the musician list carefully.",
          duration: 7000,
          variant: "destructive"
        });
        
        // Empty structure that matches what the component expects
        return {
          _status: "warning",
          _message: errorData?._message || "Error retrieving musician data",
          // Use the error data's fallback entry if available, otherwise use our own
          ...(errorData || {
            999: {
              musicianId: 999,
              musicianName: "Error loading musician data",
              assignments: [],
              totalFee: 0
            }
          })
        };
      }
    },
    enabled: open && !!plannerId && !isNaN(plannerId),
    retry: 2, // Retry failed requests twice
    retryDelay: 1000 // Wait 1 second between retries
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
  
  // Find default email template
  const defaultEmailTemplate = useMemo(() => {
    if (emailTemplates && emailTemplates.length > 0) {
      // First try to find a template with "monthly" in the name
      const monthlyTemplates = emailTemplates.filter(t => 
        t.name.toLowerCase().includes('monthly') || 
        t.name.toLowerCase().includes('assignment')
      );
      return monthlyTemplates.length > 0 ? monthlyTemplates[0].id.toString() : emailTemplates[0].id.toString();
    }
    return "";
  }, [emailTemplates]);
  
  // Set default email template when component loads
  useEffect(() => {
    if (defaultEmailTemplate && !selectedEmailTemplateId && open) {
      setSelectedEmailTemplateId(defaultEmailTemplate);
    }
  }, [defaultEmailTemplate, selectedEmailTemplateId, open]);
  
  // Set default contract template when component loads
  useEffect(() => {
    if (defaultContractTemplate && !contractTemplateId && open) {
      setContractTemplateId(defaultContractTemplate);
    }
  }, [defaultContractTemplate, contractTemplateId, open]);
  
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
    mutationFn: (data: any) => {
      // Ensure plannerId is valid before making the API call
      if (!plannerId || isNaN(plannerId)) {
        console.error("Invalid plannerId for finalize:", plannerId);
        return Promise.reject(new Error("Invalid planner ID"));
      }
      
      // Validate data completeness if sending emails
      if (data.sendEmails) {
        if (!data.emailTemplateId || data.emailTemplateId === "none" || data.emailTemplateId === "loading") {
          console.error("Missing email template for email sending");
          return Promise.reject(new Error("Email template is required when sending emails"));
        }
        
        if (!data.contractTemplateId) {
          console.error("Missing contract template for email sending");
          return Promise.reject(new Error("Contract template is required when sending emails"));
        }
        
        if (!data.emailMessage || data.emailMessage.trim() === "") {
          console.error("Missing email message for email sending");
          return Promise.reject(new Error("Email message is required when sending emails"));
        }
      }
      
      console.log("Finalizing planner with data:", {
        plannerId,
        sendEmails: data.sendEmails,
        hasEmailTemplate: !!data.emailTemplateId,
        hasContractTemplate: !!data.contractTemplateId,
        emailMessageLength: data.emailMessage ? data.emailMessage.length : 0
      });
      
      return apiRequest(`/api/planners/${plannerId}/finalize`, "POST", data);
    },
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
    onError: (error: any) => {
      // Handle specific error messages from the API
      let errorMessage = "Failed to finalize planner";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.error) {
        errorMessage = error.error;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Finalize error:", error);
    }
  });

  // State for confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const handlePrepareFinalize = () => {
    // First check if there are any musicians with assignments
    if (!musicianAssignments) {
      console.error("No musician assignments data received from API");
      toast({
        title: "Error",
        description: "Unable to load musician assignments. Please try again or contact support.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if musicianAssignments contains the special _status flag for an empty result
    if (musicianAssignments && 'object' === typeof musicianAssignments && '_status' in musicianAssignments && musicianAssignments._status === 'empty') {
      console.warn(`Empty musician assignments: ${('_message' in musicianAssignments) ? musicianAssignments._message : 'No reason provided'}`);
      toast({
        title: "Error",
        description: "No musicians with assignments found for this month. Cannot finalize empty planner.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if there are actually any assignments (even if the API returned a non-empty object)
    if (Object.keys(musicianAssignments).filter(key => !key.startsWith('_')).length === 0) {
      console.warn("Musician assignments object is empty with no actual musicians");
      toast({
        title: "Error",
        description: "No musicians with assignments found for this month. Cannot finalize empty planner.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate email template if sending emails
    if (sendEmails) {
      if (!selectedEmailTemplateId || selectedEmailTemplateId === "none" || selectedEmailTemplateId === "loading") {
        toast({
          title: "Error",
          description: "Please select an email template",
          variant: "destructive",
        });
        return;
      }
      
      // Validate contract template if sending emails
      if (!contractTemplateId && !defaultContractTemplate) {
        toast({
          title: "Error",
          description: "No contract template available. Please configure a default monthly contract template in Settings",
          variant: "destructive",
        });
        return;
      }
      
      // Validate email message content
      if (!emailMessage || emailMessage.trim() === "") {
        toast({
          title: "Error",
          description: "Email message cannot be empty",
          variant: "destructive",
        });
        return;
      }
    }
    
    // If no contract template is selected, use the default one
    if (!contractTemplateId && defaultContractTemplate) {
      setContractTemplateId(defaultContractTemplate);
      console.log(`Using default contract template: ${defaultContractTemplate}`);
    }
    
    // Check for any musician without email if sending emails
    if (sendEmails && musicianAssignments) {
      const missingEmails = Object.values(musicianAssignments).filter(
        (musician: any) => !musician.email || musician.email.trim() === ""
      );
      
      if (missingEmails.length > 0) {
        const musicianNames = missingEmails.map((m: any) => m.musicianName).join(", ");
        toast({
          title: "Warning",
          description: `These musicians have no email address: ${musicianNames}. They will not receive notifications.`,
          // Using default variant since "warning" is not supported in the current UI
        });
      }
    }
    
    console.log("Preparing to finalize planner", {
      plannerId,
      sendEmails,
      hasEmailTemplate: !!selectedEmailTemplateId,
      hasContractTemplate: !!(contractTemplateId || defaultContractTemplate),
      musicianCount: musicianAssignments ? Object.keys(musicianAssignments).length : 0
    });
    
    setShowConfirmation(true);
  };

  const handleConfirmFinalize = () => {
    // Extra validation to ensure we have valid data
    const finalData: {
      sendEmails: boolean;
      emailMessage?: string | null;
      contractTemplateId?: number | null;
      emailTemplateId?: number | null;
    } = {
      sendEmails
    };
    
    if (sendEmails) {
      // Add email-related data only if sending emails
      finalData.emailMessage = emailMessage || null;
      
      // Try to parse contract template ID
      try {
        finalData.contractTemplateId = contractTemplateId ? parseInt(contractTemplateId) : 
                          defaultContractTemplate ? parseInt(defaultContractTemplate) : null;
      } catch (e) {
        console.error("Invalid contract template ID:", contractTemplateId || defaultContractTemplate);
        toast({
          title: "Error",
          description: "Invalid contract template selected",
          variant: "destructive",
        });
        setShowConfirmation(false);
        return;
      }
      
      // Try to parse email template ID
      try {
        finalData.emailTemplateId = selectedEmailTemplateId ? parseInt(selectedEmailTemplateId) : null;
      } catch (e) {
        console.error("Invalid email template ID:", selectedEmailTemplateId);
        toast({
          title: "Error",
          description: "Invalid email template selected",
          variant: "destructive",
        });
        setShowConfirmation(false);
        return;
      }
      
      // Final validation checks
      if (!finalData.emailTemplateId) {
        toast({
          title: "Error",
          description: "Email template is required when sending emails",
          variant: "destructive",
        });
        setShowConfirmation(false);
        return;
      }
    }
    
    console.log("Finalizing planner with data:", finalData);
    
    finalizeMutation.mutate(finalData);
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
                <>
                  {/* Show a warning if there's error status */}
                  {musicianAssignments._status && musicianAssignments._status !== "success" && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 mb-4 rounded-md text-sm">
                      {musicianAssignments._message || "There may be issues with the musician data. Please verify before sending."}
                    </div>
                  )}
                  
                  <Accordion type="multiple" className="w-full">
                    {Object.entries(musicianAssignments)
                      .filter(([key]) => !key.startsWith('_')) // Filter out metadata keys
                      .map(([musicianId, assignments]: [string, any]) => {
                        // Safety check to ensure assignments has the expected structure
                        const hasValidAssignments = assignments && 
                                               typeof assignments === 'object' && 
                                               assignments.musicianName;
                                               
                        // Get the assignments array safely
                        const assignmentsArray = hasValidAssignments && Array.isArray(assignments.assignments) 
                          ? assignments.assignments 
                          : [];
                        const assignmentCount = assignmentsArray.length;
                        const musicianName = hasValidAssignments ? assignments.musicianName : 'Unknown Musician';
                        const totalFee = hasValidAssignments ? (assignments.totalFee || 0) : 0;
                        
                        // Skip rendering if there are no valid assignments
                        if (!hasValidAssignments && musicianId !== '999') { // Allow our special error entry
                          console.warn(`Skipping invalid musician entry: ${musicianId}`);
                          return null;
                        }
                        
                        return (
                          <AccordionItem key={musicianId} value={musicianId}>
                            <AccordionTrigger>
                              {musicianName} ({assignmentCount} assignments)
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pl-4">
                                {assignmentsArray.length > 0 ? (
                                  <>
                                    {assignmentsArray.map((assignment: any) => (
                                      <div key={assignment.id || `assignment-${Math.random()}`} className="grid grid-cols-3 text-sm">
                                        <div>{assignment.date ? format(new Date(assignment.date), "MMM d, yyyy") : 'Unknown date'}</div>
                                        <div>{assignment.venueName || 'Unknown venue'}</div>
                                        <div className="text-right">${assignment.fee || assignment.actualFee || 0}</div>
                                      </div>
                                    ))}
                                    <div className="border-t pt-2 mt-2 font-medium flex justify-between">
                                      <span>Total</span>
                                      <span>${totalFee}</span>
                                    </div>
                                  </>
                                ) : (
                                  <p className="text-sm text-gray-500">No assignment details available.</p>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                    })}
                  </Accordion>
                </>
              ) : (
                <div className="text-center p-6 border rounded-md text-gray-500 bg-gray-50">
                  {musicianAssignments && musicianAssignments._message ? (
                    <>
                      <p className="font-medium text-amber-600">{musicianAssignments._message}</p>
                      <p className="text-sm mt-2">Please try refreshing the page or contact support if this issue persists.</p>
                    </>
                  ) : (
                    "No musicians with assignments found for this month"
                  )}
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
              {musicianAssignments && Object.entries(musicianAssignments).map(([musicianId, assignments]: [string, any]) => {
                // Safety check to ensure assignments has the expected structure
                const hasValidAssignments = assignments && 
                                         typeof assignments === 'object' && 
                                         assignments.musicianName && 
                                         Array.isArray(assignments.assignments);
                                         
                // Skip rendering if there are no valid assignments
                if (!hasValidAssignments && musicianId !== '999') {
                  console.warn(`Confirmation dialog: Skipping invalid musician entry: ${musicianId}`);
                  return null;
                }
                
                // Get the assignments array safely
                const assignmentsArray = hasValidAssignments ? assignments.assignments : [];
                const musicianName = hasValidAssignments ? assignments.musicianName : 'Unknown Musician';
                const email = hasValidAssignments && assignments.email ? assignments.email : '';
                const totalFee = hasValidAssignments ? (assignments.totalFee || 0) : 0;
                
                return (
                  <div key={musicianId} className="border-b pb-4 last:border-0">
                    <h4 className="text-md font-semibold">{musicianName}</h4>
                    <p className="text-sm text-muted-foreground">{email}</p>
                    
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
                          {assignmentsArray.map((assignment: any) => (
                            <tr key={assignment.id} className="border-b border-dashed">
                              <td className="py-2">{assignment.date ? format(new Date(assignment.date), "MMM d, yyyy") : 'Unknown date'}</td>
                              <td className="py-2">{assignment.venueName || 'Unknown venue'}</td>
                              <td className="py-2 text-right">${assignment.fee || assignment.actualFee || 0}</td>
                            </tr>
                          ))}
                          <tr className="font-medium">
                            <td colSpan={2} className="py-2 text-right">Total:</td>
                            <td className="py-2 text-right">${totalFee}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
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