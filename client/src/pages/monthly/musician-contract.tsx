import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  File, 
  Send, 
  XCircle,
  RefreshCw,
  Copy,
  FileText
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  cancelled: <AlertCircle className="h-4 w-4 mr-1" />,
  completed: <CheckCircle className="h-4 w-4 mr-1" />,
};

const MusicianContractPage = () => {
  const params = useParams<{ contractId: string, musicianId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  
  const contractId = params?.contractId ? parseInt(params.contractId) : 0;
  const musicianId = params?.musicianId ? parseInt(params.musicianId) : 0;

  // Query to get the contract details
  const {
    data: contract,
    isLoading: isContractLoading,
    error: contractError,
  } = useQuery({
    queryKey: [`/api/monthly-contracts/${contractId}`],
    enabled: !!contractId,
  });

  // Query to get the musician contract
  const {
    data: musicianContract,
    isLoading: isMusicianContractLoading,
    error: musicianContractError,
    refetch: refetchMusicianContract,
  } = useQuery({
    queryKey: [`/api/monthly-contracts/musician`, musicianId],
    queryFn: async () => {
      try {
        return await apiRequest(`/api/monthly-contracts/musician/${musicianId}`);
      } catch (error) {
        console.error("Error fetching musician contract:", error);
        throw error;
      }
    },
    enabled: !!musicianId,
  });

  // Mutations for contract actions
  const resendContractMutation = useMutation({
    mutationFn: () => apiRequest(`/api/monthly-contracts/musician/${musicianId}/resend`, 'POST'),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contract resent successfully",
      });
      refetchMusicianContract();
      queryClient.invalidateQueries({ queryKey: [`/api/monthly-contracts/planner`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to resend contract: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const rejectContractMutation = useMutation({
    mutationFn: () => apiRequest(`/api/monthly-contracts/musician/${musicianId}/reject`, 'POST'),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contract rejected successfully",
      });
      refetchMusicianContract();
      queryClient.invalidateQueries({ queryKey: [`/api/monthly-contracts/planner`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reject contract: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Copy response link to clipboard
  const handleCopyLink = () => {
    if (!musicianContract) return;
    
    const responseUrl = `${window.location.origin}/contracts/respond?token=${musicianContract.token}&id=${contractId}`;
    navigator.clipboard.writeText(responseUrl);
    toast({
      title: "Link Copied",
      description: "Response link copied to clipboard",
    });
  };

  // Handle resending contract
  const handleResendContract = () => {
    resendContractMutation.mutate();
  };

  // Handle rejecting contract
  const handleRejectContract = () => {
    if (confirm("Are you sure you want to reject this contract?")) {
      rejectContractMutation.mutate();
    }
  };

  // Loading state
  if (isContractLoading || isMusicianContractLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  // Error state
  if (contractError || musicianContractError) {
    return (
      <div className="container mx-auto py-8">
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Error Loading Contract</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 mb-4">
              There was a problem loading this contract. It may not exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/monthly/contracts')} variant="outline">
              Back to Contracts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If contract or musician contract is not found
  if (!contract || !musicianContract) {
    return (
      <div className="container mx-auto py-8">
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle>Contract Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700 mb-4">
              The requested contract could not be found. It may have been deleted or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/monthly/contracts')} variant="outline">
              Back to Contracts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/monthly">Monthly</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/planner?tab=musicians">Contracts</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/monthly/contracts/${contractId}`}>Contract #{contractId}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span>{musicianContract.musicianName}</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Musician Contract
          </h1>
          <p className="text-gray-500 mt-1">
            Contract #{contractId} for {musicianContract.musicianName}
          </p>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => navigate('/planner?tab=musicians')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contracts
          </Button>
        </div>
      </div>

      {/* Contract Details */}
      <div className="mb-4">
        <h2 className="text-2xl font-semibold">Contract #{contractId} for {musicianContract.musicianName || ''}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Contract Details</CardTitle>
            <CardDescription>
              Information about this monthly contract
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-gray-500">Contract Name</p>
                <p className="text-base">{contract.name || `Contract #${contractId}`}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500">Created Date</p>
                <p className="text-base">{contract.createdAt ? format(new Date(contract.createdAt), 'MMMM d, yyyy') : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500">Month/Year</p>
                <p className="text-base">{contract.year && contract.month ? format(new Date(contract.year, contract.month - 1), 'MMMM yyyy') : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500">Status</p>
                <Badge
                  variant="outline"
                  className={`${(contract.status && STATUS_COLORS[contract.status as keyof typeof STATUS_COLORS]) || STATUS_COLORS.pending} flex items-center`}
                >
                  {(contract.status && STATUS_ICONS[contract.status as keyof typeof STATUS_ICONS]) || STATUS_ICONS.pending}
                  {contract.status ? contract.status.charAt(0).toUpperCase() + contract.status.slice(1) : 'Pending'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Musician Status</CardTitle>
            <CardDescription>
              Contract status for this musician
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-500">Name</p>
              <p className="text-base">{musicianContract.musicianName || 'Unknown Musician'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Status</p>
              <Badge
                variant="outline"
                className={`${(musicianContract.status && typeof musicianContract.status === 'string' && STATUS_COLORS[musicianContract.status as keyof typeof STATUS_COLORS]) || STATUS_COLORS.pending} flex items-center`}
              >
                {(musicianContract.status && typeof musicianContract.status === 'string' && STATUS_ICONS[musicianContract.status as keyof typeof STATUS_ICONS]) || STATUS_ICONS.pending}
                {(musicianContract.status && typeof musicianContract.status === 'string') ? musicianContract.status.charAt(0).toUpperCase() + musicianContract.status.slice(1) : 'Pending'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Sent Date</p>
              <p className="text-base">{musicianContract.sentAt ? format(new Date(musicianContract.sentAt), 'MMMM d, yyyy') : 'Not sent yet'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">Response Date</p>
              <p className="text-base">{musicianContract.respondedAt ? format(new Date(musicianContract.respondedAt), 'MMMM d, yyyy') : 'No response yet'}</p>
            </div>
          </CardContent>
          <CardFooter className="flex-col space-y-3">
            <div className="flex space-x-2 w-full">
              <Button
                variant="outline"
                className="flex-1 flex items-center gap-1"
                onClick={handleResendContract}
                disabled={typeof musicianContract.status !== 'string' || (musicianContract.status !== 'sent' && musicianContract.status !== 'pending')}
              >
                <RefreshCw className="h-4 w-4" />
                Resend
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex items-center gap-1 text-red-600 hover:text-red-700"
                onClick={handleRejectContract}
                disabled={typeof musicianContract.status !== 'string' || musicianContract.status === 'rejected' || musicianContract.status === 'signed'}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </div>
            <Button 
              variant="outline" 
              className="w-full flex items-center gap-1"
              onClick={() => setShowLinkDialog(true)}
            >
              <Copy className="h-4 w-4" />
              Get Response Link
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Performance Details */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Details</CardTitle>
          <CardDescription>
            Details of all performances included in this contract
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venue</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* This would normally come from the API with performance details */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">May 6, 2025</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Blue Note Jazz Club</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">7:00 PM - 10:00 PM</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-800 flex items-center"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Confirmed
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$250.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Response Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contract Response Link</DialogTitle>
            <DialogDescription>
              Share this link with {musicianContract.musicianName} to allow them to respond to their contract.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4">
            <div className="p-2 bg-gray-100 rounded text-sm break-all">
              {`${window.location.origin}/contracts/respond?token=${musicianContract.token}&id=${contractId}`}
            </div>
            <div className="flex justify-between mt-4">
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
                onClick={handleCopyLink}
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
                  href={`${window.location.origin}/contracts/respond?token=${musicianContract.token}&id=${contractId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <FileText className="h-4 w-4" />
                  Open Link
                </a>
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowLinkDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MusicianContractPage;