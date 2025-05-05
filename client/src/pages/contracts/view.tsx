import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Mail,
  Calendar,
  User,
  FileCheck,
  ArrowLeft,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Helper for formatting dates
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  let color = '';
  let icon = null;
  
  switch (status) {
    case 'pending':
      color = 'bg-yellow-100 text-yellow-800';
      icon = <Clock className="w-4 h-4 mr-1" />;
      break;
    case 'sent':
      color = 'bg-pink-100 text-pink-800';
      icon = <Send className="w-4 h-4 mr-1" />;
      break;
    case 'signed':
    case 'approved':
    case 'accepted':
      color = 'bg-green-100 text-green-800';
      icon = <CheckCircle className="w-4 h-4 mr-1" />;
      break;
    case 'rejected':
    case 'declined':
      color = 'bg-red-100 text-red-800';
      icon = <XCircle className="w-4 h-4 mr-1" />;
      break;
    default:
      color = 'bg-gray-100 text-gray-800';
      icon = <AlertCircle className="w-4 h-4 mr-1" />;
  }
  
  return (
    <Badge variant="outline" className={`${color} flex items-center`}>
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export default function ContractView() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Extract contract ID from URL
  const params = new URLSearchParams(window.location.search);
  const contractId = params.get('id');
  
  // Fetch contract details
  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['/api/monthly-contracts', contractId],
    queryFn: async () => {
      if (!contractId) return null;
      const response = await fetch(`/api/monthly-contracts/${contractId}`);
      if (!response.ok) {
        throw new Error('Failed to load contract');
      }
      return response.json();
    },
    enabled: !!contractId,
  });
  
  // Fetch contract musicians
  const { data: musicians, isLoading: loadingMusicians } = useQuery({
    queryKey: ['/api/monthly-contracts', contractId, 'musicians'],
    queryFn: async () => {
      if (!contractId) return [];
      const response = await fetch(`/api/monthly-contracts/${contractId}/musicians`);
      if (!response.ok) {
        throw new Error('Failed to load contract musicians');
      }
      return response.json();
    },
    enabled: !!contractId,
  });

  // Handle send contract
  const handleSendContract = async () => {
    try {
      const response = await fetch(`/api/monthly-contracts/${contractId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to send contracts');
      }
      
      const result = await response.json();
      
      toast({
        title: 'Contracts Sent',
        description: `Successfully sent ${result.sent} contracts, ${result.failed} failed.`,
        variant: result.failed > 0 ? 'destructive' : 'default',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/monthly-contracts', contractId] });
      queryClient.invalidateQueries({ queryKey: ['/api/monthly-contracts', contractId, 'musicians'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send contracts',
        variant: 'destructive',
      });
    }
  };
  
  // Format month name
  const getMonthName = (monthNum: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthNum - 1];
  };
  
  // Display loading state
  if (isLoading || loadingMusicians) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="large" />
      </div>
    );
  }
  
  // Display error state
  if (error || !contract) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>
              Failed to load contract details. The contract may not exist or you may not have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => setLocation('/monthly-planner')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Monthly Planner
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button variant="outline" size="sm" onClick={() => setLocation('/monthly-planner')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold mt-2">Contract Details</h1>
          <p className="text-gray-500">
            {getMonthName(contract.month)} {contract.year} - {contract.name || 'Contract'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <StatusBadge status={contract.status} />
          
          {(contract.status === 'draft' || contract.status === 'pending') && (
            <Button 
              onClick={handleSendContract}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="mr-2 h-4 w-4" /> Send Contracts
            </Button>
          )}
        </div>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-muted-foreground" />
            Contract Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Month/Year:</p>
                  <p>{getMonthName(contract.month)} {contract.year}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status:</p>
                  <StatusBadge status={contract.status} />
                </div>
                <div>
                  <p className="text-sm font-medium">Created:</p>
                  <p>{contract.createdAt ? formatDate(contract.createdAt) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Last Updated:</p>
                  <p>{contract.updatedAt ? formatDate(contract.updatedAt) : 'N/A'}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Musicians:</p>
                  <p>{musicians?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Dates:</p>
                  <p>{contract.dateCount || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Average Fee:</p>
                  <p>{musicians && musicians.length > 0 
                    ? formatCurrency(musicians.reduce((sum: number, m: any) => sum + (m.totalFee || 0), 0) / musicians.length) 
                    : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Value:</p>
                  <p>{musicians && musicians.length > 0 
                    ? formatCurrency(musicians.reduce((sum: number, m: any) => sum + (m.totalFee || 0), 0))
                    : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <h2 className="text-xl font-semibold mb-3 flex items-center">
        <User className="mr-2 h-5 w-5 text-muted-foreground" />
        Musicians
      </h2>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Musician</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Total Fee</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {musicians && musicians.length > 0 ? (
                musicians.map((musician: any) => (
                  <TableRow key={musician.id}>
                    <TableCell className="font-medium">{musician.musicianName}</TableCell>
                    <TableCell>
                      <StatusBadge status={musician.status} />
                    </TableCell>
                    <TableCell>
                      {musician.totalDates || 0} {(musician.acceptedDates && musician.pendingDates) ? (
                        <span className="text-sm text-muted-foreground">
                          ({musician.acceptedDates || 0} accepted, {musician.pendingDates || 0} pending{musician.rejectedDates ? `, ${musician.rejectedDates} rejected` : ''})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{formatCurrency(musician.totalFee || 0)}</TableCell>
                    <TableCell>{musician.updatedAt ? formatDate(musician.updatedAt) : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="h-8">
                        <FileCheck className="h-4 w-4 mr-1" /> Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No musicians found in this contract.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="bg-muted/50 px-6 py-3">
          <div className="text-sm text-muted-foreground">
            {musicians?.length 
              ? `Showing ${musicians.length} musician${musicians.length !== 1 ? 's' : ''}`
              : 'No musicians found'}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}