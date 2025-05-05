import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
  CheckCircle,
  Clock,
  FileText,
  Send,
  AlertTriangle,
  XCircle
} from "lucide-react";

const MonthlyContractDetailPage = () => {
  const params = useParams();
  const contractId = params.id ? parseInt(params.id) : null;

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
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Preview Contract
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
                          <TableCell>{assignment.dateCount || 0} dates</TableCell>
                          <TableCell>
                            <Badge className={`${
                              assignment.status === 'accepted' ? 'bg-green-500' :
                              assignment.status === 'rejected' ? 'bg-red-500' :
                              assignment.status === 'pending' ? 'bg-amber-500' :
                              'bg-gray-500'
                            } text-white`}>
                              {assignment.status || 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">View Responses</Button>
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
    </div>
  );
};

export default MonthlyContractDetailPage;