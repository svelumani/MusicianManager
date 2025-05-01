import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building, Calendar, Star, MapPin, Users, Clock, DollarSign, ArrowLeft, Edit, Trash } from "lucide-react";
import type { Venue, Event } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function ViewVenuePage({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: venue, isLoading: venueLoading, error: venueError } = useQuery<Venue>({
    queryKey: [`/api/venues/${id}`],
  });

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: [`/api/venues/${id}/events`],
    enabled: !!venue,
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/venues/${id}`);
      return res.ok;
    },
    onSuccess: () => {
      toast({
        title: "Venue deleted",
        description: "The venue has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      navigate("/venues");
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the venue. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle edit button click
  const handleEdit = () => {
    navigate(`/venues/edit/${id}`);
  };
  
  // Handle delete button click
  const handleDelete = () => {
    setShowDeleteDialog(true);
  };
  
  // Confirm delete
  const confirmDelete = () => {
    deleteMutation.mutate();
  };

  // Handle error state
  useEffect(() => {
    if (venueError) {
      toast({
        title: "Error loading venue",
        description: "The venue could not be found or loaded.",
        variant: "destructive",
      });
      navigate("/venues");
    }
  }, [venueError, toast, navigate]);

  if (venueLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!venue) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate("/venues")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{venue.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this venue?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the venue 
              "{venue.name}" and remove its data from our servers.
              {events && events.length > 0 && (
                <p className="mt-2 text-red-500 font-medium">
                  Warning: This venue has {events.length} associated events that will also be affected.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting...
                </div>
              ) : "Delete Venue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Venue Details</CardTitle>
              <CardDescription>View and manage venue information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{venue.name}</h3>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-1" /> 
                    {venue.address}, {venue.location}
                  </div>
                </div>
                <div className="flex items-center bg-primary/10 px-3 py-1 rounded-full">
                  <Star className="h-4 w-4 text-yellow-500 mr-1" />
                  <span className="font-medium">{venue.rating ? venue.rating.toFixed(1) : 'N/A'}</span>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Capacity</div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">{venue.capacity || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Hourly Rate</div>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">${venue.hourlyRate ? venue.hourlyRate.toFixed(2) : 'N/A'}/hr</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Person Count</div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">{venue.paxCount}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Opening Hours</div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">{venue.openingHours || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground">
                  {venue.description || 'No description provided.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Events scheduled at this venue</CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !events || events.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-center p-4">
                  <Calendar className="h-10 w-10 text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900">No events scheduled</h3>
                  <p className="text-muted-foreground">
                    This venue doesn't have any upcoming events.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-start p-3 rounded-md border">
                      <div className="mr-4 bg-primary/10 p-2 rounded-md">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className="font-medium">{event.name}</h4>
                          <Badge variant="outline">{event.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.startDate).toLocaleDateString()} - 
                          {event.endDate ? new Date(event.endDate).toLocaleDateString() : 'Ongoing'}
                        </p>
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground mr-2">Type:</span> {event.eventType}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent>
              {!venue.venuePictures || venue.venuePictures.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center bg-muted/50 rounded-md p-8">
                  <Building className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No photos available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {venue.venuePictures.map((pic, index) => (
                    <div key={index} className="rounded-md overflow-hidden aspect-square">
                      <img
                        src={pic}
                        alt={`${venue.name} - photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Events</span>
                <span className="font-medium">{events?.length || 0}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Average Event Size</span>
                <span className="font-medium">
                  {events && events.length > 0 
                    ? Math.round(events.reduce((sum, event) => sum + event.paxCount, 0) / events.length) 
                    : 'N/A'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Upcoming Events</span>
                <span className="font-medium">
                  {events?.filter(e => new Date(e.startDate) > new Date()).length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}