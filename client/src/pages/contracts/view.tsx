import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { 
  User,
  CalendarDays,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Copy,
  ExternalLink
} from "lucide-react";
import FileContract from "@/components/icons/FileContract";
import ContractContentPreview from "@/components/ContractContentPreview";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import type { ContractLink, Event, Musician } from "@shared/schema";

// Helper function to get contract status badge
const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
    accepted: { color: "bg-green-100 text-green-800", label: "Accepted" },
    "contract-signed": { color: "bg-green-100 text-green-800", label: "Accepted" },
    rejected: { color: "bg-red-100 text-red-800", label: "Rejected" },
    expired: { color: "bg-gray-100 text-gray-800", label: "Expired" }
  };

  const { color, label } = statusMap[status] || { color: "bg-gray-100 text-gray-800", label: status };
  
  return (
    <Badge className={`${color} capitalize`}>
      {label}
    </Badge>
  );
};

export default function ContractViewPage() {
  const [location, navigate] = useLocation();
  const params = { id: location.split("/")[2] || "" };
  const contractId = parseInt(params.id);
  const { toast } = useToast();
  const [shareURL, setShareURL] = useState("");

  const { data: contract, isLoading: isLoadingContract } = useQuery<ContractLink>({
    queryKey: [`/api/contracts/${contractId}`],
  });

  const { data: musician } = useQuery<Musician>({
    queryKey: [`/api/musicians/${contract?.musicianId}`],
    enabled: !!contract?.musicianId
  });

  const { data: event } = useQuery<Event>({
    queryKey: [`/api/events/${contract?.eventId}`],
    enabled: !!contract?.eventId
  });

  useEffect(() => {
    if (contract?.token) {
      const protocol = window.location.protocol;
      const host = window.location.host;
      setShareURL(`${protocol}//${host}/contracts/respond/${contract.token}`);
    }
  }, [contract]);

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareURL).then(
      () => {
        toast({
          title: "Link copied",
          description: "The contract response link has been copied to clipboard"
        });
      },
      (err) => {
        console.error("Could not copy link: ", err);
        toast({
          title: "Copy failed",
          description: "Could not copy link to clipboard. Try selecting and copying manually.",
          variant: "destructive",
        });
      }
    );
  };

  if (isLoadingContract) {
    return (
      <div className="space-y-4">
        <div className="flex items-center">
          <Skeleton className="h-8 w-8 mr-2" />
          <Skeleton className="h-8 w-64" />
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
    );
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-semibold mb-2">Contract Not Found</h2>
        <p className="text-gray-500 mb-4">The contract you're looking for doesn't exist.</p>
        <Button onClick={() => navigate("/contracts")}>Return to Contracts</Button>
      </div>
    );
  }

  const isExpired = new Date() > new Date(contract.expiresAt);
  const hasResponse = !!contract.respondedAt;
  const contractStatus = isExpired && !hasResponse ? "expired" : contract.status;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          className="mr-2" 
          onClick={() => navigate("/contracts")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Contract #{contract.id}</h1>
        <div className="ml-auto">
          {getStatusBadge(contractStatus)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Contract Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="mt-1">{getStatusBadge(contractStatus)}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground">Event</dt>
                <dd className="mt-1 font-medium">{event?.name || "Loading event..."}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground">Musician</dt>
                <dd className="mt-1 flex items-center">
                  {musician?.profileImage ? (
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
                  {musician?.name || "Loading musician..."}
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

              <div>
                  <dt className="text-sm font-medium text-muted-foreground">Payment Amount</dt>
                  <dd className="mt-1 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                    {contract.amount 
                      ? `$${contract.amount.toFixed(2)}` 
                      : "Not specified"}
                  </dd>
                </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                <dd className="mt-1 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  {format(new Date(contract.createdAt), "MMMM d, yyyy")}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-muted-foreground">Expires</dt>
                <dd className="mt-1 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  {format(new Date(contract.expiresAt), "MMMM d, yyyy")}
                  {isExpired && !hasResponse && (
                    <Badge variant="destructive" className="ml-2">Expired</Badge>
                  )}
                </dd>
              </div>

              {contract.respondedAt && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Responded</dt>
                  <dd className="mt-1 flex items-center">
                    {contract.status === "accepted" || contract.status === "contract-signed" ? (
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2 text-red-500" />
                    )}
                    {format(new Date(contract.respondedAt), "MMMM d, yyyy")}
                  </dd>
                </div>
              )}

              {contract.response && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Response Message</dt>
                  <dd className="mt-1 p-3 bg-gray-50 rounded-md text-sm">
                    {contract.response}
                  </dd>
                </div>
              )}
              
              {(contract.status === 'accepted' || contract.status === 'contract-signed') && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Signatures</dt>
                  <dd className="mt-2 grid grid-cols-2 gap-4">
                    <div className="border rounded-md p-3">
                      <p className="text-xs text-muted-foreground mb-1">Company</p>
                      <div className="h-12 flex items-center justify-center border-b border-dashed">
                        <p className="font-medium italic text-primary">{contract.companySignature || "VAMP Management"}</p>
                      </div>
                    </div>
                    <div className="border rounded-md p-3">
                      <p className="text-xs text-muted-foreground mb-1">Musician</p>
                      <div className="h-12 flex items-center justify-center border-b border-dashed">
                        <p className="font-medium italic text-primary">{contract.musicianSignature || musician?.name}</p>
                      </div>
                    </div>
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Contract Response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contract.status === "pending" && !isExpired ? (
              <>
                <p className="text-sm">
                  Share this contract with the musician to allow them to view the contract details and respond with their decision.
                </p>
                <div className="flex items-center mt-2">
                  <div className="flex-grow relative">
                    <Input 
                      value={shareURL}
                      readOnly
                      className="pr-20"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute right-1 top-1"
                      onClick={handleCopyShareLink}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => window.open(shareURL, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Response Page
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                {contract.status === "accepted" || contract.status === "contract-signed" ? (
                  <>
                    <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-medium">Contract Accepted</h3>
                    <p className="text-muted-foreground max-w-sm mt-1">
                      {musician?.name} has accepted this contract on {contract.respondedAt ? format(new Date(contract.respondedAt), "MMMM d, yyyy") : ""}
                    </p>
                  </>
                ) : contract.status === "rejected" ? (
                  <>
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                      <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-medium">Contract Rejected</h3>
                    <p className="text-muted-foreground max-w-sm mt-1">
                      {musician?.name} has declined this contract on {contract.respondedAt ? format(new Date(contract.respondedAt), "MMMM d, yyyy") : ""}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <Clock className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium">Contract Expired</h3>
                    <p className="text-muted-foreground max-w-sm mt-1">
                      This contract has expired without a response from the musician.
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Contract Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <ContractContentPreview contractId={contractId} />
        </CardContent>
        <CardFooter className="justify-end">
          <Button 
            variant="outline" 
            onClick={() => navigate("/contracts")}
          >
            Back to Contracts
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// Contract Content Preview Component
// The ContractContentPreview component is now imported from @/components/ContractContentPreview