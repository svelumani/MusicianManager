import { useEffect } from "react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

const EventsPlannerPage = () => {
  const [location, setLocation] = useLocation();

  // This is a redirect page - simply redirect to the /planner page
  useEffect(() => {
    // Use a short delay to allow rendering before navigating
    const timer = setTimeout(() => {
      setLocation("/planner", { replace: true });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Monthly Planner</h1>
        <p className="text-lg text-gray-600">
          Redirecting to planner page...
        </p>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
};

export default EventsPlannerPage;