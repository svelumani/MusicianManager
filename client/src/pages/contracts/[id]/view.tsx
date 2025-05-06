import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, ArrowLeft, Calendar, User, DollarSign, Building, Phone, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function ContractViewPage() {
  const [, params] = useRoute("/contracts/:id/view");
  const [, navigate] = useLocation();
  const contractId = parseInt(params?.id || "0");
  
  const { data: contract, isLoading: contractLoading, error: contractError } = useQuery({
    queryKey: ["/api/v2/contracts", contractId],
    queryFn: async () => {
      // Use the direct API endpoint to bypass middleware issues
      console.log(`Fetching contract with ID: ${contractId}`);
      const timestamp = Date.now(); // Add cache-busting parameter
      const response = await fetch(`/api/v2/contracts/${contractId}?t=${timestamp}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching contract ${contractId}:`, errorText);
        throw new Error(`Failed to fetch contract: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`Contract data:`, data);
      return data;
    },
    enabled: !!contractId
  });
  
  const { data: musician, isLoading: musicianLoading } = useQuery({
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
  
  const { data: event, isLoading: eventLoading } = useQuery({
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

  const isLoading = contractLoading || musicianLoading || eventLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (contractError || !contract) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(`/contracts/${contractId}`)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Contract
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Contract Not Found</h2>
            <p className="text-muted-foreground mb-6">The contract you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate("/contracts")}>
              Return to Contracts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(`/contracts/${contractId}`)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Contract
        </Button>
        <h1 className="text-3xl font-bold">Performance Contract</h1>
        <p className="text-muted-foreground">Contract #{contract.id} • {contract.eventDate ? format(new Date(contract.eventDate), "MMMM d, yyyy") : "No date specified"}</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
          <CardDescription>Basic information about this performance contract</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Event</h3>
              <p className="text-lg font-medium">{event?.name || "Unknown Event"}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Date</h3>
              <p className="text-lg font-medium">
                {contract.eventDate 
                  ? format(new Date(contract.eventDate), "MMMM d, yyyy") 
                  : "Not specified"}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
              <p className="text-lg font-medium">{event?.venueName || "TBD"}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Payment</h3>
              <p className="text-lg font-medium">
                ${contract.amount ? contract.amount.toFixed(2) : "0.00"}
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Musician</h3>
              <div className="mt-2">
                <div className="font-medium">{musician?.name}</div>
                <div className="text-sm text-muted-foreground flex items-center mt-1">
                  <Mail className="h-3 w-3 mr-2" />
                  {musician?.email}
                </div>
                <div className="text-sm text-muted-foreground flex items-center mt-1">
                  <Phone className="h-3 w-3 mr-2" />
                  {musician?.phone || "No phone provided"}
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Company</h3>
              <div className="mt-2">
                <div className="font-medium">VAMP Music Management</div>
                <div className="text-sm text-muted-foreground flex items-center mt-1">
                  <Mail className="h-3 w-3 mr-2" />
                  contact@vampmusic.com
                </div>
                <div className="text-sm text-muted-foreground flex items-center mt-1">
                  <Building className="h-3 w-3 mr-2" />
                  123 Music Avenue, Suite 101
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contract Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <h3>1. Performance Details</h3>
            <p>
              The Musician agrees to perform at the Event detailed above. The Musician shall arrive
              at the venue at least 60 minutes prior to the scheduled performance time for setup and sound check.
            </p>
            
            <h3>2. Compensation</h3>
            <p>
              The Company agrees to pay the Musician the amount of ${contract.amount ? contract.amount.toFixed(2) : "0.00"} 
              for the performance. Payment will be made within 14 days of the performance date, provided that 
              the Musician fulfills all obligations under this contract.
            </p>
            
            <h3>3. Cancellation</h3>
            <p>
              If the Event is cancelled by the Company with less than 7 days notice, the Musician shall 
              be entitled to 50% of the agreed fee. If cancelled with less than 48 hours notice, the 
              Musician shall be entitled to the full fee unless the cancellation is due to circumstances 
              beyond reasonable control.
            </p>
            
            <h3>4. Equipment</h3>
            <p>
              The Musician shall provide their own instruments. The Company will provide a suitable 
              performance area, basic sound equipment, and power supply unless otherwise agreed.
            </p>
            
            <h3>5. Recording & Photography</h3>
            <p>
              The Company reserves the right to record and photograph the performance for promotional 
              purposes only. Any commercial use requires separate agreement.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Signatures</CardTitle>
          <CardDescription>Contract authentication</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">For the Company</h3>
              <div className="border rounded-md p-4 mt-2">
                <p className="font-medium italic text-primary">
                  {contract.companySignature || "VAMP Management"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Signed on {format(new Date(), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Musician</h3>
              <div className="border rounded-md p-4 mt-2">
                {contract.musicianSignature ? (
                  <>
                    <p className="font-medium italic text-primary">
                      {contract.musicianSignature}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Signed on {contract.respondedAt ? format(new Date(contract.respondedAt), "MMMM d, yyyy") : format(new Date(), "MMMM d, yyyy")}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {contract.status === "accepted" ? "Accepted but not signed" : "Not yet signed"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={() => window.print()} className="mr-2">
          <FileText className="h-4 w-4 mr-2" /> Print Contract
        </Button>
        <Button onClick={() => navigate(`/contracts/${contractId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Details
        </Button>
      </div>
    </div>
  );
}