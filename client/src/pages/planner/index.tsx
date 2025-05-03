import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import PlannerGrid from "@/components/planner/PlannerGrid";
import MonthSelector from "@/components/planner/MonthSelector";

const PlannerPage = () => {
  const { toast } = useToast();
  
  // Default to current date, but we'll allow creating future planners
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Initialize with current month, or March 2025 as requested
  const marchDate = new Date(2025, 2, 1); // March is month 2 (zero-indexed)
  const [selectedMonth, setSelectedMonth] = useState(format(marchDate, "yyyy-MM"));
  
  // Get current month and year from selected month string
  const currentMonth = parseInt(selectedMonth.split("-")[1]);
  const currentYear = parseInt(selectedMonth.split("-")[0]);

  // Query to get monthly planner
  const {
    data: planner,
    isLoading: isPlannerLoading,
    error: plannerError,
  } = useQuery({
    queryKey: ['/api/planners/month', currentMonth, 'year', currentYear],
    queryFn: async ({ queryKey }) => {
      try {
        const result = await apiRequest(`/api/planners/month/${currentMonth}/year/${currentYear}`);
        console.log("Planner result:", result);
        return result;
      } catch (error) {
        console.log("Planner error:", error);
        // If planner doesn't exist for this month, the error is expected
        return null;
      }
    },
  });

  // Query to get venues with proper typing
  const {
    data: venues,
    isLoading: isVenuesLoading,
  } = useQuery<any[]>({
    queryKey: ['/api/venues'],
    select: (data) => Array.isArray(data) ? data : [],
  });
  
  // Query to get categories with proper typing
  const {
    data: categories,
    isLoading: isCategoriesLoading,
  } = useQuery<any[]>({
    queryKey: ['/api/categories'],
    select: (data) => Array.isArray(data) ? data : [],
  });

  // Create a new monthly planner
  const createPlannerMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/planners", "POST", data),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Monthly planner created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/planners'] });
      queryClient.invalidateQueries({ queryKey: ['/api/planners/month', currentMonth, 'year', currentYear] });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to create monthly planner";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Generate monthly planner if it doesn't exist
  const handleCreatePlanner = () => {
    console.log("Creating planner with data:", {
      month: currentMonth,
      year: currentYear,
      name: `Planner for ${format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}`,
      status: "draft",
      description: `Monthly planner for ${format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}`
    });
    
    createPlannerMutation.mutate({
      month: currentMonth,
      year: currentYear,
      name: `Planner for ${format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}`,
      status: "draft",
      description: `Monthly planner for ${format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}`
    });
  };

  // When month changes, update the selected date
  useEffect(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    setSelectedDate(new Date(year, month - 1, 1));
  }, [selectedMonth]);

  // If planner, venues, or categories are loading, show skeleton
  if (isPlannerLoading || isVenuesLoading || isCategoriesLoading) {
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
        <h1 className="text-3xl font-bold">Monthly Planner</h1>
        <div className="flex items-center gap-4">
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          {!planner && (
            <Button 
              onClick={handleCreatePlanner} 
              disabled={createPlannerMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createPlannerMutation.isPending ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                <>
                  {currentMonth === 3 && currentYear === 2025 ? 
                    "Create March 2025 Planner" : 
                    `Create ${format(new Date(currentYear, currentMonth - 1), 'MMM yyyy')} Planner`
                  }
                </>
              )}
            </Button>
          )}
          {planner && (
            <Link href={`/events/planner/${planner.id}/invoice`}>
              <Button variant="outline">View Invoices</Button>
            </Link>
          )}
        </div>
      </div>

      {planner ? (
        <PlannerGrid 
          planner={planner} 
          venues={Array.isArray(venues) ? venues : []} 
          categories={Array.isArray(categories) ? categories : []}
          selectedMonth={selectedMonth}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Planner Found for {format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}</CardTitle>
            <CardDescription>
              {currentMonth === 3 && currentYear === 2025 ? (
                <>
                  <span className="font-semibold text-blue-600">March 2025 planner</span> needs to be created for VAMP schedule management. 
                  Create it now to start adding venues and musicians.
                </>
              ) : (
                <>
                  There is no planner for {format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}. 
                  Create one to get started with scheduling for this month.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleCreatePlanner} 
              disabled={createPlannerMutation.isPending}
              className="w-full"
            >
              {createPlannerMutation.isPending ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                <>Create {format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')} Planner</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlannerPage;