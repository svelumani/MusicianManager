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
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  ExternalLink,
  Users
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
import ContractMusiciansView from "./ContractMusiciansView";

interface ContractsViewProps {
  plannerId: number;
  month: number;
  year: number;
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

export default function ContractsView({ plannerId, month, year }: ContractsViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("contracts");
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedMusician, setSelectedMusician] = useState<any>(null);
  
  // Query to get all contracts for this planner
  const {
    data: contracts = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [`/api/monthly-contracts/planner/${plannerId}`],
    enabled: !!plannerId,
  });

  // Query to get all musicians in all contracts for this planner
  const {
    data: contractMusicians = [],
    isLoading: isLoadingMusicians,
    error: musicianError,
    refetch: refetchMusicians
  } = useQuery({
    queryKey: [`/api/monthly-contracts/planner/${plannerId}/musicians`],
    enabled: !!plannerId && selectedTab === "musicians",
  });

  // Mutation to send a contract
  const sendContractMutation = useMutation({
    mutationFn: (contractId: number) => apiRequest(`/api/monthly-contracts/${contractId}/send`, 'POST'),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contract sent successfully",
      });
      refetch();
      refetchMusicians();
      // Use both query key formats to ensure all components refresh correctly
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician/${plannerId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send contract: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
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
      refetchMusicians();
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
      refetchMusicians();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reject contract: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Handle sending a contract
  const handleSendContract = (contractId: number) => {
    sendContractMutation.mutate(contractId);
  };

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
  const handleShowResponseLink = (musician: any, contractId: number) => {
    setSelectedMusician({
      ...musician,
      contractId
    });
    setShowLinkDialog(true);
  };

  // Copy response link to clipboard
  const handleCopyLink = (token: string, contractId: number) => {
    const responseUrl = `${window.location.origin}/contracts/respond?token=${token}&id=${contractId}`;
    navigator.clipboard.writeText(responseUrl);
    toast({
      title: "Link Copied",
      description: "Response link copied to clipboard"
    });
  };

  // View a specific contract's musicians
  const handleViewContractMusicians = (contractId: number) => {
    setSelectedContractId(contractId);
    setSelectedTab("musicians");
  };

  // Loading state
  if ((isLoading && selectedTab === "contracts") || (isLoadingMusicians && selectedTab === "musicians")) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if ((error && selectedTab === "contracts") || (musicianError && selectedTab === "musicians")) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Error Loading {selectedTab === "contracts" ? "Contracts" : "Musicians"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">
            There was a problem loading {selectedTab === "contracts" ? "contracts" : "musicians"}. Please try again later.
          </p>
          <Button onClick={() => selectedTab === "contracts" ? refetch() : refetchMusicians()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state for contracts
  if (selectedTab === "contracts" && (!contracts || contracts.length === 0)) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle>No Contracts Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 mb-6">
            There are no contracts for this month yet. Go to the Musicians tab to create contracts.
          </p>
          <div className="p-8 border rounded-lg flex flex-col items-center justify-center text-center">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Generate New Contracts</h3>
            <p className="text-gray-500 mb-4">
              To create new contracts, please go to the Musicians tab, select assignments for musicians, 
              and click the "Generate Contract" button.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If we're looking at a specific contract's musicians
  if (selectedTab === "musicians" && selectedContractId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Contract #{selectedContractId} Musicians</h2>
            <p className="text-gray-500">
              Managing musicians for contract #{selectedContractId}
            </p>
          </div>
          <Button variant="outline" onClick={() => setSelectedTab("contracts")}>
            Back to Contracts
          </Button>
        </div>
        
        <ContractMusiciansView contractId={selectedContractId} />
      </div>
    );
  }

  // Main view with tabs
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Monthly Contracts</h2>
      </div>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Contracts</span>
          </TabsTrigger>
          <TabsTrigger value="musicians" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Musicians</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle>Contract Management</CardTitle>
              <CardDescription>Manage monthly contracts for musicians</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Contract Name</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Musicians</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract: any) => (
                    <TableRow key={contract.id}>
                      <TableCell>{contract.id}</TableCell>
                      <TableCell>
                        <Link to={`/monthly/contracts/${contract.id}`} className="text-blue-600 hover:underline">
                          {contract.name || `Contract #${contract.id}`}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {contract.createdAt ? format(new Date(contract.createdAt), 'MMM d, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${STATUS_COLORS[contract.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending} flex items-center`}
                        >
                          {STATUS_ICONS[contract.status as keyof typeof STATUS_ICONS] || STATUS_ICONS.pending}
                          {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-100">
                          {contract.musicianCount || 0} musicians
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1"
                            onClick={() => handleSendContract(contract.id)}
                            disabled={contract.status !== 'draft' && contract.status !== 'pending'}
                          >
                            <Send className="h-4 w-4" />
                            Send
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1"
                            asChild
                          >
                            <Link to={`/monthly/contracts/${contract.id}`}>
                              <FileText className="h-4 w-4" />
                              View
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1"
                            onClick={() => handleViewContractMusicians(contract.id)}
                          >
                            <Users className="h-4 w-4" />
                            Musicians
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="musicians">
          <Card>
            <CardHeader>
              <CardTitle>Musician Contracts</CardTitle>
              <CardDescription>Manage individual musician contracts</CardDescription>
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
                  {contractMusicians.map((musician: any) => (
                    <TableRow key={musician.id}>
                      <TableCell>{musician.id}</TableCell>
                      <TableCell>
                        <Link to={`/monthly/contracts/${musician.contractId}`} className="text-blue-600 hover:underline">
                          Contract #{musician.contractId}
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
                            <Link to={`/monthly/contracts/${musician.contractId}/musicians/${musician.id}`}>
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
                            onClick={() => handleShowResponseLink(musician, musician.contractId)}
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
        </TabsContent>
      </Tabs>

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
                {`${window.location.origin}/contracts/respond?token=${selectedMusician.token}&id=${selectedMusician.contractId}`}
              </div>
              <div className="flex justify-between mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                  onClick={() => handleCopyLink(selectedMusician.token, selectedMusician.contractId)}
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
                    href={`${window.location.origin}/contracts/respond?token=${selectedMusician.token}&id=${selectedMusician.contractId}`} 
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