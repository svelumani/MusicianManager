import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Calendar, 
  FileText, 
  CheckCircle, 
  ArrowRight 
} from "lucide-react";

const MonthlyManagementPage = () => {
  // Get current month/year
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  // Format month name
  const monthName = format(new Date(currentYear, currentMonth - 1), 'MMMM');
  
  // Query to get monthly planners for the current month/year
  const {
    data: planner,
    isLoading: isPlannerLoading,
  } = useQuery({
    queryKey: ['/api/planners/month', currentMonth, 'year', currentYear],
    queryFn: async () => {
      try {
        return await apiRequest(`/api/planners/month/${currentMonth}/year/${currentYear}`);
      } catch (error) {
        // Planner might not exist yet
        return null;
      }
    },
  });
  
  // Query to get monthly contracts for the current month/year
  const {
    data: contracts = [],
    isLoading: isContractsLoading,
  } = useQuery({
    queryKey: ['/api/monthly-contracts'],
    select: (data) => {
      return Array.isArray(data) 
        ? data.filter((contract: any) => 
            contract.month === currentMonth && 
            contract.year === currentYear
          )
        : [];
    },
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Monthly Management</h1>
        <p className="text-lg text-gray-600">
          Manage your monthly planning, contracts, and musician status.
        </p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {/* Monthly Planner */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-xl">
                <Calendar className="mr-2 h-5 w-5 text-primary" />
                Monthly Planner
              </CardTitle>
              <CardDescription>
                Create and manage your {monthName} {currentYear} schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {isPlannerLoading ? (
                <div className="flex justify-center my-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : planner ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="text-sm text-gray-500">Status:</div>
                    <div className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                      Active
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Created on: {planner.createdAt ? format(new Date(planner.createdAt), 'MMM d, yyyy') : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-700">
                    {planner.slotCount || 0} events scheduled
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No planner exists for {monthName} {currentYear}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/planner">
                  Go to Monthly Planner <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Monthly Contracts */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-xl">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                Monthly Contracts
              </CardTitle>
              <CardDescription>
                Manage contracts for {monthName} {currentYear}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {isContractsLoading ? (
                <div className="flex justify-center my-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : contracts.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-700">
                    {contracts.length} contracts created
                  </div>
                  <div className="text-sm">
                    Latest contract: {contracts[0]?.name || 'N/A'}
                  </div>
                  <div className="flex items-center">
                    <div className="text-sm text-gray-500">Status:</div>
                    <div className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      contracts[0]?.status === 'draft' 
                        ? 'bg-gray-100 text-gray-800'
                        : contracts[0]?.status === 'sent'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {contracts[0]?.status?.charAt(0).toUpperCase() + contracts[0]?.status?.slice(1) || 'N/A'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No contracts created for {monthName} {currentYear}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/monthly/contracts">
                  Manage Contracts <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Contract Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-xl">
                <CheckCircle className="mr-2 h-5 w-5 text-primary" />
                Contract Status
              </CardTitle>
              <CardDescription>
                Track musician responses for {monthName} {currentYear}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {isContractsLoading ? (
                <div className="flex justify-center my-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : contracts.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-lg font-bold text-amber-500">0</div>
                      <div className="text-xs text-gray-500">Pending</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-500">0</div>
                      <div className="text-xs text-gray-500">Accepted</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-red-500">0</div>
                      <div className="text-xs text-gray-500">Rejected</div>
                    </div>
                  </div>
                  <div className="text-sm text-center text-gray-500">
                    Statistics will update as musicians respond
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  No contract status available yet
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/monthly/status">
                  View Status <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Quick Start Guide */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl">Quick Start Guide</CardTitle>
            <CardDescription>
              Follow these steps to set up your monthly contract system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-bold">
                  1
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium">Create Monthly Planner</h3>
                  <p className="text-gray-600">
                    Start by creating a monthly planner and adding events to the schedule.
                  </p>
                  <Button asChild variant="link" className="p-0 h-auto">
                    <Link href="/planner">
                      Go to Monthly Planner <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="flex">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-bold">
                  2
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium">Generate Monthly Contracts</h3>
                  <p className="text-gray-600">
                    Create contracts from your planner and customize as needed.
                  </p>
                  <Button asChild variant="link" className="p-0 h-auto">
                    <Link href="/monthly/contracts">
                      Create Contracts <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="flex">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-bold">
                  3
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium">Send & Track Status</h3>
                  <p className="text-gray-600">
                    Send contracts to musicians and track their responses.
                  </p>
                  <Button asChild variant="link" className="p-0 h-auto">
                    <Link href="/monthly/status">
                      Track Status <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MonthlyManagementPage;