import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import EventForm from "@/components/events/EventForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Event as EventType } from "@shared/schema";
import { useMemo } from "react";

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id);
  const [, navigate] = useLocation();

  // Always fetch event data
  const { data: event, isLoading: isLoadingEvent } = useQuery<EventType>({
    queryKey: [`/api/events/${eventId}`],
  });
  
  // Always fetch musicians data - we'll use enabled flag to control when it actually runs
  const musicianIds = useMemo(() => {
    if (!event?.musicianAssignments) return [];
    return Object.values(event.musicianAssignments).flat();
  }, [event]);
  
  const { data: musicians, isLoading: isLoadingMusicians } = useQuery({
    queryKey: ["/api/musicians"],
    enabled: musicianIds.length > 0,
  });
  
  // Process event data to extract musician type IDs
  const eventWithTypes = useMemo(() => {
    if (!event) return null;
    
    console.log("Edit Page Event Data:", event);
    console.log("Musician IDs from assignments:", musicianIds);
    
    let musicianTypeIds: number[] = [];
    
    if (musicians && musicianIds.length > 0) {
      // Find all musicians in the assignments and get their typeIds
      const assignedMusicians = musicians.filter(
        (musician: any) => musicianIds.includes(musician.id)
      );
      
      // Extract unique typeIds from the assigned musicians
      musicianTypeIds = Array.from(new Set(
        assignedMusicians.map((m: any) => m.typeId)
      ));
      console.log("Extracted musician type IDs:", musicianTypeIds);
    }
    
    // Create a modified event object with musicianTypeIds
    return {
      ...event,
      musicianTypeIds
    };
  }, [event, musicians, musicianIds]);
  
  const isLoading = isLoadingEvent || (musicianIds.length > 0 && isLoadingMusicians);

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

  if (!eventWithTypes) {
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