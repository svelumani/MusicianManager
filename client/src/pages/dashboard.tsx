import { useQuery } from "@tanstack/react-query";
import MetricsCard from "@/components/dashboard/MetricsCard";
import UpcomingEvents from "@/components/dashboard/UpcomingEvents";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import MusiciansCalendar from "@/components/dashboard/MusiciansCalendar";
import FinancialSummary from "@/components/dashboard/FinancialSummary";
import { BarChart4, Calendar, Users, Building } from "lucide-react";

export default function Dashboard() {
  const { data: metricsData, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: activities, isLoading: isLoadingActivities } = useQuery({
    queryKey: ["/api/dashboard/activities"],
  });

  const { data: upcomingEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: ["/api/dashboard/upcoming-events"],
  });

  return (
    <div className="space-y-5">
      {/* Dashboard: Metrics Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="Total Bookings"
          value={metricsData?.totalBookings || 0}
          icon={<BarChart4 className="h-5 w-5" />}
          iconBgColor="bg-primary-100"
          iconColor="text-primary-600"
          link="/events"
          isLoading={isLoadingMetrics}
        />
        <MetricsCard
          title="Active Events"
          value={metricsData?.activeEvents || 0}
          icon={<Calendar className="h-5 w-5" />}
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          link="/events"
          isLoading={isLoadingMetrics}
        />
        <MetricsCard
          title="Total Musicians"
          value={metricsData?.totalMusicians || 0}
          icon={<Users className="h-5 w-5" />}
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          link="/musicians"
          isLoading={isLoadingMetrics}
        />
        <MetricsCard
          title="Total Venues"
          value={metricsData?.totalVenues || 0}
          icon={<Building className="h-5 w-5" />}
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          link="/venues"
          isLoading={isLoadingMetrics}
        />
      </div>

      {/* Dashboard: Main Content */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Upcoming Events */}
        <UpcomingEvents events={upcomingEvents || []} isLoading={isLoadingEvents} />
        
        {/* Recent Activity */}
        <ActivityFeed activities={activities || []} isLoading={isLoadingActivities} />
      </div>

      {/* Dashboard: Second Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Musician Availability Calendar */}
        <MusiciansCalendar />
        
        {/* Financial Summary */}
        <FinancialSummary data={metricsData?.revenueData || []} isLoading={isLoadingMetrics} />
      </div>
    </div>
  );
}
