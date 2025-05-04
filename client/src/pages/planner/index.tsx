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

// Critical debugging function
const safeJsonParse = (text: string, fallback: any = null) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON parse failed:", e);
    console.error("Original text:", text?.slice(0, 100) + (text?.length > 100 ? '...' : ''));
    return fallback;
  }
};

const PlannerPage = () => {
  const { toast } = useToast();
  
  // Default to current date, but we'll allow creating future planners
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Initialize with current month
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(currentDate, "yyyy-MM"));
  
  // Get current month and year from selected month string
  const currentMonth = parseInt(selectedMonth.split("-")[1]);
  const currentYear = parseInt(selectedMonth.split("-")[0]);
  
  // Fix rendering issues by tracking loading manually
  const [isManuallyLoading, setIsManuallyLoading] = useState(true);

  // Query to get monthly planner with better debug logging and error handling
  const {
    data: planner,
    isLoading: isPlannerLoading,
    error: plannerError,
    refetch: refetchPlanner,
  } = useQuery({
    queryKey: ['/api/planners/month', currentMonth, 'year', currentYear],
    queryFn: async ({ queryKey }) => {
      try {
        setIsManuallyLoading(true);
        console.log(`Fetching planner for month ${currentMonth} year ${currentYear}`);
        
        // Use fetch directly with credentials to handle auth properly
        const response = await fetch(`/api/planners/month/${currentMonth}/year/${currentYear}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        console.log(`Planner API response status: ${response.status}`);

        if (response.status === 401) {
          console.warn("Unauthorized access to planner. Please log in.");
          setIsManuallyLoading(false);
          return null;
        }

        if (!response.ok) {
          if (response.status === 404) {
            console.log("Planner not found for this month");
            setIsManuallyLoading(false);
            return null;
          }
          
          // For other errors, log them
          const errorText = await response.text();
          console.error(`Error ${response.status}: ${errorText}`);
          setIsManuallyLoading(false);
          return null;
        }

        try {
          // First get response as text
          const responseText = await response.text();
          console.log(`Raw planner response length: ${responseText.length} chars`);
          
          // Then try to parse it safely
          const result = safeJsonParse(responseText);
          console.log("Planner result:", result);
          
          // If planner exists but is empty or invalid, log it clearly
          if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
            console.error("Planner data is empty or invalid:", result);
            setIsManuallyLoading(false);
            return null;
          }
          
          // Check essential fields to verify planner is valid
          if (!result.id || !result.month || !result.year) {
            console.error("Planner data is missing required fields:", result);
            setIsManuallyLoading(false);
            return null;
          }
          
          // Add a small delay to ensure any dependent queries have time to fire properly
          setTimeout(() => {
            setIsManuallyLoading(false);
          }, 100);
          
          return result;
        } catch (e) {
          console.warn("Error processing planner response", e);
          setIsManuallyLoading(false);
          return null;
        }
      } catch (error) {
        console.error("Planner fetch error:", error);
        setIsManuallyLoading(false);
        return null;
      }
    },
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Query to get venues with improved error handling
  const {
    data: venues,
    isLoading: isVenuesLoading,
  } = useQuery<any[]>({
    queryKey: ['/api/venues'],
    queryFn: async () => {
      try {
        // Use direct fetch to handle auth errors better
        const response = await fetch('/api/venues', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.status === 401) {
          console.warn("Unauthorized access to venues. Please log in.");
          return [];
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error ${response.status} fetching venues: ${errorText}`);
          return [];
        }

        try {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        } catch (e) {
          console.warn("Invalid JSON in venues response");
          return [];
        }
      } catch (error) {
        console.error("Error fetching venues:", error);
        return [];
      }
    }
  });
  
  // Query to get categories with improved error handling
  const {
    data: categories,
    isLoading: isCategoriesLoading,
  } = useQuery<any[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      try {
        // Use direct fetch to handle auth errors better
        const response = await fetch('/api/categories', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.status === 401) {
          console.warn("Unauthorized access to categories. Please log in.");
          return [];
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error ${response.status} fetching categories: ${errorText}`);
          return [];
        }

        try {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        } catch (e) {
          console.warn("Invalid JSON in categories response");
          return [];
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
      }
    }
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
  if (isPlannerLoading || isVenuesLoading || isCategoriesLoading || isManuallyLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Monthly Planner</h1>
          <div className="flex items-center gap-4">
            <MonthSelector value={selectedMonth} onChange={setSelectedMonth} disabled={true} />
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-center p-4 text-sm text-blue-700 border border-blue-200 bg-blue-50 rounded-md mb-4">
            <svg className="animate-spin h-5 w-5 mr-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading planner data for {format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}...</span>
          </div>
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