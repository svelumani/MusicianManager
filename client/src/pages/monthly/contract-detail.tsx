import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  CheckCircle,
  Clock,
  FileText,
  Send,
  AlertTriangle,
  XCircle,
  Link2,
  Copy,
  ExternalLink,
  Mail,
  Ban
} from "lucide-react";

const MonthlyContractDetailPage = () => {
  const params = useParams();
  const contractId = params.id ? parseInt(params.id) : null;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showResponseLinkDialog, setShowResponseLinkDialog] = useState(false);
  const [selectedMusician, setSelectedMusician] = useState<any>(null);
  const [showDatesDialog, setShowDatesDialog] = useState(false);

  // Query to fetch the monthly contract
  const {
    data: contract,
    isLoading: isContractLoading,
    error: contractError,
  } = useQuery({
    queryKey: [`/api/monthly-contracts/${contractId}`],
    enabled: !!contractId,
  });

  // Query to fetch the contract assignments (musicians)
  const {
    data: assignments = [],
    isLoading: isAssignmentsLoading,
  } = useQuery({
    queryKey: [`/api/monthly-contracts/${contractId}/assignments`],
    enabled: !!contractId,
  });

  // Mutation for resending contract
  const resendContractMutation = useMutation({
    mutationFn: async () => {
      if (!contractId) return null;
      return apiRequest(`/api/monthly-contracts/${contractId}/send`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Contract Resent",
        description: "The contract has been resent to all musicians.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/monthly-contracts/${contractId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Resending Contract",
        description: error.message || "Failed to resend contract. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for cancelling contract
  const cancelContractMutation = useMutation({
    mutationFn: async () => {
      if (!contractId) return null;
      return apiRequest(`/api/monthly-contracts/${contractId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'cancelled',
          notes: 'Contract cancelled by administrator'
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Contract Cancelled",
        description: "The contract has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/monthly-contracts/${contractId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error Cancelling Contract",
        description: error.message || "Failed to cancel contract. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Construct the response link for a musician
  const getResponseLink = (musician: any) => {
    if (!musician || !contractId) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/respond/${contractId}/${musician.id}`;
  };

  // Copy response link to clipboard
  const copyResponseLink = (musician: any) => {
    const link = getResponseLink(musician);
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: `Response link copied for ${musician.musician?.name}`,
    });
  };

  // Format month names
  const getMonthName = (month: number) => {
    return format(new Date(2000, month - 1, 1), 'MMMM');
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-500';
      case 'sent':
        return 'bg-blue-500';
      case 'signed': // Legacy support
      case 'accepted':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-rose-500';
      case 'in-progress':
        return 'bg-amber-500';
      case 'completed':
        return 'bg-emerald-600';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-4 w-4 mr-1" />;
      case 'sent':
        return <Send className="h-4 w-4 mr-1" />;
      case 'signed': // Legacy support
      case 'accepted':
        return <CheckCircle className="h-4 w-4 mr-1" />;
      case 'rejected':
        return <AlertTriangle className="h-4 w-4 mr-1" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 mr-1" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 mr-1" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 mr-1" />;
      default:
        return <Clock className="h-4 w-4 mr-1" />;
    }
  };
  
  // Helper function to decode the system event ID for monthly contracts
  // Format: 999YYYYMM (e.g., 99920255 for May 2025)
  const decodeMonthlyContractEventId = (eventId: number): { isMonthlyContract: boolean, year?: number, month?: number } => {
    if (eventId >= 999000000) {
      const yearMonth = eventId - 999000000;
      const year = Math.floor(yearMonth / 100);
      const month = yearMonth % 100;
      return { isMonthlyContract: true, year, month };
    }
    return { isMonthlyContract: false };
  };

  if (isContractLoading) {
    return (
      <div className="flex justify-center my-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (contractError || !contract) {
    return (
      <div className="container mx-auto py-6">
        <Card className="text-center p-6">
          <CardHeader>
            <CardTitle className="text-xl text-red-500">Contract Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested monthly contract could not be found or you don't have permission to view it.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{contract.name || `Monthly Contract #${contract.id}`}</h1>
          <Badge className={`${getStatusColor(contract.status)} text-white px-3 py-1.5 text-lg flex items-center`}>
            {getStatusIcon(contract.status)}
            {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
          </Badge>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="details" className="text-base px-6 py-2">Details</TabsTrigger>
            <TabsTrigger value="musicians" className="text-base px-6 py-2">Musicians</TabsTrigger>
            <TabsTrigger value="history" className="text-base px-6 py-2">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Contract Information</CardTitle>
                <CardDescription>
                  View and manage contract details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">ID</h3>
                      <p className="mt-1 text-base font-medium">{contract.id}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Status</h3>
                      <Badge className={`${getStatusColor(contract.status)} text-white mt-1 flex w-fit`}>
                        {getStatusIcon(contract.status)}
                        {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Month/Year</h3>
                      <p className="mt-1 text-base font-medium">{getMonthName(contract.month)} {contract.year}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Created</h3>
                      <p className="mt-1 text-base font-medium">
                        {contract.createdAt ? format(new Date(contract.createdAt), 'MMMM d, yyyy h:mm a') : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {contract.sentAt && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Sent Date</h3>
                        <p className="mt-1 text-base font-medium">
                          {format(new Date(contract.sentAt), 'MMMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Description</h3>
                    <p className="mt-1 text-base whitespace-pre-wrap">{contract.description || 'No description provided'}</p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-wrap gap-2">
                {contract.status === 'draft' && (
                  <Button>
                    <Send className="mr-2 h-4 w-4" />
                    Send Contract
                  </Button>
                )}
                
                {/* Resend Contract Button */}
                {contract.status === 'sent' && (
                  <Button 
                    onClick={() => resendContractMutation.mutate()}
                    disabled={resendContractMutation.isPending}
                  >
                    {resendContractMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    Resend Contract
                  </Button>
                )}
                
                {/* Cancel Contract Button */}
                {contract.status !== 'cancelled' && contract.status !== 'draft' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Ban className="mr-2 h-4 w-4" />
                        Cancel Contract
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will cancel the contract for all musicians
                          and notify them of the cancellation.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => cancelContractMutation.mutate()}
                          disabled={cancelContractMutation.isPending}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          {cancelContractMutation.isPending ? 'Cancelling...' : 'Cancel Contract'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                {/* Preview Contract Button */}
                <Button 
                  variant="outline" 
                  asChild
                >
                  <a 
                    href={`/api/monthly-contracts/${contract.id}/preview`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Preview Contract
                  </a>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="musicians" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Assigned Musicians</CardTitle>
                <CardDescription>Musicians included in this monthly contract</CardDescription>
              </CardHeader>
              <CardContent>
                {isAssignmentsLoading ? (
                  <div className="flex justify-center my-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No musicians assigned to this contract
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Musician</TableHead>
                        <TableHead>Instrument</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Response</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment: any) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{assignment.musician?.name || 'Unknown'}</TableCell>
                          <TableCell>{assignment.musician?.type || 'N/A'}</TableCell>
                          <TableCell>
                            {assignment.dateCount || 0} dates
                            <Button 
                              variant="link" 
                              className="p-0 h-auto text-xs text-blue-500 ml-1"
                              onClick={() => {
                                setSelectedMusician(assignment);
                                setShowDatesDialog(true);
                              }}
                            >
                              View details
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${
                              assignment.status === 'accepted' ? 'bg-green-500' :
                              assignment.status === 'rejected' ? 'bg-red-500' :
                              assignment.status === 'pending' ? 'bg-amber-500' :
                              'bg-gray-500'
                            } text-white`}>
                              {assignment.status || 'Pending'}
                            </Badge>
                            {assignment.responseDate && (
                              <div className="text-xs text-gray-500 mt-1">
                                {format(new Date(assignment.responseDate), 'MMM d, yyyy')}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedMusician(assignment);
                                  setShowResponseLinkDialog(true);
                                }}
                              >
                                <Link2 className="h-4 w-4 mr-1" />
                                Link
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                asChild
                              >
                                <a 
                                  href={`/api/monthly-contracts/${contractId}/musicians/${assignment.id}/preview`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  View
                                </a>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Contract History</CardTitle>
                <CardDescription>Timeline of events for this contract</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contract.createdAt && (
                    <div className="flex items-start">
                      <div className="flex-shrink-0 bg-gray-100 p-2 rounded-full mr-3">
                        <FileText className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">Contract Created</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(contract.createdAt), 'MMMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {contract.sentAt && (
                    <div className="flex items-start">
                      <div className="flex-shrink-0 bg-blue-100 p-2 rounded-full mr-3">
                        <Send className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Contract Sent</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(contract.sentAt), 'MMMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Additional history items would be added here */}
                  {!contract.sentAt && (
                    <div className="text-center py-4 text-gray-500">
                      No additional history available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Response Link Dialog */}
      <Dialog open={showResponseLinkDialog} onOpenChange={setShowResponseLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Response Link</DialogTitle>
            <DialogDescription>
              Share this link with {selectedMusician?.musician?.name} to respond to the contract
            </DialogDescription>
          </DialogHeader>
          {selectedMusician && (
            <div className="flex items-center space-x-2 mt-2">
              <div className="grid flex-1 gap-2">
                <label className="sr-only">Link</label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={getResponseLink(selectedMusician)}
                  readOnly
                />
              </div>
              <Button 
                type="button" 
                size="icon" 
                onClick={() => copyResponseLink(selectedMusician)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              asChild
            >
              <a
                href={getResponseLink(selectedMusician)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Response Page
              </a>
            </Button>
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => setShowResponseLinkDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dates Dialog */}
      <Dialog open={showDatesDialog} onOpenChange={setShowDatesDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Date Details</DialogTitle>
            <DialogDescription>
              Dates and responses for {selectedMusician?.musician?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedMusician?.dates && selectedMusician.dates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedMusician.dates.map((date: any) => (
                    <TableRow key={date.id}>
                      <TableCell>{format(new Date(date.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>${parseFloat(date.fee).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={`${
                          date.status === 'accepted' ? 'bg-green-500' :
                          date.status === 'rejected' ? 'bg-red-500' :
                          date.status === 'pending' ? 'bg-amber-500' :
                          'bg-gray-500'
                        } text-white`}>
                          {date.status.charAt(0).toUpperCase() + date.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{date.notes || 'No notes'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No dates found for this musician
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              onClick={() => setShowDatesDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MonthlyContractDetailPage;