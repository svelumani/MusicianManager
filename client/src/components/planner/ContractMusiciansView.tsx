import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  Send, 
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  ExternalLink
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface ContractMusiciansViewProps {
  contractId: number;
}

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  signed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-amber-100 text-amber-800",
  completed: "bg-purple-100 text-purple-800",
};

const STATUS_ICONS = {
  draft: <Clock className="h-4 w-4 mr-1" />,
  pending: <Clock className="h-4 w-4 mr-1" />,
  sent: <Send className="h-4 w-4 mr-1" />,
  signed: <CheckCircle className="h-4 w-4 mr-1" />,
  rejected: <XCircle className="h-4 w-4 mr-1" />,
  cancelled: <AlertTriangle className="h-4 w-4 mr-1" />,
  completed: <CheckCircle className="h-4 w-4 mr-1" />,
};

export default function ContractMusiciansView({ contractId }: ContractMusiciansViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedMusician, setSelectedMusician] = useState<any>(null);
  
  // Query to get all musicians for this contract
  const {
    data: musicians = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [`/api/monthly-contracts/${contractId}/musicians`],
    enabled: !!contractId
  });

  // Mutation to resend a contract to a musician
  const resendContractMutation = useMutation({
    mutationFn: (musicianContractId: number) => 
      apiRequest(`/api/monthly-contracts/musician/${musicianContractId}/resend`, 'POST'),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contract resent successfully",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/monthly-contracts/${contractId}`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to resend contract: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation to reject a contract
  const rejectContractMutation = useMutation({
    mutationFn: (musicianContractId: number) => 
      apiRequest(`/api/monthly-contracts/musician/${musicianContractId}/reject`, 'POST'),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contract rejected successfully",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/monthly-contracts/${contractId}`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reject contract: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Handle resending a contract
  const handleResendContract = (musicianContractId: number) => {
    resendContractMutation.mutate(musicianContractId);
  };

  // Handle rejecting a contract
  const handleRejectContract = (musicianContractId: number) => {
    if (confirm("Are you sure you want to reject this contract?")) {
      rejectContractMutation.mutate(musicianContractId);
    }
  };

  // Handle showing the response link dialog
  const handleShowResponseLink = (musician: any) => {
    setSelectedMusician(musician);
    setShowLinkDialog(true);
  };

  // Copy response link to clipboard
  const handleCopyLink = (token: string, id: number) => {
    const responseUrl = `${window.location.origin}/contracts/respond?token=${token}&id=${id}`;
    navigator.clipboard.writeText(responseUrl);
    toast({
      title: "Link Copied",
      description: "Response link copied to clipboard"
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading Contract Musicians</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">
            There was a problem loading the musicians for this contract.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!musicians || musicians.length === 0) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle>No Musicians Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            There are no musicians assigned to this contract.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Contract Musicians</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Musician Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Contract Name</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Musician Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {musicians.map((musician: any) => (
                <TableRow key={musician.id}>
                  <TableCell>{musician.id}</TableCell>
                  <TableCell>
                    <Link to={`/monthly/contracts/${contractId}`} className="text-blue-600 hover:underline">
                      Contract #{contractId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {musician.createdAt ? format(new Date(musician.createdAt), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${STATUS_COLORS[musician.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending} flex items-center`}
                    >
                      {STATUS_ICONS[musician.status as keyof typeof STATUS_ICONS] || STATUS_ICONS.pending}
                      {musician.status.charAt(0).toUpperCase() + musician.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{musician.musicianName}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1"
                        asChild
                      >
                        <Link to={`/monthly/contracts/${contractId}/musicians/${musician.id}`}>
                          <FileText className="h-4 w-4" />
                          View
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1"
                        onClick={() => handleResendContract(musician.id)}
                        disabled={musician.status !== 'sent' && musician.status !== 'pending'}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Resend
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                        onClick={() => handleRejectContract(musician.id)}
                        disabled={musician.status === 'rejected' || musician.status === 'signed'}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1"
                        onClick={() => handleShowResponseLink(musician)}
                      >
                        <Copy className="h-4 w-4" />
                        Link
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Response Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contract Response Link</DialogTitle>
            <DialogDescription>
              Share this link with {selectedMusician?.musicianName} to allow them to respond to their contract.
            </DialogDescription>
          </DialogHeader>
          
          {selectedMusician && (
            <div className="my-4">
              <div className="p-2 bg-gray-100 rounded text-sm break-all">
                {`${window.location.origin}/contracts/respond?token=${selectedMusician.token}&id=${contractId}`}
              </div>
              <div className="flex justify-between mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                  onClick={() => handleCopyLink(selectedMusician.token, contractId)}
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                  asChild
                >
                  <a 
                    href={`${window.location.origin}/contracts/respond?token=${selectedMusician.token}&id=${contractId}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Link
                  </a>
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowLinkDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}