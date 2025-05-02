import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import EventForm from "@/components/events/EventForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Event as EventType } from "@shared/schema";

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id);
  const [, navigate] = useLocation();

  const { data: event, isLoading } = useQuery<EventType>({
    queryKey: [`/api/events/${eventId}`],
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Event Not Found</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p>The event you are trying to edit could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Debug log for event data
  console.log("Edit Page Event Data:", event);

  // Query for musicians based on IDs in musicianAssignments to get their types
  const musicianIds = Object.values(event.musicianAssignments || {}).flat();
  console.log("Musician IDs from assignments:", musicianIds);
  
  const { data: musicians } = useQuery({
    queryKey: ["/api/musicians"],
    enabled: musicianIds.length > 0,
  });
  
  // Extract musician type IDs from the musicians in the assignments
  let musicianTypeIds: number[] = [];
  
  if (musicians && musicianIds.length > 0) {
    // Find all musicians in the assignments and get their typeIds
    const assignedMusicians = musicians.filter(
      (musician: any) => musicianIds.includes(musician.id)
    );
    
    // Extract unique typeIds from the assigned musicians
    musicianTypeIds = [...new Set(assignedMusicians.map((m: any) => m.typeId))];
    console.log("Extracted musician type IDs:", musicianTypeIds);
  }
  
  // Create a modified event object with musicianTypeIds
  const eventWithTypes = {
    ...event,
    musicianTypeIds
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Edit Event</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Event Information</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm 
            onSuccess={() => navigate(`/events/${eventId}`)} 
            onCancel={() => navigate(`/events/${eventId}`)}
            initialData={eventWithTypes}
          />
        </CardContent>
      </Card>
    </div>
  );
}