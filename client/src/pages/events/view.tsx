import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Edit, User, Users, MapPin, FileText, Briefcase, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { Event as EventType, Venue, Musician } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export default function ViewEventPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id);
  const [activeTab, setActiveTab] = useState<string>("details");

  // Fetch the event data
  const { 
    data: event, 
    isLoading: isLoadingEvent,
    error: eventError
  } = useQuery<EventType>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !isNaN(eventId),
  });

  // Fetch venue data
  const { data: venues } = useQuery<Venue[]>({
    queryKey: ["/api/venues"],
  });

  // Fetch musicians data for the event
  const { data: musicians } = useQuery<Musician[]>({
    queryKey: ["/api/musicians"],
  });

  // Show error if event can't be loaded
  useEffect(() => {
    if (eventError) {
      toast({
        variant: "destructive",
        title: "Error loading event",
        description: "Could not load the event details. Please try again.",
      });
    }
  }, [eventError, toast]);

  // Get venue details
  const venue = venues?.find(v => v.id === event?.venueId);

  // Return loading state
  if (isLoadingEvent) {
    return (
      <div className="container py-10">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Return error state if event not found
  if (!event) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
            <CardDescription>
              The event you're looking for doesn't exist or you don't have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/events")}>
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format event dates for display
  const formattedStartDate = event.startDate ? format(new Date(event.startDate), "MMMM d, yyyy") : "Not specified";
  const formattedEndDate = event.endDate ? format(new Date(event.endDate), "MMMM d, yyyy") : "Not specified";
  const isMultiDay = event.eventDates && event.eventDates.length > 1;

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return <Badge className="bg-green-600">Confirmed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "pending":
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{event.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <div className="flex items-center">
              <CalendarDays className="h-4 w-4 mr-1" />
              {isMultiDay ? (
                <span>
                  {formattedStartDate} to {formattedEndDate}
                </span>
              ) : (
                <span>{formattedStartDate}</span>
              )}
            </div>
            {getStatusBadge(event.status)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/events/${eventId}/invite`)}
          >
            <Users className="mr-2 h-4 w-4" />
            Invite Musicians
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate(`/events/${eventId}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="musicians">Musicians</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Number of Pax</p>
                    <p className="text-lg">{event.paxCount}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <div className="text-lg">{getStatusBadge(event.status)}</div>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Venue</p>
                  <div className="flex items-start mt-1">
                    <MapPin className="h-5 w-5 text-muted-foreground mr-2 mt-0.5" />
                    <div>
                      <p className="text-lg font-medium">{venue?.name || "Not assigned"}</p>
                      {venue?.location && <p className="text-sm text-muted-foreground">{venue.location}</p>}
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Event Dates</p>
                  <div className="flex flex-col gap-2 mt-2">
                    {event.eventDates?.map((dateStr, index) => {
                      const date = new Date(dateStr);
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{format(date, "EEEE, MMMM d, yyyy")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {event.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Notes</p>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        <p className="whitespace-pre-line">{event.notes}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Payment</p>
                    <p className="text-lg">{event.totalPayment ? `$${event.totalPayment.toFixed(2)}` : "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Advance Payment</p>
                    <p className="text-lg">{event.advancePayment ? `$${event.advancePayment.toFixed(2)}` : "Not set"}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="mr-2">
                      To be implemented
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="musicians" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Musicians</CardTitle>
              <CardDescription>
                The following musicians are assigned to this event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Musician assignments will be displayed here once they are added.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/events/${eventId}/invite`)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Invite Musicians
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contracts</CardTitle>
              <CardDescription>
                Manage contracts for musicians assigned to this event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                First invite musicians to the event, then you can manage their contracts from here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Details</CardTitle>
              <CardDescription>
                Manage payments, invoices, and financial tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Financial tracking will be implemented here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}