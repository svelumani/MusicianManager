import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Calendar, Search, Plus } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import type { Event, Venue } from "@shared/schema";
import { format } from "date-fns";

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  
  const { data: events, isLoading: isLoadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
  
  const { data: venues } = useQuery<Venue[]>({
    queryKey: ["/api/venues"],
  });

  const getVenueName = (venueId: number) => {
    const venue = venues?.find(v => v.id === venueId);
    return venue ? venue.name : "Unknown";
  };

  const filteredEvents = events?.filter(event => 
    event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getVenueName(event.venueId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewEvent = (id: number) => {
    navigate(`/events/${id}`);
  };

  const handleInviteMusicians = (id: number) => {
    navigate(`/events/${id}/invite`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <Link href="/events/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Create Event
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Event Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search events by name, status or venue..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoadingEvents ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredEvents && filteredEvents.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Pax</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>{format(new Date(event.startDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{getVenueName(event.venueId)}</TableCell>
                      <TableCell>{event.paxCount}</TableCell>
                      <TableCell>
                        <StatusBadge status={event.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleViewEvent(event.id)}>
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleInviteMusicians(event.id)}
                          >
                            Invite Musicians
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-center">
              <Calendar className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No events found</h3>
              <p className="text-gray-500">
                {searchQuery
                  ? `No events match "${searchQuery}"`
                  : "Get started by creating your first event"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
