import { useState, useEffect } from "react";
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
  XCircle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

  // Mutation to send a contract
  const sendContractMutation = useMutation({
    mutationFn: (contractId: number) => apiRequest(`/api/monthly-contracts/${contractId}/send`, 'POST'),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contract sent successfully",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/planner-assignments/by-musician/${plannerId}`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to send contract: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Handle sending a contract
  const handleSendContract = (contractId: number) => {
    sendContractMutation.mutate(contractId);
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
          <CardTitle className="text-red-700">Error Loading Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">
            There was a problem loading contracts. Please try again later.
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!contracts || contracts.length === 0) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Monthly Contracts</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Contract Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Musicians</TableHead>
                <TableHead>Dates</TableHead>
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
                    <Badge variant="outline" className="bg-gray-100">
                      {contract.dateCount || 0} dates
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}