import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, FileText, AlertTriangle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ContractResponsePage = () => {
  const [location] = useLocation();
  const { toast } = useToast();
  const [comments, setComments] = useState("");
  const [status, setStatus] = useState<"pending" | "signed" | "rejected" | "expired">("pending");
  
  // Extract token from URL
  const params = new URLSearchParams(location.split("?")[1]);
  const token = params.get("token");
  const contractId = params.get("id");
  
  // Fetch contract data using token
  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['/api/monthly-contracts/view-by-token', token],
    queryFn: async () => {
      if (!token || !contractId) return null;
      return await apiRequest(`/api/monthly-contracts/view-by-token?token=${token}&id=${contractId}`, 'GET');
    },
    enabled: !!token && !!contractId,
    // Don't refetch this since it's a one-time use token
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Mutation for responding to contract
  const respondMutation = useMutation({
    mutationFn: async (response: { action: 'sign' | 'reject', comments: string }) => {
      return await apiRequest(`/api/monthly-contracts/respond`, 'POST', {
        token,
        contractId,
        ...response
      });
    },
    onSuccess: (data) => {
      setStatus(data.action === 'sign' ? 'signed' : 'rejected');
      toast({
        title: `Contract ${data.action === 'sign' ? 'Signed' : 'Rejected'}`,
        description: `Thank you for your response.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSign = () => {
    respondMutation.mutate({ action: 'sign', comments });
  };

  const handleReject = () => {
    respondMutation.mutate({ action: 'reject', comments });
  };

  if (isLoading) {
    return (
      <div className="container max-w-3xl py-10">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Loading Contract...</CardTitle>
            <CardDescription>Please wait while we retrieve your contract details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-8">
            <div className="flex justify-center">
              <Clock className="h-16 w-16 text-blue-500 animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="container max-w-3xl py-10">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-red-500">Invalid or Expired Link</CardTitle>
            <CardDescription>
              This contract link is no longer valid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-8">
            <div className="flex justify-center">
              <AlertTriangle className="h-16 w-16 text-red-500" />
            </div>
            <Alert variant="destructive" className="mt-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                The contract link you're trying to access is invalid or has expired. 
                Please contact your administrator for assistance.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "signed") {
    return (
      <div className="container max-w-3xl py-10">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-green-500">Contract Signed Successfully</CardTitle>
            <CardDescription>
              Thank you for signing your performance contract
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-8">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <div className="text-center mt-6">
              <p className="text-lg">
                Your contract has been signed and recorded in our system.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                A confirmation email will be sent to you shortly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="container max-w-3xl py-10">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-red-500">Contract Rejected</CardTitle>
            <CardDescription>
              Your response has been recorded
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-8">
            <div className="flex justify-center">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <div className="text-center mt-6">
              <p className="text-lg">
                You have declined this contract.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                A notification has been sent to the administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>Performance Contract</span>
          </CardTitle>
          <CardDescription>
            Please review the contract details below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 rounded-md border p-4">
            <div>
              <h3 className="font-semibold text-lg">Contract Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-sm font-medium">Musician:</p>
                  <p>{contract.musicianName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Month/Year:</p>
                  <p>{contract.month} {contract.year}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Contract ID:</p>
                  <p>#{contract.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Compensation:</p>
                  <p className="font-semibold">${contract.totalAmount?.toFixed(2) || '0.00'}</p>
                </div>
              </div>
            </div>

            {contract.dates && contract.dates.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Performance Dates:</h4>
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venue</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fee</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {contract.dates.map((date: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2">{date.date}</td>
                          <td className="px-4 py-2">{date.venue}</td>
                          <td className="px-4 py-2">{date.startTime}</td>
                          <td className="px-4 py-2 text-right">${date.fee?.toFixed(2) || '0.00'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {contract.termsAndConditions && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Terms and Conditions:</h4>
                <div className="border rounded-md p-3 bg-gray-50 text-sm whitespace-pre-line">
                  {contract.termsAndConditions}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments (Optional)</Label>
            <Textarea 
              id="comments" 
              placeholder="Enter any comments or questions here..." 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="h-24"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            onClick={handleReject}
            disabled={respondMutation.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" /> 
            Decline Contract
          </Button>
          <Button 
            onClick={handleSign}
            disabled={respondMutation.isPending}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Sign Contract
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ContractResponsePage;