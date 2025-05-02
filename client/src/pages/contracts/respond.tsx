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

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  const [signature, setSignature] = useState("");
  const [responseSuccess, setResponseSuccess] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);

  const { 
    data: contractData, 
    isLoading, 
    error,
    isError
  } = useQuery<ContractResponse>({
    queryKey: [`/api/contracts/token/${token}`],
  });

  const respondMutation = useMutation({
    mutationFn: async ({ status, response, signature }: { status: string; response: string; signature?: string }) => {
      const res = await apiRequest(
        `/api/contracts/token/${token}/respond`,
        "POST", 
        { status, response, signature }
      );
      return res;
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

  const handleAccept = () => {
    if (!signature.trim()) {
      toast({
        title: "Signature required",
        description: "Please add your signature to accept the contract.",
        variant: "destructive"
      });
      return;
    }
    
    respondMutation.mutate({ 
      status: "accepted", 
      response: responseMessage,
      signature: signature
    });
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
    const isAccepted = contractData?.contract.status === "accepted" || respondMutation.data?.contract?.status === "accepted";
    
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

  const { contract, event, musician } = contractData;
  const isExpired = new Date() > new Date(contract.expiresAt);

  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  
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
          <div className="p-6 border rounded-md bg-white">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Performance Contract</h2>
              <p className="text-sm text-muted-foreground">Reference: #{contract.id}</p>
            </div>
            
            <p className="mb-6">
              This agreement is made and entered into on {format(new Date(contract.createdAt), "MMMM d, yyyy")} between:
            </p>
            
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="font-bold mb-2">Client</h3>
                <p>VAMP Musician Management</p>
                <p>123 Music Street</p>
                <p>Musicville, NY 10001</p>
                <p>contact@vamp.com</p>
              </div>
              <div>
                <h3 className="font-bold mb-2">Musician</h3>
                <p>{musician.name}</p>
                <p>{musician.email}</p>
              </div>
            </div>
            
            <h3 className="font-bold mb-2">Event Details</h3>
            <p className="mb-1"><strong>Event Name:</strong> {event.name}</p>
            <p className="mb-1"><strong>Location:</strong> Venue #{event.venueId}</p>
            {contract.eventDate && (
              <p className="mb-1"><strong>Performance Date:</strong> {format(new Date(contract.eventDate), "MMMM d, yyyy")}</p>
            )}
            <p className="mb-4"><strong>Performance Fee:</strong> ${contract.amount?.toFixed(2) || "TBD"}</p>
            
            <h3 className="font-bold mb-2">Terms & Conditions</h3>
            <ol className="list-decimal pl-5 space-y-2 mb-6">
              <li>The Musician agrees to perform at the Event as specified in this contract.</li>
              <li>The Musician will arrive at least 1 hour before the scheduled performance time for setup.</li>
              <li>The Client agrees to pay the Performance Fee as listed in this contract.</li>
              <li>Cancellation by either party must be communicated at least 7 days before the event date.</li>
              <li>This contract constitutes the entire agreement between the parties.</li>
            </ol>

            <div className="flex justify-between mt-8">
              <div>
                <h3 className="font-bold mb-2">Client Signature</h3>
                {contract.adminSignature ? (
                  <div className="italic text-lg font-medium mb-1 text-primary">{contract.adminSignature}</div>
                ) : (
                  <div className="h-12 border-b border-dashed border-gray-300 w-48 mb-1"></div>
                )}
                <p>VAMP Management</p>
              </div>
              <div>
                <h3 className="font-bold mb-2">Musician Signature</h3>
                {contract.musicianSignature ? (
                  <div className="italic text-lg font-medium mb-1 text-primary">{contract.musicianSignature}</div>
                ) : (
                  <div className="h-12 border-b border-dashed border-gray-300 w-48 mb-1"></div>
                )}
                <p>{musician.name}</p>
              </div>
            </div>
          </div>
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
                    placeholder="Type your full name as signature"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    By typing your name above, you agree this constitutes your electronic signature.
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