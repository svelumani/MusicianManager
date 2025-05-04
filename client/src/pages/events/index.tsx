import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Calendar, Search, Plus, CalendarRange, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import type { Event, Venue } from "@shared/schema";
import { format } from "date-fns";

type SortDirection = 'asc' | 'desc' | null;

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if already sorting by this field
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      // Start sorting by this field in ascending order
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    if (sortDirection === 'asc') return <ArrowUp className="ml-2 h-4 w-4" />;
    if (sortDirection === 'desc') return <ArrowDown className="ml-2 h-4 w-4" />;
    return <ArrowUpDown className="ml-2 h-4 w-4" />;
  };

  // First filter events
  const filteredEvents = events?.filter(event => 
    event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getVenueName(event.venueId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Then sort the filtered events
  const sortedEvents = filteredEvents ? [...filteredEvents] : [];
  if (sortField && sortDirection) {
    sortedEvents.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortField) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'date':
          valueA = new Date(a.startDate).getTime();
          valueB = new Date(b.startDate).getTime();
          break;
        case 'venue':
          valueA = getVenueName(a.venueId).toLowerCase();
          valueB = getVenueName(b.venueId).toLowerCase();
          break;
        case 'pax':
          valueA = a.paxCount;
          valueB = b.paxCount;
          break;
        case 'status':
          valueA = a.status.toLowerCase();
          valueB = b.status.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const handleViewEvent = (id: number) => {
    navigate(`/events/${id}`);
  };

  // Removed handleInviteMusicians as we're now handling this through the edit event page

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Events</h1>
        <div className="flex gap-2">
          <Link href="/events/planner">
            <Button variant="outline">
              <CalendarRange className="mr-2 h-4 w-4" /> Monthly Planner
            </Button>
          </Link>
          <Link href="/events/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Event
            </Button>
          </Link>
        </div>
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
                    <TableHead onClick={() => handleSort('name')} className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center">
                        Event Name
                        {getSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('date')} className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center">
                        Date
                        {getSortIcon('date')}
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('venue')} className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center">
                        Venue
                        {getSortIcon('venue')}
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('pax')} className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center">
                        Pax
                        {getSortIcon('pax')}
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('status')} className="cursor-pointer hover:bg-muted/50">
                      <div className="flex items-center">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEvents.map((event) => (
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
                            onClick={() => navigate(`/events/${event.id}/edit`)}
                          >
                            Edit
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
