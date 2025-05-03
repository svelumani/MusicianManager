import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  User, 
  DollarSign, 
  Clock, 
  Loader2,
  XCircle,
  FileSignature
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/StatusBadge";
import StatusHistory from "@/components/StatusHistory";
import { useEntityStatus } from "@/hooks/use-status";
import { useToast } from "@/hooks/use-toast";

export default function ContractDetailPage() {
  const [, params] = useRoute("/contracts/:id");
  const [, navigate] = useLocation();
  const contractId = parseInt(params?.id || "0");
  const { toast } = useToast();
  
  const { data: contract, isLoading, error } = useQuery({
    queryKey: ["/api/contracts", contractId],
    queryFn: async () => {
      const response = await fetch(`/api/contracts/${contractId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch contract");
      }
      return response.json();
    },
    enabled: !!contractId
  });
  
  const { data: musician } = useQuery({
    queryKey: ["/api/musicians", contract?.musicianId],
    queryFn: async () => {
      const response = await fetch(`/api/musicians/${contract?.musicianId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch musician");
      }
      return response.json();
    },
    enabled: !!contract?.musicianId
  });
  
  const { data: event } = useQuery({
    queryKey: ["/api/events", contract?.eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${contract?.eventId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch event");
      }
      return response.json();
    },
    enabled: !!contract?.eventId
  });
  
  // Use the status hooks
  const { data: contractStatus } = useEntityStatus('contract', contractId);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error || !contract) {
    return (
      <div className="space-y-4">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate("/contracts")} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-60">
            <XCircle className="h-10 w-10 text-red-500 mb-4" />
            <h3 className="text-lg font-medium">Contract Not Found</h3>
            <p className="text-muted-foreground mb-4">The contract you are looking for does not exist or has been removed.</p>
            <Button onClick={() => navigate("/contracts")}>
              Return to Contracts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Button variant="ghost" onClick={() => navigate("/contracts")} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Contract #{contract.id}</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileSignature className="h-5 w-5 mr-2" /> Contract Details
              </CardTitle>
              <CardDescription>View and manage contract information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center text-muted-foreground text-sm">
                    <User className="h-4 w-4 mr-2" /> Musician
                  </div>
                  <div className="font-medium">
                    {musician ? musician.name : "Loading..."}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-muted-foreground text-sm">
                    <Calendar className="h-4 w-4 mr-2" /> Event
                  </div>
                  <div className="font-medium">
                    {event ? event.name : "Loading..."}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-muted-foreground text-sm">
                    <Calendar className="h-4 w-4 mr-2" /> Event Date
                  </div>
                  <div className="font-medium">
                    {contract.eventDate 
                      ? format(new Date(contract.eventDate), "MMMM d, yyyy") 
                      : "Not specified"}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-muted-foreground text-sm">
                    <DollarSign className="h-4 w-4 mr-2" /> Payment Amount
                  </div>
                  <div className="font-medium">
                    {contract.amount 
                      ? `$${contract.amount.toFixed(2)}` 
                      : "Not specified"}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-muted-foreground text-sm">
                    <Clock className="h-4 w-4 mr-2" /> Created
                  </div>
                  <div className="font-medium">
                    {format(new Date(contract.createdAt), "MMMM d, yyyy")}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-muted-foreground text-sm">
                    <FileText className="h-4 w-4 mr-2" /> Status
                  </div>
                  <div>
                    <StatusBadge 
                      status={contract.status} 
                      entityType="contract" 
                      timestamp={contract.updatedAt}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Contract Terms</h3>
                <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                  {contract.terms || "No specific terms provided."}
                </div>
              </div>
              
              <Separator />
              <div>
                <h3 className="font-medium mb-2">Signatures</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border rounded-md p-4">
                    <h4 className="text-sm font-medium mb-1">Company</h4>
                    <div className="font-medium italic text-primary">
                      {contract.companySignature || "VAMP Management"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Signed on {format(new Date(contract.companySignedAt || contract.createdAt), "MMMM d, yyyy")}
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h4 className="text-sm font-medium mb-1">Musician</h4>
                    {contract.signature ? (
                      <>
                        <div className="font-medium italic text-primary">
                          {contract.signature}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Signed on {format(new Date(contract.signedAt || contract.updatedAt), "MMMM d, yyyy")}
                        </div>
                        
                        {/* Display IP address and additional metadata if available */}
                        {contractStatus?.metadata?.ipAddress && (
                          <div className="text-xs text-muted-foreground mt-1">
                            IP Address: {contractStatus.metadata.ipAddress}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground italic">
                        Not yet signed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            {/* Footer content removed */}
          </Card>
          
          {/* Contract Content */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white border rounded-md p-6 shadow-sm">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold">MUSIC PERFORMANCE AGREEMENT</h2>
                  <p className="text-sm text-muted-foreground">Contract #{contract.id}</p>
                </div>
                
                <div className="space-y-4">
                  <p>
                    <strong>This agreement</strong> is made on {format(new Date(contract.createdAt), "MMMM d, yyyy")} 
                    between {event?.name || "Event Organizer"} ("Client") and {musician?.name || "Musician"} ("Performer").
                  </p>
                  
                  <div>
                    <h3 className="font-medium">1. ENGAGEMENT</h3>
                    <p>Client engages Performer to provide musical entertainment services at:</p>
                    <p className="mt-2 pl-4">
                      <strong>Event:</strong> {event?.name || "Loading..."}<br />
                      <strong>Date:</strong> {contract.eventDate ? format(new Date(contract.eventDate), "MMMM d, yyyy") : "TBD"}<br />
                      <strong>Location:</strong> {event?.location || "To be determined"}<br />
                      <strong>Performance Time:</strong> {contract.startTime || "TBD"} to {contract.endTime || "TBD"}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">2. COMPENSATION</h3>
                    <p>Client agrees to pay Performer the sum of ${contract.amount?.toFixed(2) || "0.00"} 
                    for the performance described above.</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">3. TERMS & CONDITIONS</h3>
                    <div className="whitespace-pre-wrap pl-4">
                      {contract.terms || "Standard terms and conditions apply."}
                    </div>
                  </div>
                  
                  <div className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium mb-2">CLIENT:</p>
                        <div className="border-b h-8 mb-2 flex items-end">
                          <span className="font-medium italic text-primary">
                            {contract.companySignature || "VAMP Management"}
                          </span>
                        </div>
                        <p className="text-sm">
                          Date: {contract.companySignedAt ? format(new Date(contract.companySignedAt), "MM/dd/yyyy") : format(new Date(contract.createdAt), "MM/dd/yyyy")}
                        </p>
                      </div>
                      
                      <div>
                        <p className="font-medium mb-2">PERFORMER:</p>
                        {contract.signature ? (
                          <div className="border-b h-8 mb-2 flex items-end">
                            <span className="font-medium italic text-primary">{contract.signature}</span>
                          </div>
                        ) : (
                          <div className="border-b border-dashed h-8 mb-2"></div>
                        )}
                        <p className="text-sm">
                          Date: {contract.signedAt ? format(new Date(contract.signedAt), "MM/dd/yyyy") : "________________"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Status History */}
        <div className="space-y-4">
          <StatusHistory 
            entityType="contract"
            entityId={contractId}
            eventId={contract.eventId}
          />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Related Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/events/${contract.eventId}`)}
                className="w-full justify-start"
              >
                <Calendar className="h-4 w-4 mr-2" />
                View Event Details
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => navigate(`/musicians/${contract.musicianId}`)}
                className="w-full justify-start"
              >
                <User className="h-4 w-4 mr-2" />
                View Musician Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}