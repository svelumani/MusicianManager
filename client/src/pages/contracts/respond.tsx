import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { 
  User,
  CalendarDays,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle
} from "lucide-react";
import FileContract from "@/components/icons/FileContract";
import ContractContentPreview from "@/components/ContractContentPreview";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ContractResponse {
  contract: {
    id: number;
    token: string;
    bookingId: number | null;
    eventId: number;
    musicianId: number;
    status: string;
    createdAt: string;
    expiresAt: string;
    respondedAt: string | null;
    response: string | null;
    amount: number | null;
    eventDate: string | null;
    musicianSignature: string | null;
    companySignature: string | null;
  };
  event: {
    id: number;
    name: string;
    venueId: number;
    // other event fields
  };
  musician: {
    id: number;
    name: string;
    email: string;
    profileImage: string | null;
    // other musician fields
  };
}

export default function ContractResponsePage() {
  const [location, navigate] = useLocation();
  const params = { token: location.split("/").pop() || "" };
  const token = params.token;
  const { toast } = useToast();
  const [responseMessage, setResponseMessage] = useState("");
  const [signature, setSignature] = useState("SV"); // Default initials placeholder
  const [responseSuccess, setResponseSuccess] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);

  const { 
    data: contractData, 
    isLoading, 
    error,
    isError,
    refetch
  } = useQuery<ContractResponse>({
    queryKey: [`/api/v2/contracts/token/${token}`],
    queryFn: async () => {
      console.log(`Fetching contract data with token: ${token}`);
      const timestamp = Date.now(); // Add cache-busting parameter
      const response = await fetch(`/api/v2/contracts/token/${token}?t=${timestamp}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching contract with token ${token}:`, errorText);
        throw new Error(`Failed to fetch contract: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`Contract data:`, data);
      return data;
    },
    enabled: !!token,
    refetchOnWindowFocus: false,
    staleTime: 0 // Don't cache this data
  });

  const respondMutation = useMutation({
    mutationFn: async ({ status, response, signature }: { status: string; response: string; signature?: string }) => {
      // Use our new direct endpoint to avoid middleware issues
      console.log(`Submitting response to contract with token ${token}:`, { status, response, signature });
      
      const res = await fetch(
        `/api/v2/contracts/token/${token}/respond`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status, response, signature })
        }
      );
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Response error:', errorText);
        throw new Error(`Failed to submit response: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Response success:', data);
      return data;
    },
    onSuccess: (data) => {
      setResponseSuccess(true);
      toast({
        title: "Response submitted",
        description: "Your response to the contract has been recorded successfully."
      });
    },
    onError: (error: Error) => {
      setResponseError(error.message || "Failed to submit response. Please try again.");
      toast({
        title: "Error submitting response",
        description: error.message || "There was a problem submitting your response. Please try again.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (isError && error instanceof Error) {
      setResponseError(error.message || "Failed to load contract details. The link might be invalid or expired.");
    }
  }, [isError, error]);

  const handleAccept = async () => {
    if (!signature.trim()) {
      toast({
        title: "Signature required",
        description: "Please add your signature to accept the contract.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      console.log(`Using direct /accept endpoint with signature: ${signature}`);
      
      // Use our dedicated /accept endpoint to avoid potential issues with the general response endpoint
      const res = await fetch(
        `/api/v2/contracts/token/${token}/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            signature: signature,
            response: responseMessage || "Contract accepted"
          })
        }
      );
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Contract acceptance error:', errorText);
        throw new Error(`Failed to accept contract: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Contract acceptance success:', data);
      
      // Manually update contract data to ensure UI shows correct state
      if (contractData) {
        contractData.contract.status = "contract-signed";
        contractData.contract.musicianSignature = signature;
        contractData.contract.respondedAt = new Date().toISOString();
      }
      
      // Update UI to show success
      setResponseSuccess(true);
      toast({
        title: "Contract Accepted",
        description: "Your signature has been recorded and the contract has been accepted."
      });
      
    } catch (error) {
      console.error('Contract acceptance error:', error);
      toast({
        title: "Error accepting contract",
        description: error instanceof Error ? error.message : "There was a problem accepting the contract. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReject = () => {
    respondMutation.mutate({ 
      status: "rejected", 
      response: responseMessage 
    });
  };

  if (isLoading) {
    return (
      <div className="container py-12 max-w-3xl mx-auto">
        <div className="space-y-8">
          <div className="flex items-center justify-center">
            <Skeleton className="h-10 w-64" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (responseError) {
    return (
      <div className="container py-12 max-w-3xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Contract Unavailable</CardTitle>
            <CardDescription className="mt-2">
              {responseError}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => window.close()}>Close Window</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (responseSuccess) {
    // When using handleAccept(), we're always accepting the contract
    // so we should always show the accepted UI
    // The issue was because handleAccept uses direct fetch instead of respondMutation
    // so respondMutation.data.contract.status was undefined
    let isAccepted = 
      contractData?.contract.status === "accepted" || 
      contractData?.contract.status === "contract-signed" ||
      respondMutation.data?.contract?.status === "accepted" || 
      respondMutation.data?.contract?.status === "contract-signed";
      
    // If we used the direct /accept endpoint, we should always show accepted UI
    if (signature && signature.trim()) {
      isAccepted = true;
    }
    
    console.log("Response success UI showing:", { isAccepted, signature });
    
    return (
      <div className="container py-12 max-w-3xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`h-16 w-16 rounded-full ${isAccepted ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center`}>
                {isAccepted ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {isAccepted ? "Contract Accepted" : "Contract Declined"}
            </CardTitle>
            <CardDescription className="mt-2">
              {isAccepted 
                ? "Thank you for accepting the contract. The event organizer will be notified of your decision."
                : "You have declined this contract. The event organizer will be notified of your decision."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => window.close()}>Close Window</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!contractData) {
    return (
      <div className="container py-12 max-w-3xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Contract Not Found</CardTitle>
            <CardDescription className="mt-2">
              The contract you're looking for doesn't exist or has expired.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => window.close()}>Close Window</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Using the shared ContractContentPreview component

  const { contract, event, musician } = contractData;
  const isExpired = new Date() > new Date(contract.expiresAt);
  
  return (
    <div className="container py-12 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center mb-4">
          <FileContract className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Contract Review</h1>
        <p className="text-muted-foreground mt-1">
          Please review and respond to this contract for {event.name}
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Contract Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Event</dt>
              <dd className="mt-1 font-medium">{event.name}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Musician</dt>
              <dd className="mt-1 flex items-center">
                {musician.profileImage ? (
                  <div className="h-6 w-6 rounded-full overflow-hidden mr-2">
                    <img 
                      src={musician.profileImage} 
                      alt={musician.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <User className="h-5 w-5 mr-2 text-muted-foreground" />
                )}
                {musician.name}
              </dd>
            </div>

            {contract.eventDate && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Event Date</dt>
                <dd className="mt-1 flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                  {format(new Date(contract.eventDate), "MMMM d, yyyy")}
                </dd>
              </div>
            )}

            {contract.amount && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Payment Amount</dt>
                <dd className="mt-1 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                  ${contract.amount.toFixed(2)}
                </dd>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-muted-foreground">Expires</dt>
              <dd className="mt-1 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                {format(new Date(contract.expiresAt), "MMMM d, yyyy")}
                {isExpired && (
                  <Badge variant="destructive" className="ml-2">Expired</Badge>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Contract Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <ContractContentPreview token={token} />
        </CardContent>
      </Card>

      {isExpired ? (
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <CardTitle className="text-xl">This Contract Has Expired</CardTitle>
            <CardDescription className="mt-2">
              The response period for this contract has ended. Please contact the event organizer for more information.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => window.close()}>Close Window</Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Your Response</CardTitle>
            <CardDescription>
              Please provide your response to this contract. You can add a message below if needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="Add an optional message with your response..."
              className="min-h-[100px] resize-none"
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
            />
          </CardContent>
          <CardFooter className="justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline Contract
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to decline?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Once you decline this contract, your decision will be recorded and the event organizer will be notified.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleReject}
                    disabled={respondMutation.isPending}
                  >
                    {respondMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : "Yes, Decline"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept Contract
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Contract Acceptance</AlertDialogTitle>
                  <AlertDialogDescription>
                    By accepting this contract, you agree to all the terms and conditions outlined in the document. Your acceptance is legally binding.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="mb-4">
                  <div className="mb-2">
                    <Label htmlFor="signature" className="text-sm font-medium">
                      Your Signature <span className="text-destructive">*</span>
                    </Label>
                  </div>
                  <Input
                    id="signature"
                    placeholder="Type your initials (e.g., SV)"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="w-full text-center text-lg font-medium"
                    maxLength={3}
                    required={true}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    Please enter your initials to sign this contract. By providing your initials, 
                    you agree this constitutes your electronic signature.
                  </p>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleAccept}
                    disabled={respondMutation.isPending || !signature.trim()}
                  >
                    {respondMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : "Sign & Accept"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}