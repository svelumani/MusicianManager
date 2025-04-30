import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MusicianInvitation from "@/components/events/MusicianInvitation";
import type { Event, Venue } from "@shared/schema";
import { format } from "date-fns";

interface InviteMusicianPageProps {
  eventId: number;
}

export default function InviteMusicianPage({ eventId }: InviteMusicianPageProps) {
  const [, navigate] = useLocation();

  const { data: event, isLoading: isLoadingEvent } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
  });

  const { data: venues } = useQuery<Venue[]>({
    queryKey: ["/api/venues"],
  });

  const getVenueName = (venueId: number) => {
    const venue = venues?.find(v => v.id === venueId);
    return venue ? venue.name : "Unknown";
  };

  if (isLoadingEvent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-20" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
        <p className="text-gray-500 mb-4">The event you're looking for doesn't exist.</p>
        <Button onClick={() => navigate("/events")}>Return to Events</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">
          Invite Musicians - {event.name}
        </h1>
        <Button variant="outline" onClick={() => navigate("/events")}>
          Back to Events
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Event Details</CardTitle>
          <CardDescription>
            <div className="mt-2 space-y-1">
              <p>
                <span className="font-medium">Date:</span> {format(new Date(event.startDate), 'MMM dd, yyyy')}
              </p>
              <p>
                <span className="font-medium">Venue:</span> {getVenueName(event.venueId)}
              </p>
              <p>
                <span className="font-medium">Pax Count:</span> {event.paxCount}
              </p>
              <p>
                <span className="font-medium">Status:</span> {event.status}
              </p>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MusicianInvitation eventId={eventId} categoryIds={event.categoryIds || []} />
        </CardContent>
      </Card>
    </div>
  );
}
