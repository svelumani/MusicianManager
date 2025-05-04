import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, Check, X, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

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

interface MusicianAssignment {
  id: number;
  date: string;
  venueName: string;
  venueId: number;
  fee: number;
  startTime: string;
  endTime: string;
  status: string;
}

interface MusicianData {
  musicianId: number;
  musicianName: string;
  email?: string;
  phone?: string;
  assignments: MusicianAssignment[];
  totalFee: number;
  selected?: boolean; // Added for UI selection
}

interface SimplifiedContractSenderProps {
  plannerId: number;
  plannerName: string;
  plannerMonth: string;
  open: boolean;
  onClose: () => void;
}

const SimplifiedContractSender = ({
  plannerId,
  plannerName,
  plannerMonth,
  open,
  onClose,
}: SimplifiedContractSenderProps) => {
  const toast = useToast();
  const queryClient = useQueryClient();

  // State for email message and template selection
  const [emailMessage, setEmailMessage] = useState("");
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState("");
  const [contractTemplateId, setContractTemplateId] = useState("");
  
  // State for musician selection
  const [selectedMusicians, setSelectedMusicians] = useState<{[key: string]: boolean}>({});
  const [selectAll, setSelectAll] = useState(false);
  
  // State for confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // State for loading indicators
  const [step, setStep] = useState<"loading" | "musicians" | "confirmation" | "sending" | "complete">("loading");
  
  // Get musician data from our new endpoint
  const {
    data: musicianResponse,
    isLoading: isLoadingMusicians,
    error: musicianError,
  } = useQuery({
    queryKey: ['/api/planner-musicians', plannerId],
    queryFn: async () => {
      console.log(`Fetching musician data for planner ID: ${plannerId}`);
      
      if (!plannerId || isNaN(plannerId)) {
        throw new Error("Invalid planner ID");
      }
      
      const response = await apiRequest(`/api/planner-musicians/${plannerId}`);
      
      console.log("Musician response received:", response);
      return response;
    },
    enabled: open && !!plannerId && !isNaN(plannerId),
    retry: 1
  });
  
  // Extract musician data
  const musicians = React.useMemo(() => {
    if (!musicianResponse?.success || !musicianResponse?.musicians) {
      return [];
    }
    
    return Object.values(musicianResponse.musicians) as MusicianData[];
  }, [musicianResponse]);
  
  // Query to get all email templates
  const {
    data: emailTemplates = [] as EmailTemplate[],
    isLoading: isLoadingTemplates,
  } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/email-templates'],
    enabled: open,
  });
  
  // Query to get all contract templates (specifically monthly ones)
  const {
    data: contractTemplates = [] as ContractTemplate[],
    isLoading: isLoadingContractTemplates,
  } = useQuery<ContractTemplate[]>({
    queryKey: ['/api/contract-templates'],
    enabled: open,
  });
  
  // Find default template IDs
  const defaultContractTemplate = React.useMemo(() => {
    if (contractTemplates && contractTemplates.length > 0) {
      const monthlyTemplates = contractTemplates.filter(t => t.isMonthly);
      return monthlyTemplates.length > 0 ? monthlyTemplates[0].id.toString() : "";
    }
    return "";
  }, [contractTemplates]);
  
  const defaultEmailTemplate = React.useMemo(() => {
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
  
  // Get a specific email template by ID
  const {
    data: selectedEmailTemplate,
    isLoading: isLoadingSelectedTemplate,
  } = useQuery({
    queryKey: ['/api/email-templates', selectedEmailTemplateId],
    queryFn: () => apiRequest(`/api/email-templates/${selectedEmailTemplateId}`),
    enabled: !!selectedEmailTemplateId && selectedEmailTemplateId !== "",
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
  
  // Set default template IDs on load
  useEffect(() => {
    if (defaultEmailTemplate && !selectedEmailTemplateId && open) {
      setSelectedEmailTemplateId(defaultEmailTemplate);
    }
    
    if (defaultContractTemplate && !contractTemplateId && open) {
      setContractTemplateId(defaultContractTemplate);
    }
    
    // Initialize step
    if (open) {
      setStep("loading");
      
      // Set step to musicians once data is loaded
      if (musicians.length > 0 && !isLoadingMusicians) {
        setStep("musicians");
      }
    }
  }, [defaultEmailTemplate, defaultContractTemplate, selectedEmailTemplateId, contractTemplateId, open, musicians, isLoadingMusicians]);
  
  // Update step when musician data loads
  useEffect(() => {
    if (open && musicians.length > 0 && !isLoadingMusicians) {
      setStep("musicians");
    }
  }, [musicians, isLoadingMusicians, open]);
  
  // Handle musician selection toggle
  const toggleMusicianSelection = (musicianId: number) => {
    setSelectedMusicians(prev => ({
      ...prev,
      [musicianId]: !prev[musicianId]
    }));
  };
  
  // Handle select all toggle
  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    // Update all musicians to match the selectAll state
    const newSelection = {};
    musicians.forEach(musician => {
      newSelection[musician.musicianId] = newSelectAll;
    });
    setSelectedMusicians(newSelection);
  };
  
  // Count selected musicians
  const selectedCount = Object.values(selectedMusicians).filter(Boolean).length;
  
  // Mutation for sending contracts
  const sendContractsMutation = useMutation({
    mutationFn: async (data: {
      emailMessage: string;
      contractTemplateId: string;
      emailTemplateId: string;
      musicians: number[];
    }) => {
      return apiRequest(`/api/planner-contracts/${plannerId}`, "POST", data);
    },
    onMutate: () => {
      setStep("sending");
    },
    onSuccess: (response) => {
      console.log("Contracts sent successfully:", response);
      
      // Always treat as success with warning for SendGrid - regardless of response
      if (response?.success && response?.sent > 0) {
        // Show warning toast about SendGrid
        toast({
          title: "Contracts Created",
          description: `Created ${response?.sent || 0} contracts, but emails could not be sent. SendGrid is not configured. Go to Settings to set up email.`,
          variant: "warning",
          duration: 6000,
        });
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/planners'] });
        queryClient.invalidateQueries({ queryKey: ['/api/monthly-contracts'] });
        
        // Force to complete state - this is critical
        setStep("complete");
        
        // Close after a delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        // Handle case where nothing was sent
        toast({
          title: "Warning",
          description: "No contracts were sent. Please check your selection and try again.",
          variant: "warning"
        });
        // Return to musician selection step
        setStep("musicians");
      }
    },
    onError: (error: any) => {
      console.error("Error sending contracts:", error);
      
      // Check if error contains SendGrid configuration message
      const errorMessage = error.message || "Failed to send contracts. Please try again.";
      const isSendGridError = errorMessage.includes("SendGrid") || 
                             error.details?.includes("SendGrid") || 
                             error.error?.includes("SendGrid");
      
      // Show error toast
      toast({
        title: isSendGridError ? "Email Configuration Error" : "Error",
        description: isSendGridError ? 
          "Email service (SendGrid) is not properly configured. Contracts were created but emails could not be sent. Go to Settings to set up email." : 
          errorMessage,
        variant: "destructive",
        duration: isSendGridError ? 6000 : 3000,
      });
      
      // Return to musician selection step
      setStep("musicians");
    }
  });
  
  // Handle finalize button click
  const handlePrepareFinalize = () => {
    // Validate we have musicians selected
    if (selectedCount === 0) {
      toast({
        title: "No musicians selected",
        description: "Please select at least one musician to send contracts to.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate email template
    if (!selectedEmailTemplateId) {
      toast({
        title: "Email template required",
        description: "Please select an email template.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate contract template
    if (!contractTemplateId) {
      toast({
        title: "Contract template required",
        description: "Please select a contract template.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate email message
    if (!emailMessage || emailMessage.trim() === "") {
      toast({
        title: "Email message required",
        description: "Please enter an email message.",
        variant: "destructive"
      });
      return;
    }
    
    // Check for musicians without email addresses
    const noEmailMusicians = musicians.filter(m => 
      selectedMusicians[m.musicianId] && (!m.email || m.email.trim() === "")
    );
    
    if (noEmailMusicians.length > 0) {
      const names = noEmailMusicians.map(m => m.musicianName).join(", ");
      toast({
        title: "Missing email addresses",
        description: `These musicians don't have email addresses: ${names}. They will be skipped.`,
        variant: "default"
      });
    }
    
    // Show confirmation dialog
    setShowConfirmation(true);
  };
  
  // Handle confirm finalize button click
  const handleConfirmFinalize = () => {
    // Get selected musician IDs
    const selectedMusicianIds = Object.entries(selectedMusicians)
      .filter(([_, selected]) => selected)
      .map(([id, _]) => parseInt(id));
    
    // Send the contracts
    sendContractsMutation.mutate({
      emailMessage,
      contractTemplateId,
      emailTemplateId: selectedEmailTemplateId,
      musicians: selectedMusicianIds
    });
    
    // Close confirmation dialog
    setShowConfirmation(false);
  };
  
  // Handle cancel confirmation button click
  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };
  
  // If we have an error loading musicians
  if (musicianError && step === "loading") {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Finalize Monthly Planner - {plannerName}</DialogTitle>
            <DialogDescription>
              Error loading musician data
            </DialogDescription>
          </DialogHeader>
          
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Could not load musician data for this planner. Please try again later.
              <br />
              {musicianResponse?.message || (musicianError as Error)?.message}
            </AlertDescription>
          </Alert>
          
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  // If we have no musicians
  if (musicians.length === 0 && !isLoadingMusicians && step !== "loading") {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Finalize Monthly Planner - {plannerName}</DialogTitle>
            <DialogDescription>
              No musicians with assignments found
            </DialogDescription>
          </DialogHeader>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No Musicians Found</AlertTitle>
            <AlertDescription>
              No musicians with assignments were found for this planner.
              Please add musician assignments to slots before finalizing.
            </AlertDescription>
          </Alert>
          
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Finalize Monthly Planner - {plannerName}</DialogTitle>
          <DialogDescription>
            Review and send consolidated assignments to musicians.
          </DialogDescription>
        </DialogHeader>
        
        {/* Loading state */}
        {(isLoadingMusicians || step === "loading") && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p className="text-lg">Loading musician data...</p>
          </div>
        )}
        
        {/* Error state from response */}
        {musicianResponse && !musicianResponse.success && (
          <Alert variant="destructive" className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {musicianResponse.message || "Could not load musician data for this planner."}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Musicians step */}
        {step === "musicians" && musicians.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-6">
              {/* Musician selection table */}
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          checked={selectAll} 
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Musician</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Assignments</TableHead>
                      <TableHead className="text-right">Total Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {musicians.map((musician) => (
                      <TableRow key={musician.musicianId}>
                        <TableCell>
                          <Checkbox 
                            checked={!!selectedMusicians[musician.musicianId]}
                            onCheckedChange={() => toggleMusicianSelection(musician.musicianId)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{musician.musicianName}</TableCell>
                        <TableCell>
                          {musician.email || (
                            <span className="text-destructive text-sm">No email</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{musician.assignments.length}</TableCell>
                        <TableCell className="text-right">${musician.totalFee}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Email settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Email Settings</h3>
                
                {/* SendGrid warning */}
                <Alert className="mb-4 bg-amber-50 text-amber-800 border-amber-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Email Configuration Notice</AlertTitle>
                  <AlertDescription>
                    SendGrid is not configured yet. Contracts will be created but emails will not be sent to musicians. 
                    Setup SendGrid in Settings to enable email sending.
                  </AlertDescription>
                </Alert>
                
                {/* Contract template selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contract Template</label>
                  <Select
                    value={contractTemplateId}
                    onValueChange={setContractTemplateId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTemplates
                        .filter(template => template.isMonthly)
                        .map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            {template.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Email template selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Template</label>
                  <Select
                    value={selectedEmailTemplateId}
                    onValueChange={setSelectedEmailTemplateId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Email message */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Message</label>
                  <Textarea 
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={5}
                    placeholder="Enter email message to be sent to musicians"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                onClick={handlePrepareFinalize}
                disabled={selectedCount === 0}
              >
                Finalize & Send ({selectedCount})
              </Button>
            </DialogFooter>
          </>
        )}
        
        {/* Sending state */}
        {step === "sending" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mb-4" />
            <p className="text-lg">Sending contracts to musicians...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a moment. Please do not close this window.
            </p>
          </div>
        )}
        
        {/* Complete state */}
        {step === "complete" && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-lg font-medium">Contracts created successfully!</p>
            <div className="bg-amber-50 text-amber-800 border-amber-200 p-4 rounded-md mt-4 max-w-md mx-auto">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Email Delivery Notice</p>
                  <p className="text-sm mt-1">
                    Contracts were created in the system, but emails could not be sent to musicians because SendGrid is not configured.
                    To enable email sending, please set up your SendGrid API key in Settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
      
      {/* Confirmation dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Send Contracts</DialogTitle>
            <DialogDescription>
              You are about to send contracts to {selectedCount} musicians. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p>Planner: <span className="font-medium">{plannerName}</span></p>
            <p>Month: <span className="font-medium">{plannerMonth}</span></p>
            <p>Musicians: <span className="font-medium">{selectedCount}</span></p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelConfirmation}>
              Cancel
            </Button>
            <Button onClick={handleConfirmFinalize}>
              Confirm & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default SimplifiedContractSender;