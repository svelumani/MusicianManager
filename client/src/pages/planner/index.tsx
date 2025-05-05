import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { Link, useLocation } from "wouter";
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
  const [location, setLocation] = useLocation();
  
  // Ref to store timestamp for cache busting
  const timestampRef = useRef(new Date().getTime());
  
  // Parse URL query parameters for better navigation
  const getQueryParams = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return {
        month: params.get('month'),
        id: params.get('id'),
        timestamp: params.get('t'),
        status: params.get('status'),
        refresh: params.get('refresh')
      };
    }
    return { month: null, id: null, timestamp: null, status: null, refresh: null };
  };
  
  const urlParams = getQueryParams();
  
  // Default to current date, but we'll allow creating future planners
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Initialize with current month or month from URL parameters
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Check if we have a month parameter in the URL
    if (urlParams.month) {
      const [month, year] = urlParams.month.split('-');
      if (month && year) {
        return `${year}-${month.padStart(2, '0')}`;
      }
    }
    return format(currentDate, "yyyy-MM");
  });
  
  // Get current month and year from selected month string
  const currentMonth = parseInt(selectedMonth.split("-")[1]);
  const currentYear = parseInt(selectedMonth.split("-")[0]);
  
  // Force planner refresh when timestamp or status params are present
  useEffect(() => {
    if (urlParams.timestamp || urlParams.refresh === 'true') {
      console.log("URL contains refresh parameters, invalidating cache");
      // Clear all planner related caches
      queryClient.invalidateQueries({ queryKey: ['/api/planners'] });
      queryClient.invalidateQueries({ queryKey: ['/api/planner-slots'] });
      queryClient.invalidateQueries({ queryKey: ['/api/planner-assignments'] });
    }
  }, [urlParams.timestamp, urlParams.refresh]);

  // Query to get monthly planner with cache-busting for status changes
  const {
    data: planner,
    isLoading: isPlannerLoading,
    error: plannerError,
  } = useQuery({
    queryKey: ['/api/planners/month', currentMonth, 'year', currentYear, urlParams.timestamp || timestampRef.current],
    queryFn: async ({ queryKey }) => {
      try {
        // Use the planner ID from URL if available for a more direct fetch
        if (urlParams.id) {
          console.log(`Loading planner with specific ID: ${urlParams.id}`);
          const result = await apiRequest(`/api/planners/${urlParams.id}`);
          return result;
        } else {
          // Otherwise fetch by month/year
          console.log(`Loading planner by month: ${currentMonth}/${currentYear}`);
          const result = await apiRequest(`/api/planners/month/${currentMonth}/year/${currentYear}`);
          return result;
        }
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
                  Create {format(new Date(currentYear, currentMonth - 1), 'MMM yyyy')} Planner
                </>
              )}
            </Button>
          )}
          {/* "View Invoices" button removed for UI streamlining */}
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
              There is no planner for {format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}. 
              Create one to get started with scheduling for this month.
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