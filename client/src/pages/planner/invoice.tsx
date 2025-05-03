import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, FileText, CheckCircle, Printer, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PlannerInvoicePage = () => {
  const { toast } = useToast();
  const { id } = useParams();
  const plannerId = parseInt(id);

  // Query to get planner
  const {
    data: planner,
    isLoading: isPlannerLoading,
  } = useQuery({
    queryKey: ['/api/planners', plannerId],
    enabled: !isNaN(plannerId),
  });

  // Query to get invoices
  const {
    data: invoices,
    isLoading: isInvoicesLoading,
  } = useQuery({
    queryKey: ['/api/monthly-invoices', plannerId],
    queryFn: () => apiRequest(`/api/monthly-invoices?plannerId=${plannerId}`),
    enabled: !isNaN(plannerId),
  });

  // Query to get musicians
  const {
    data: musicians,
    isLoading: isMusiciansLoading,
  } = useQuery({
    queryKey: ['/api/musicians'],
  });

  // Generate invoices mutation
  const generateInvoicesMutation = useMutation({
    mutationFn: () => apiRequest(`/api/planners/${plannerId}/generate-invoices`, "POST"),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoices generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monthly-invoices', plannerId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate invoices",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Finalize invoice mutation
  const finalizeInvoiceMutation = useMutation({
    mutationFn: (invoiceId: number) => apiRequest(`/api/monthly-invoices/${invoiceId}/finalize`, "POST"),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice finalized successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monthly-invoices', plannerId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to finalize invoice",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Mark invoice as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: (invoiceId: number) => apiRequest(`/api/monthly-invoices/${invoiceId}/mark-paid`, "POST"),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice marked as paid successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/monthly-invoices', plannerId] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark invoice as paid",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Get musician name by ID
  const getMusicianName = (musicianId: number) => {
    if (!musicians) return "Unknown Musician";
    const musician = musicians.find((m: any) => m.id === musicianId);
    return musician ? musician.name : "Unknown Musician";
  };

  // Format amount as currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'finalized':
        return <Badge variant="secondary">Finalized</Badge>;
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Handle finalizing an invoice
  const handleFinalizeInvoice = (invoiceId: number) => {
    finalizeInvoiceMutation.mutate(invoiceId);
  };

  // Handle marking an invoice as paid
  const handleMarkAsPaid = (invoiceId: number) => {
    markAsPaidMutation.mutate(invoiceId);
  };

  // Handle generating invoices
  const handleGenerateInvoices = () => {
    generateInvoicesMutation.mutate();
  };

  // If data is loading, show skeleton
  if (isPlannerLoading || isInvoicesLoading || isMusiciansLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Link href="/events/planner">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Monthly Invoices</h1>
        </div>
        
        <Button 
          onClick={handleGenerateInvoices}
          disabled={generateInvoicesMutation.isPending}
        >
          {generateInvoicesMutation.isPending ? "Generating..." : "Generate Invoices"}
        </Button>
      </div>

      {planner && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {planner.name || `Planner for ${format(new Date(planner.year, planner.month - 1), 'MMMM yyyy')}`}
            </CardTitle>
            <CardDescription>
              Month: {format(new Date(planner.year, planner.month - 1), 'MMMM yyyy')}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {invoices && invoices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {invoices.map((invoice: any) => (
            <Card key={invoice.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle>{getMusicianName(invoice.musicianId)}</CardTitle>
                  {getStatusBadge(invoice.status)}
                </div>
                <CardDescription>
                  Invoice #{invoice.id} • Generated on {format(new Date(invoice.generatedAt), 'MMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Total Slots:</span>
                    <span className="font-medium">{invoice.totalSlots}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Attended Slots:</span>
                    <span className="font-medium">{invoice.attendedSlots}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Attendance Rate:</span>
                    <span className="font-medium">
                      {Math.round((invoice.attendedSlots / invoice.totalSlots) * 100)}%
                    </span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Total Amount:</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(invoice.totalAmount)}
                    </span>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    {invoice.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleFinalizeInvoice(invoice.id)}
                        disabled={finalizeInvoiceMutation.isPending}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Finalize
                      </Button>
                    )}
                    
                    {invoice.status === 'finalized' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsPaid(invoice.id)}
                        disabled={markAsPaidMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark as Paid
                      </Button>
                    )}
                    
                    <Button size="sm" variant="ghost">
                      <Printer className="h-4 w-4 mr-1" />
                      Print
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Invoices Found</CardTitle>
            <CardDescription>
              There are no invoices for this planner yet. Generate invoices to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleGenerateInvoices}
              disabled={generateInvoicesMutation.isPending}
            >
              {generateInvoicesMutation.isPending ? "Generating..." : "Generate Invoices"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlannerInvoicePage;