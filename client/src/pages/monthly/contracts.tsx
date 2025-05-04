import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  FileText, 
  CheckCircle, 
  CheckCircle as CheckCircle2, // Using CheckCircle as a substitute
  Clock, 
  Send, 
  Search, 
  AlertTriangle,
  XCircle,
  Clock as Hourglass // Using Clock as a substitute
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MonthlyContractsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  // Format month names
  const getMonthName = (month: number) => {
    return format(new Date(2000, month - 1, 1), 'MMMM');
  };
  
  // Query to get monthly contracts
  const {
    data: contracts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/monthly-contracts'],
    queryFn: async () => {
      const contractsData = await apiRequest('/api/monthly-contracts');
      
      // For each contract, fetch additional details like dates
      if (Array.isArray(contractsData)) {
        const contractsWithDetails = await Promise.all(
          contractsData.map(async (contract) => {
            try {
              // Get the dates for this contract
              const assignments = await apiRequest(`/api/monthly-contracts/${contract.id}/assignments`);
              
              // Calculate total number of dates across all musicians
              let allDates: any[] = [];
              let dateCount = 0;
              
              if (Array.isArray(assignments)) {
                assignments.forEach((assignment: any) => {
                  if (Array.isArray(assignment.dates)) {
                    dateCount += assignment.dates.length;
                    allDates = [...allDates, ...assignment.dates];
                  }
                });
              }
              
              // Create a summary of dates with fees
              const dateList = allDates.length > 0 
                ? allDates.slice(0, 5).map((date: any) => ({
                    date: date.date,
                    fee: date.fee,
                    venue: date.venueName || 'Unknown venue'
                  }))
                : [];
              
              return {
                ...contract,
                dateCount,
                dateList,
                musicianCount: Array.isArray(assignments) ? assignments.length : 0
              };
            } catch (error) {
              console.error(`Error fetching details for contract ${contract.id}:`, error);
              return {
                ...contract,
                dateCount: 0,
                dateList: [],
                musicianCount: 0
              };
            }
          })
        );
        
        return contractsWithDetails;
      }
      
      return contractsData;
    },
    select: (data: any[]) => {
      // Filter contracts by search query if provided
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return data.filter((contract: any) => 
          contract.name?.toLowerCase().includes(query) ||
          contract.status?.toLowerCase().includes(query)
        );
      }
      return data;
    },
  });

  // Filter contracts by current month/year
  const currentMonthContracts = contracts.filter((contract: any) => 
    contract.month === selectedMonth && contract.year === selectedYear
  );
  
  // Mutation to send a contract
  const sendContractMutation = useMutation({
    mutationFn: (contractId: number) => apiRequest(`/api/monthly-contracts/${contractId}/send`, 'POST'),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contract sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monthly-contracts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send contract",
        variant: "destructive",
      });
    }
  });

  // Handle contract details
  const handleViewContractDetails = (contract: any) => {
    setSelectedContract(contract);
    setShowDetailsDialog(true);
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
        return 'bg-rose-500'; // Changed from amber to rose for consistency
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
        return <Hourglass className="h-4 w-4 mr-1" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 mr-1" />;
      default:
        return <Clock className="h-4 w-4 mr-1" />;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Monthly Contracts</h1>
        <p className="text-lg text-gray-600">
          Create and manage monthly contracts for all musicians.
        </p>
        
        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center w-full md:w-auto space-x-2">
            <div className="flex items-center space-x-2">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select month" />
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
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select year" />
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
          </div>
          
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search contracts..."
              className="pl-8 w-full md:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs for different contract views */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all" className="text-base px-6 py-2">All Contracts</TabsTrigger>
            <TabsTrigger value="pending" className="text-base px-6 py-2">Pending</TabsTrigger>
            <TabsTrigger value="completed" className="text-base px-6 py-2">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            {isLoading ? (
              <div className="flex justify-center my-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : currentMonthContracts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-xl font-medium text-gray-900">No contracts found</p>
                  <p className="text-gray-500 mt-1">
                    No contracts exist for {getMonthName(selectedMonth)} {selectedYear}
                  </p>
                  <Button className="mt-4" size="lg">
                    Create Contract
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">
                    Contracts for {getMonthName(selectedMonth)} {selectedYear}
                  </CardTitle>
                  <CardDescription>
                    Showing {currentMonthContracts.length} contracts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Month</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Number of Days</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentMonthContracts.map((contract: any) => (
                        <TableRow key={contract.id} className="text-base">
                          <TableCell className="font-medium">{contract.id}</TableCell>
                          <TableCell className="font-medium">{contract.name}</TableCell>
                          <TableCell>
                            {getMonthName(contract.month)} {contract.year}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(contract.status)} text-white flex items-center w-fit`}>
                              {getStatusIcon(contract.status)}
                              {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {contract.dateCount || 0} days
                            {contract.dateList && contract.dateList.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {contract.dateList.map((date: any, index: number) => (
                                  <span key={index}>
                                    {format(new Date(date.date), 'MMM d')}: ${date.fee || 0}
                                    {index < contract.dateList.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {contract.createdAt ? format(new Date(contract.createdAt), 'MMM d, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <Link href={`/monthly/contracts/${contract.id}`}>
                                View Details
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="pending" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Pending Contracts</CardTitle>
                <CardDescription>
                  Contracts that need attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Pending contracts content */}
                <p className="text-center py-8 text-gray-500">
                  Pending contracts implementation in progress
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="completed" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Completed Contracts</CardTitle>
                <CardDescription>
                  Fully signed contracts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Completed contracts content */}
                <p className="text-center py-8 text-gray-500">
                  Completed contracts implementation in progress
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Contract Details Dialog */}
      {selectedContract && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Contract Details</DialogTitle>
              <DialogDescription>
                Viewing details for contract #{selectedContract.id}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right font-medium">Name:</div>
                <div className="col-span-3">{selectedContract.name}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right font-medium">Month:</div>
                <div className="col-span-3">
                  {getMonthName(selectedContract.month)} {selectedContract.year}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right font-medium">Status:</div>
                <div className="col-span-3">
                  <Badge className={`${getStatusColor(selectedContract.status)} text-white`}>
                    {selectedContract.status === 'signed' ? 'Accepted' : 
                     selectedContract.status.charAt(0).toUpperCase() + selectedContract.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right font-medium">Created:</div>
                <div className="col-span-3">
                  {selectedContract.createdAt 
                    ? format(new Date(selectedContract.createdAt), 'MMMM d, yyyy h:mm a') 
                    : 'N/A'}
                </div>
              </div>
              {selectedContract.sentAt && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right font-medium">Sent:</div>
                  <div className="col-span-3">
                    {format(new Date(selectedContract.sentAt), 'MMMM d, yyyy h:mm a')}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Close
              </Button>
              <Link href={`/monthly/contracts/${selectedContract.id}`}>
                <Button onClick={() => setShowDetailsDialog(false)}>Go to Contract</Button>
              </Link>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MonthlyContractsPage;