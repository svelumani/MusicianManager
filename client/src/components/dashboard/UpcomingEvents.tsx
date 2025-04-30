import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/shared/StatusBadge";
import type { Event } from "@shared/schema";
import { format } from "date-fns";
import { Music, Guitar, Mic } from "lucide-react";

// Helper function to get a random icon for variety
const getRandomIcon = (id: number) => {
  const icons = [
    <Music className="h-4 w-4" />,
    <Guitar className="h-4 w-4" />,
    <Mic className="h-4 w-4" />
  ];
  return icons[id % icons.length];
};

// Helper function to get a color based on the event status
const getIconColorClass = (status: string) => {
  switch(status) {
    case 'confirmed':
      return 'bg-green-600';
    case 'pending':
      return 'bg-primary-600';
    case 'cancelled':
      return 'bg-red-600';
    default:
      return 'bg-blue-600';
  }
};

interface UpcomingEventsProps {
  events: Event[];
  isLoading: boolean;
}

export default function UpcomingEvents({ events, isLoading }: UpcomingEventsProps) {
  return (
    <Card className="bg-white shadow rounded-lg">
      <CardHeader className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 flex justify-between items-center">
          <span>Upcoming Events</span>
          <Link href="/events">
            <Button variant="link" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              View All
            </Button>
          </Link>
        </h3>
      </CardHeader>
      <CardContent className="px-4 pb-5 sm:px-6 sm:pb-6">
        <div className="mt-2 overflow-hidden">
          <div className="flow-root">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : events.length > 0 ? (
              <ul className="-my-5 divide-y divide-gray-200">
                {events.map((event) => (
                  <li key={event.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`h-10 w-10 flex items-center justify-center rounded-md ${getIconColorClass(event.status)} text-white`}>
                          {getRandomIcon(event.id)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {event.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          <i className="fas fa-calendar-day mr-1"></i> {format(new Date(event.startDate), 'MMMM dd, yyyy')}
                          <span className="mx-2">•</span>
                          <i className="fas fa-map-marker-alt mr-1"></i> Venue #{event.venueId}
                        </p>
                      </div>
                      <div>
                        <StatusBadge status={event.status} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No upcoming events</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
