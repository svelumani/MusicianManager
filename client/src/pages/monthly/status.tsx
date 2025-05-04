import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isAfter, isBefore, subDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  Calendar, 
  CheckCircle, 
  CheckCircle2,
  ClipboardIcon, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Search, 
  MailIcon, 
  RefreshCw, 
  Info 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContractDateStatus {
  id: number;
  date: string;
  status: string;
  fee: string;
  notes?: string;
}

interface MusicianContractStatus {
  id: number;
  musician: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  status: string;
  sentAt?: string;
  respondedAt?: string;
  musicianSignature?: string;
  ipAddress?: string;
  dates: ContractDateStatus[];
}

const ContractStatusPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [selectedMusician, setSelectedMusician] = useState<MusicianContractStatus | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  
  // Format month names
  const getMonthName = (month: number) => {
    return format(new Date(2000, month - 1, 1), 'MMMM');
  };

  // Query to get monthly contracts
  const {
    data: contracts = [],
    isLoading: isContractsLoading,
  } = useQuery({
    queryKey: ['/api/monthly-contracts'],
    select: (data: any[]) => {
      // Filter contracts by current month/year
      return data.filter((contract: any) => 
        contract.month === selectedMonth && 
        contract.year === selectedYear &&
        contract.status !== 'draft'
      );
    },
  });

  // Query to get musicians for the selected contract
  const {
    data: musicians = [],
    isLoading: isMusiciansLoading,
    refetch: refetchMusicians,
  } = useQuery({
    queryKey: ['/api/monthly-contract-musicians', selectedContract?.id],
    queryFn: async () => {
      if (!selectedContract) return [];
      const response = await apiRequest(`/api/monthly-contracts/${selectedContract.id}/musicians`);
      return response;
    },
    enabled: !!selectedContract,
    select: (data) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return data.filter((musician: MusicianContractStatus) => 
          musician.musician.name.toLowerCase().includes(query) ||
          musician.status.toLowerCase().includes(query)
        );
      }
      return data;
    }
  });

  // Handle contract selection
  const handleContractSelect = (contractId: string) => {
    const contract = contracts.find((c: any) => c.id.toString() === contractId);
    setSelectedContract(contract || null);
    setSearchQuery("");
  };

  // View musician response details
  const handleViewMusicianResponse = (musician: MusicianContractStatus) => {
    setSelectedMusician(musician);
    setShowResponseDialog(true);
  };

  // Calculate contract completion stats
  const calculateStats = () => {
    if (!musicians.length) return { 
      pending: 0, 
      accepted: 0, 
      rejected: 0, 
      cancelled: 0,
      total: 0, 
      completion: 0 
    };
    
    const pending = musicians.filter((m: MusicianContractStatus) => 
      m.status === 'sent' || m.status === 'pending').length;
    
    // Count both "signed" (legacy) and "accepted" as accepted responses
    const accepted = musicians.filter((m: MusicianContractStatus) => 
      m.status === 'signed' || m.status === 'accepted').length;
    
    const rejected = musicians.filter((m: MusicianContractStatus) => 
      m.status === 'rejected').length;
    
    const cancelled = musicians.filter((m: MusicianContractStatus) => 
      m.status === 'cancelled').length;
    
    const total = musicians.length;
    const completion = (accepted + rejected + cancelled) / total * 100;
    
    // Update contract aggregate status based on musician responses
    const updateContractStatus = () => {
      if (!selectedContract) return;
      
      // If all musicians have responded, status should be 'completed'
      if (pending === 0 && total > 0) {
        // This is simulated - in a real app we'd update the backend
        console.log('Contract status should be updated to: completed');
      } 
      // If some musicians have responded but not all, status should be 'in-progress'
      else if (accepted + rejected + cancelled > 0) {
        console.log('Contract status should be updated to: in-progress');
      }
    };
    
    // Only log status changes, don't actually update in this demo
    updateContractStatus();
    
    return { pending, accepted, rejected, cancelled, total, completion };
  };

  const stats = calculateStats();

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-500';
      case 'sent':
        return 'bg-blue-500';
      case 'draft':
        return 'bg-slate-500';
      case 'in-progress':
        return 'bg-amber-500';
      case 'completed':
        return 'bg-emerald-500';
      case 'cancelled':
        return 'bg-rose-500';
      case 'signed': // Legacy support
      case 'accepted':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 mr-1" />;
      case 'sent':
        return <AlertTriangle className="h-4 w-4 mr-1" />;
      case 'draft':
        return <ClipboardIcon className="h-4 w-4 mr-1" />;
      case 'in-progress':
        return <RefreshCw className="h-4 w-4 mr-1" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 mr-1" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 mr-1" />;
      case 'signed': // Legacy support
      case 'accepted':
        return <CheckCircle className="h-4 w-4 mr-1" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 mr-1" />;
      default:
        return <Clock className="h-4 w-4 mr-1" />;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'E, MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Check if a musician's response is overdue (more than 3 days since sent)
  const isResponseOverdue = (musician: MusicianContractStatus) => {
    if (musician.status !== 'sent' && musician.status !== 'pending') return false;
    if (!selectedContract?.sentAt) return false;
    
    const sentDate = new Date(selectedContract.sentAt);
    const threeDaysAfterSent = subDays(new Date(), -3); // Current date minus 3 days
    
    return isBefore(sentDate, threeDaysAfterSent);
  };
  
  // Get musicians who need reminders
  const getOverdueMusicians = () => {
    return musicians.filter((m: MusicianContractStatus) => isResponseOverdue(m));
  };
  
  // Send reminder emails to musicians (simulated)
  const sendReminders = async () => {
    try {
      setSendingReminders(true);
      
      // Simulate API request
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success message
      toast({
        title: "Reminders sent",
        description: `Email reminders sent to ${getOverdueMusicians().length} musicians.`,
        variant: "default",
      });
      
      setShowReminderDialog(false);
    } catch (error) {
      toast({
        title: "Error sending reminders",
        description: "There was a problem sending reminder emails.",
        variant: "destructive",
      });
    } finally {
      setSendingReminders(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Contract Status</h1>
        <p className="text-lg text-gray-600">
          Track musician responses to monthly contracts.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {/* Contract selection panel */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-xl">Select Contract</CardTitle>
              <CardDescription>
                Choose a contract to view status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Month/Year selector */}
              <div className="flex items-center space-x-2">
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => setSelectedMonth(parseInt(value))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {getMonthName(i + 1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isContractsLoading ? (
                <div className="flex justify-center my-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No contracts found for {getMonthName(selectedMonth)} {selectedYear}
                </div>
              ) : (
                <div className="space-y-2">
                  {contracts.map((contract: any) => (
                    <div
                      key={contract.id}
                      className={`p-4 rounded-md cursor-pointer border ${
                        selectedContract?.id === contract.id
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 hover:border-primary/50'
                      }`}
                      onClick={() => handleContractSelect(contract.id.toString())}
                    >
                      <h3 className="font-medium text-lg">{contract.name}</h3>
                      <div className="text-sm text-gray-500">
                        {getMonthName(contract.month)} {contract.year}
                      </div>
                      <div className="flex items-center mt-2">
                        <div>
                          <Badge className={`${getStatusColor(contract.status)} text-white`}>
                            {contract.status === 'signed' ? 'Accepted' : 
                            contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                          </Badge>
                        </div>
                        <span className="ml-2 text-sm">
                          {contract.sentAt ? format(new Date(contract.sentAt), 'MMM d, yyyy') : 'Not sent'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status overview */}
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl">
                {selectedContract 
                  ? `Status: ${selectedContract.name}`
                  : 'Musician Response Status'}
              </CardTitle>
              <CardDescription>
                {selectedContract
                  ? `Sent on ${selectedContract.sentAt ? format(new Date(selectedContract.sentAt), 'MMMM d, yyyy') : 'Not sent yet'}`
                  : 'Select a contract to view status'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedContract ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <Calendar className="h-16 w-16 mb-4" />
                  <p className="text-lg">Please select a contract from the left panel</p>
                </div>
              ) : isMusiciansLoading ? (
                <div className="flex justify-center my-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {/* Stats overview */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-blue-500 text-sm font-medium">Total</div>
                      <div className="text-2xl font-bold">{stats.total}</div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <div className="text-amber-500 text-sm font-medium">Pending</div>
                      <div className="text-2xl font-bold">{stats.pending}</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-green-500 text-sm font-medium">Accepted</div>
                      <div className="text-2xl font-bold">{stats.accepted}</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-red-500 text-sm font-medium">Rejected</div>
                      <div className="text-2xl font-bold">{stats.rejected}</div>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-lg">
                      <div className="text-rose-500 text-sm font-medium">Cancelled</div>
                      <div className="text-2xl font-bold">{stats.cancelled}</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Completion</span>
                      <span className="text-sm font-medium">{Math.round(stats.completion)}%</span>
                    </div>
                    <Progress value={stats.completion} className="h-2" />
                  </div>
                  
                  {/* Overdue responses alert */}
                  {getOverdueMusicians().length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
                        <div>
                          <h3 className="text-sm font-medium text-amber-800">
                            {getOverdueMusicians().length} musician{getOverdueMusicians().length > 1 ? 's' : ''} with overdue responses
                          </h3>
                          <p className="text-sm text-amber-700 mt-1">
                            These musicians have not responded to their contract within the expected timeframe.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 bg-white border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() => setShowReminderDialog(true)}
                          >
                            <MailIcon className="h-4 w-4 mr-2" />
                            Send Reminder Emails
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Search bar */}
                  <div className="relative mb-4">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search musicians..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Musicians list */}
                  {musicians.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No musicians found for this contract
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Musician</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Dates</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {musicians.map((musician: MusicianContractStatus) => (
                            <TableRow key={musician.id} className="text-base">
                              <TableCell className="font-medium">
                                {musician.musician.name}
                              </TableCell>
                              <TableCell>
                                {musician.musician.email}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <Badge className={`${getStatusColor(musician.status)} text-white flex items-center w-fit`}>
                                    {getStatusIcon(musician.status)}
                                    {musician.status === 'signed' 
                                      ? 'Accepted' 
                                      : musician.status.charAt(0).toUpperCase() + musician.status.slice(1)}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                {musician.dates?.length || 0} dates
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewMusicianResponse(musician)}
                                >
                                  View Responses
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reminder dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">Send Reminder Emails</DialogTitle>
            <DialogDescription>
              This will send reminder emails to all musicians who have not responded to their contracts.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <h3 className="font-medium mb-2">Musicians to remind:</h3>
            <div className="border rounded-md overflow-auto max-h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getOverdueMusicians().map((musician: MusicianContractStatus) => (
                    <TableRow key={musician.id}>
                      <TableCell className="font-medium">{musician.musician.name}</TableCell>
                      <TableCell>{musician.musician.email}</TableCell>
                      <TableCell>
                        <div>
                          <Badge className={`${getStatusColor(musician.status)} text-white flex items-center w-fit`}>
                            {getStatusIcon(musician.status)}
                            {musician.status === 'signed' 
                              ? 'Accepted' 
                              : musician.status.charAt(0).toUpperCase() + musician.status.slice(1)}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-md mt-4 text-sm text-blue-700">
              <p className="flex items-center">
                <Info className="h-4 w-4 mr-2" />
                Reminder emails will include a link to the musician's contract and a friendly reminder to respond.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderDialog(false)}>
              Cancel
            </Button>
            <Button 
              disabled={sendingReminders}
              onClick={sendReminders}
            >
              {sendingReminders ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MailIcon className="mr-2 h-4 w-4" />
                  Send Reminders
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Response details dialog */}
      {selectedMusician && (
        <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Musician Responses</DialogTitle>
              <DialogDescription>
                {selectedMusician.musician.name}'s responses to contract dates
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="mb-6">
                {/* Musician status info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center mb-2">
                      <div className="font-medium mr-2">Overall Status:</div>
                      <div className="flex space-x-2 items-center">
                        <Badge className={`${getStatusColor(selectedMusician.status)} text-white`}>
                          {selectedMusician.status === 'signed' ? 'Accepted' : selectedMusician.status.charAt(0).toUpperCase() + selectedMusician.status.slice(1)}
                        </Badge>
                        
                        <Select
                          onValueChange={(value) => {
                            // In a real application, we would update the status in the database
                            toast({
                              title: "Status updated",
                              description: `Status updated to: ${value}`,
                              variant: "default",
                            });
                          }}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue placeholder="Change status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {selectedMusician.sentAt && (
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Sent:</span> {format(new Date(selectedMusician.sentAt), 'MMMM d, yyyy h:mm a')}
                      </div>
                    )}
                    {selectedMusician.respondedAt && (
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Responded:</span> {format(new Date(selectedMusician.respondedAt), 'MMMM d, yyyy h:mm a')}
                      </div>
                    )}
                  </div>
                  
                  {/* Digital signature info */}
                  <div className="space-y-2 border-l pl-4">
                    {selectedMusician.musicianSignature && (
                      <div className="text-sm">
                        <span className="font-medium">Digital Signature:</span> {selectedMusician.musicianSignature}
                      </div>
                    )}
                    {selectedMusician.ipAddress && (
                      <div className="text-sm">
                        <span className="font-medium">IP Address:</span> {selectedMusician.ipAddress}
                      </div>
                    )}
                    {(selectedMusician.status === 'signed' || selectedMusician.status === 'accepted') && !selectedMusician.musicianSignature && (
                      <div className="text-sm text-amber-500">
                        <span className="font-medium">Note:</span> No digital signature recorded
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="border rounded-md">
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
                    {selectedMusician.dates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                          No dates found for this contract
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedMusician.dates.map((date: ContractDateStatus) => (
                        <TableRow key={date.id}>
                          <TableCell className="font-medium">
                            {formatDate(date.date)}
                          </TableCell>
                          <TableCell>${parseFloat(date.fee).toFixed(2)}</TableCell>
                          <TableCell>
                            <div>
                              <Badge className={`${getStatusColor(date.status)} text-white flex items-center w-fit`}>
                                {getStatusIcon(date.status)}
                                {date.status === 'signed' 
                                  ? 'Accepted' 
                                  : date.status.charAt(0).toUpperCase() + date.status.slice(1)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{date.notes || 'No notes'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
                Close
              </Button>
              {(selectedMusician.status === 'sent' || selectedMusician.status === 'pending') && (
                <Button 
                  onClick={() => {
                    setShowResponseDialog(false);
                    
                    // Simulate sending an individual reminder
                    toast({
                      title: "Reminder sent",
                      description: `A reminder email was sent to ${selectedMusician.musician.name}.`,
                      variant: "default",
                    });
                  }}
                >
                  <MailIcon className="mr-2 h-4 w-4" />
                  Send Reminder
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ContractStatusPage;