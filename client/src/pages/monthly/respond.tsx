import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, XCircle, Calendar, Clock, Info, MessageSquare 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const MonthlyContractResponsePage = () => {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [musicianContractId, setMusicianContractId] = useState<number | null>(null);
  const [allAccepted, setAllAccepted] = useState(false);
  const [allRejected, setAllRejected] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [selectedDateId, setSelectedDateId] = useState<number | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<{ dateId: number; status: string } | null>(null);
  
  // Extract token from URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);
  
  // Query to get musician contract details using token
  const {
    data: contractData,
    isLoading,
    error,
    refetch: refetchContract,
  } = useQuery({
    queryKey: ['/api/monthly-contract-musicians/token', token],
    queryFn: async () => {
      if (!token) return null;
      try {
        const response = await apiRequest(`/api/monthly-contract-musicians/token/${token}`);
        if (response && response.id) {
          setMusicianContractId(response.id);
        }
        return response;
      } catch (error) {
        console.error("Error fetching contract data:", error);
        return null;
      }
    },
    enabled: !!token,
  });
  
  // Mutation to update date status
  const updateDateStatusMutation = useMutation({
    mutationFn: ({ dateId, status, notes }: { dateId: number; status: string; notes?: string }) => {
      return apiRequest(`/api/monthly-contract-dates/${dateId}/status`, 'PUT', {
        status,
        notes
      });
    },
    onSuccess: () => {
      toast({
        title: "Response recorded",
        description: "Your response has been saved successfully",
      });
      refetchContract();
      setNoteValue('');
      setSelectedDateId(null);
      setPendingAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update response",
        variant: "destructive",
      });
      setPendingAction(null);
    },
  });
  
  // Handle accept/reject for individual date
  const handleDateResponse = (dateId: number, status: string) => {
    if (status === 'rejected') {
      // For rejections, open note dialog to capture reason
      setSelectedDateId(dateId);
      setNoteValue('');
      setShowNoteDialog(true);
      setPendingAction({ dateId, status });
    } else {
      // For acceptances, show confirmation dialog
      setConfirmMessage(`Are you sure you want to accept this date?`);
      setShowConfirmDialog(true);
      setPendingAction({ dateId, status });
    }
  };
  
  // Process pending action
  const processPendingAction = () => {
    if (!pendingAction) return;
    
    const { dateId, status } = pendingAction;
    updateDateStatusMutation.mutate({
      dateId,
      status,
      notes: status === 'rejected' ? noteValue : undefined
    });
  };
  
  // Handle "Accept All" button
  const handleAcceptAll = () => {
    setConfirmMessage("Are you sure you want to accept all dates in this contract?");
    setShowConfirmDialog(true);
    setAllAccepted(true);
    setAllRejected(false);
  };
  
  // Handle "Reject All" button
  const handleRejectAll = () => {
    setSelectedDateId(null);
    setNoteValue('');
    setShowNoteDialog(true);
    setAllAccepted(false);
    setAllRejected(true);
  };
  
  // Process bulk actions
  const processBulkAction = () => {
    if (!contractData || !contractData.dates || !contractData.dates.length) return;
    
    const status = allAccepted ? 'accepted' : 'rejected';
    const promises = contractData.dates
      .filter((date: any) => date.status === 'pending')
      .map((date: any) => {
        return updateDateStatusMutation.mutateAsync({
          dateId: date.id,
          status,
          notes: allRejected ? noteValue : undefined
        });
      });
    
    Promise.all(promises)
      .then(() => {
        toast({
          title: "All responses recorded",
          description: `All dates have been ${status} successfully`,
        });
        refetchContract();
        setNoteValue('');
        setAllAccepted(false);
        setAllRejected(false);
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: "Failed to update all responses",
          variant: "destructive",
        });
      });
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Declined</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };
  
  // Calculate contract total fee
  const calculateTotalFee = () => {
    if (!contractData || !contractData.dates) return 0;
    
    return contractData.dates
      .filter((date: any) => date.status !== 'rejected')
      .reduce((total: number, date: any) => {
        return total + parseFloat(date.fee || 0);
      }, 0);
  };

  // Check if all dates have responses
  const allDatesResponded = () => {
    if (!contractData || !contractData.dates) return false;
    
    return contractData.dates.every((date: any) => date.status !== 'pending');
  };
  
  // Check if any date is accepted
  const hasAcceptedDates = () => {
    if (!contractData || !contractData.dates) return false;
    
    return contractData.dates.some((date: any) => date.status === 'accepted');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-8 pb-20">
      <div className="container max-w-4xl">
        {/* Company Logo and Name */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {/* Placeholder for actual logo */}
              <span className="text-4xl font-bold text-gray-500">VAMP</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-primary">Victoria Association of Music Promoters</h2>
        </div>
        
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Monthly Contract Response</h1>
          <p className="text-lg text-gray-600 mb-2">
            Please review and respond to each date in your monthly contract
          </p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
          </div>
        ) : error || !contractData ? (
          <Card className="text-center py-10">
            <CardContent>
              <h2 className="text-2xl font-semibold text-red-500 mb-4">Contract Not Found</h2>
              <p className="text-gray-600 mb-6">
                The contract link may have expired or is invalid.
                Please contact the administrator for assistance.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Musician & Contract Info */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-2xl">Contract Details</CardTitle>
                <CardDescription>
                  {contractData.contract?.name || 'Monthly Contract'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Musician Information</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium">Name:</span> {contractData.musician?.name}</p>
                      <p><span className="font-medium">Email:</span> {contractData.musician?.email}</p>
                      {contractData.musician?.phone && (
                        <p><span className="font-medium">Phone:</span> {contractData.musician?.phone}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Contract Information</h3>
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium">Month:</span>{' '}
                        {contractData.contract?.month && contractData.contract?.year
                          ? format(new Date(contractData.contract.year, contractData.contract.month - 1), 'MMMM yyyy')
                          : 'N/A'}
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>{' '}
                        <Badge className={`
                          ${contractData.status === 'signed' ? 'bg-green-500' : 
                            contractData.status === 'rejected' ? 'bg-red-500' : 
                              contractData.status === 'sent' ? 'bg-blue-500' : 'bg-gray-500'}
                        `}>
                          {contractData.status?.charAt(0).toUpperCase() + contractData.status?.slice(1)}
                        </Badge>
                      </p>
                      <p>
                        <span className="font-medium">Date Count:</span>{' '}
                        {contractData.dates?.length || 0} dates
                      </p>
                      <p>
                        <span className="font-medium">Total Fee:</span>{' '}
                        ${calculateTotalFee().toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Response Status Card */}
            <Card className="mb-8 border-2 border-primary-100">
              <CardHeader className="bg-primary-50">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl">Response Required</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleRejectAll}
                      disabled={allDatesResponded() || updateDateStatusMutation.isPending}
                    >
                      <XCircle className="mr-1 h-4 w-4" /> Decline All
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={handleAcceptAll}
                      disabled={allDatesResponded() || updateDateStatusMutation.isPending}
                    >
                      <CheckCircle className="mr-1 h-4 w-4" /> Accept All
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Please respond to each date in your monthly contract
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Date</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead className="w-[100px]">Fee</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="text-right w-[200px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contractData.dates?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                            No dates found in this contract
                          </TableCell>
                        </TableRow>
                      ) : (
                        contractData.dates.map((date: any) => (
                          <TableRow key={date.id} className="text-base">
                            <TableCell className="font-medium">
                              {formatDate(date.date)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{date.notes || 'No details provided'}</span>
                                {date.status === 'rejected' && date.notes && (
                                  <span className="text-sm text-red-500 mt-1">
                                    Reason: {date.notes}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>${parseFloat(date.fee).toFixed(2)}</TableCell>
                            <TableCell>{getStatusBadge(date.status)}</TableCell>
                            <TableCell className="text-right">
                              {date.status === 'pending' ? (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDateResponse(date.id, 'rejected')}
                                    disabled={updateDateStatusMutation.isPending}
                                  >
                                    <XCircle className="mr-1 h-4 w-4" /> Decline
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleDateResponse(date.id, 'accepted')}
                                    disabled={updateDateStatusMutation.isPending}
                                  >
                                    <CheckCircle className="mr-1 h-4 w-4" /> Accept
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-500"
                                    disabled
                                  >
                                    Response recorded
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-50 flex justify-between">
                <div className="text-sm text-gray-500 flex items-center">
                  <Info className="mr-2 h-4 w-4" />
                  You must respond to all dates to complete your contract
                </div>
                {allDatesResponded() && (
                  <Badge className="bg-green-500 text-white px-3 py-1">
                    All responses complete
                  </Badge>
                )}
              </CardFooter>
            </Card>
            
            {/* Final Confirmation */}
            {allDatesResponded() && (
              <Card className="border-2 border-green-100">
                <CardHeader className="bg-green-50">
                  <CardTitle className="text-xl text-green-700">
                    Thank You For Your Response
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-lg mb-4">
                    You have responded to all dates in this contract. Here's a summary:
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-green-50 p-3 rounded-md">
                      <p className="font-medium text-green-700">Accepted Dates:</p>
                      <p className="text-2xl font-bold">
                        {contractData.dates?.filter((d: any) => d.status === 'accepted').length || 0}
                      </p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-md">
                      <p className="font-medium text-red-700">Declined Dates:</p>
                      <p className="text-2xl font-bold">
                        {contractData.dates?.filter((d: any) => d.status === 'rejected').length || 0}
                      </p>
                    </div>
                  </div>
                  <p className="font-medium">
                    Total Fee for Accepted Dates: ${calculateTotalFee().toFixed(2)}
                  </p>
                </CardContent>
                <CardFooter className="bg-gray-50">
                  <div className="text-sm text-gray-600">
                    A confirmation email will be sent to you shortly.
                  </div>
                </CardFooter>
              </Card>
            )}
          </>
        )}
      </div>
      
      {/* Rejection Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">
              {allRejected ? 'Decline All Dates' : 'Provide a Reason'}
            </DialogTitle>
            <DialogDescription>
              {allRejected 
                ? 'Please provide a reason for declining all dates in this contract'
                : 'Please provide a reason for declining this date'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Please explain why you are unable to accept this booking..."
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              rows={5}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNoteDialog(false);
                setPendingAction(null);
                setAllRejected(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={allRejected ? processBulkAction : processPendingAction}
              disabled={!noteValue.trim() || updateDateStatusMutation.isPending}
            >
              {updateDateStatusMutation.isPending ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Confirm Decline
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Response</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowConfirmDialog(false);
                setPendingAction(null);
                setAllAccepted(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={allAccepted ? processBulkAction : processPendingAction}
              className="bg-primary"
            >
              {updateDateStatusMutation.isPending ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MonthlyContractResponsePage;