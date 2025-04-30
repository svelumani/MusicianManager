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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  
  // Get current month and year
  const currentMonth = parseInt(selectedMonth.split("-")[1]);
  const currentYear = parseInt(selectedMonth.split("-")[0]);

  // Query to get monthly planner
  const {
    data: planner,
    isLoading: isPlannerLoading,
    error: plannerError,
  } = useQuery({
    queryKey: ['/api/planners/month', currentMonth, 'year', currentYear],
    queryFn: async () => {
      try {
        return await apiRequest(`/api/planners/month/${currentMonth}/year/${currentYear}`);
      } catch (error) {
        // If planner doesn't exist for this month, the error is expected
        return null;
      }
    },
  });

  // Query to get venues
  const {
    data: venues,
    isLoading: isVenuesLoading,
  } = useQuery({
    queryKey: ['/api/venues'],
  });
  
  // Query to get categories
  const {
    data: categories,
    isLoading: isCategoriesLoading,
  } = useQuery({
    queryKey: ['/api/categories'],
  });

  // Create a new monthly planner
  const createPlannerMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/planners", "POST", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Monthly planner created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/planners'] });
      queryClient.invalidateQueries({ queryKey: ['/api/planners/month', currentMonth, 'year', currentYear] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create monthly planner",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Generate monthly planner if it doesn't exist
  const handleCreatePlanner = () => {
    createPlannerMutation.mutate({
      month: currentMonth,
      year: currentYear,
      name: `Planner for ${format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}`,
      status: "draft"
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
            <Button onClick={handleCreatePlanner} disabled={createPlannerMutation.isPending}>
              {createPlannerMutation.isPending ? "Creating..." : "Create Planner"}
            </Button>
          )}
          {planner && (
            <Link href={`/planner/${planner.id}/invoice`}>
              <Button variant="outline">View Invoices</Button>
            </Link>
          )}
        </div>
      </div>

      {planner ? (
        <PlannerGrid 
          planner={planner} 
          venues={venues || []} 
          categories={categories || []}
          selectedMonth={selectedMonth}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Planner Found</CardTitle>
            <CardDescription>
              There is no planner for the selected month. Create one to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreatePlanner} disabled={createPlannerMutation.isPending}>
              {createPlannerMutation.isPending ? "Creating..." : "Create Planner for This Month"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlannerPage;