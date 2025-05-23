import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarDays, Edit, User, Users, MapPin, FileText, 
  Briefcase, Clock, Calendar, Music, Mail, 
  CheckCircle, X, AlertCircle, File, MoreVertical, 
  DollarSign, FileCheck, ExternalLink, XCircle,
  MailPlus, MoreHorizontal
} from "lucide-react";
import FileContract from "@/components/icons/FileContract";
import { format } from "date-fns";
import type { Event as EventType, Venue, Musician, ContractLink } from "@shared/schema";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";

// Extended event type to include musician assignments, statuses and payment-related fields
interface EventWithAssignments extends Omit<EventType, 'paymentModel' | 'musicianCategoryIds'> {
  musicianAssignments?: Record<string, number[]>;
  musicianStatuses?: Record<string, Record<number, string>>;
  paymentModel: string | null; // hourly, daily, or event-based
  hoursCount: number | null;   // number of hours for hourly payment model
  daysCount: number | null;    // number of days for daily payment model
  eventCategoryId: number;     // Event category ID for rate calculation
  musicianCategoryIds: number[] | null; // Array of musician category IDs
}

// Contracts Table Component
interface ContractsTableProps {
  eventId: number;
}

function ContractsTable({ eventId }: ContractsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch contracts for this event
  const {
    data: contracts = [],
    isLoading,
    error
  } = useQuery<ContractLink[]>({
    queryKey: ["/api/v2/contracts/event", eventId],
    queryFn: async () => {
      // Add cache-busting timestamp to prevent caching issues
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/v2/contracts/event/${eventId}?t=${timestamp}`);
      if (!res.ok) throw new Error("Failed to load contracts");
      console.log('Loaded contracts for event:', eventId);
      return res.json();
    }
  });
  
  // Fetch musicians data for the event
  const { data: musicians = [] } = useQuery<Musician[]>({
    queryKey: ["/api/musicians"],
  });
  
  // Mutation to resend a contract
  const resendContractMutation = useMutation({
    mutationFn: async (contractId: number) => {
      try {
        console.log(`Resending contract with ID: ${contractId}`);
        const response = await fetch(`/api/contracts/${contractId}/resend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log("Resend contract response status:", response.status, response.statusText);
        
        if (!response.ok) {
          try {
            const errorText = await response.text();
            console.log("Error response text:", errorText);
            
            let errorData;
            try {
              errorData = JSON.parse(errorText);
              throw new Error(errorData.details || errorData.message || `Failed to resend contract (${response.status})`);
            } catch (parseError) {
              console.error("Failed to parse error response:", parseError);
              throw new Error(`Failed to resend contract: Server error (${response.status})`);
            }
          } catch (e) {
            console.error("Error handling contract resend response:", e);
            throw new Error(`Failed to resend contract: ${e.message}`);
          }
        }
        
        const responseData = await response.json();
        console.log("Successful contract resend response:", responseData);
        return responseData;
      } catch (err) {
        console.error("Contract resend request error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      toast({
        title: "Contract Resent",
        description: "The contract was successfully resent to the musician."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/contracts/event", eventId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Resend Contract",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation to cancel a contract
  const cancelContractMutation = useMutation({
    mutationFn: async (contractId: number) => {
      try {
        console.log(`Cancelling contract with ID: ${contractId}`);
        const response = await fetch(`/api/contracts/${contractId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log("Cancel contract response status:", response.status, response.statusText);
        
        if (!response.ok) {
          try {
            // Use the fetch Response directly which properly supports text()
            const errorText = await response.text();
            console.log("Error response text:", errorText);
            
            let errorData;
            try {
              errorData = JSON.parse(errorText);
              throw new Error(errorData.details || errorData.message || `Failed to cancel contract (${response.status})`);
            } catch (parseError) {
              console.error("Failed to parse error response:", parseError);
              throw new Error(`Failed to cancel contract: Server error (${response.status})`);
            }
          } catch (e) {
            console.error("Error handling contract cancellation response:", e);
            throw new Error(`Failed to cancel contract: ${e.message}`);
          }
        }
        
        const responseData = await response.json();
        console.log("Successful contract cancellation response:", responseData);
        return responseData;
      } catch (err) {
        console.error("Contract cancellation request error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      toast({
        title: "Contract Cancelled",
        description: "The contract was successfully cancelled."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/contracts/event", eventId] });
    },
    onError: (error: Error) => {
      console.error("Contract cancellation error:", error);
      toast({
        title: "Failed to Cancel Contract",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }
  
  if (error) {
    return (
      <div className="py-4 text-center">
        <p className="text-destructive">Error loading contracts: {error instanceof Error ? error.message : "Unknown error"}</p>
      </div>
    );
  }
  
  if (contracts.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-muted-foreground">No contracts found for this event yet.</p>
        <p className="text-sm mt-2">Contracts will appear here after musicians accept invitations.</p>
      </div>
    );
  }
  
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Musician</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Event Date</TableHead>
            <TableHead>Sent Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => {
            const musician = musicians.find(m => m.id === contract.musicianId);
            return (
              <TableRow key={contract.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={musician?.profileImage || undefined} alt={musician?.name} />
                      <AvatarFallback>{musician?.name.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <span>{musician?.name || "Unknown Musician"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge 
                    status={contract.status}
                    entityType="contract"
                    entityId={contract.id}
                    eventId={eventId}
                    musicianId={contract.musicianId}
                    eventDate={contract.eventDate}
                    useCentralizedSystem={true}
                  />
                </TableCell>
                <TableCell>
                  {contract.eventDate ? format(new Date(contract.eventDate), "MMM d, yyyy") : "Not specified"}
                </TableCell>
                <TableCell>
                  {contract.createdAt ? format(new Date(contract.createdAt), "MMM d, yyyy") : "Not sent"}
                </TableCell>
                <TableCell>${contract.amount?.toFixed(2) || "0.00"}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => window.open(`/contracts/${contract.id}`, '_blank')}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        <span>View Contract</span>
                      </DropdownMenuItem>
                      
                      {contract.status !== "contract-signed" && contract.status !== "cancelled" && (
                        <>
                          <DropdownMenuItem
                            onClick={() => resendContractMutation.mutate(contract.id)}
                            disabled={resendContractMutation.isPending}
                          >
                            <MailPlus className="mr-2 h-4 w-4" />
                            <span>Resend Contract</span>
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => cancelContractMutation.mutate(contract.id)}
                            disabled={cancelContractMutation.isPending}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            <span>Cancel Contract</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      <DropdownMenuItem
                        onClick={() => window.open(`/contracts/respond/${contract.token}`, '_blank')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        <span>Response Link</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default function ViewEventPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id);
  const [activeTab, setActiveTab] = useState<string>("details");
  const queryClient = useQueryClient();

  // Fetch the event data
  const { 
    data: event, 
    isLoading: isLoadingEvent,
    error: eventError
  } = useQuery<EventWithAssignments>({
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
  
  // Fetch musician types
  const { data: musicianTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/musician-types"],
  });
  
  // Fetch musician categories
  const { data: musicianCategories = [] } = useQuery<any[]>({
    queryKey: ["/api/musician-categories"],
  });
  
  // Fetch musician pay rates for all assigned musicians
  const { data: musicianPayRates = [] } = useQuery({
    queryKey: ["/api/v2/musician-pay-rates"],
    queryFn: async () => {
      console.log("Fetching musician pay rates from V2 endpoint...");
      try {
        // Add cache-busting query parameter to prevent caching issues
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/v2/musician-pay-rates?t=${timestamp}`);
        
        console.log("V2 Musician pay rates response status:", response.status);
        
        if (!response.ok) {
          console.error("Failed to fetch musician pay rates from V2 endpoint:", response.statusText);
          // Try to get the error response text
          try {
            const errorText = await response.text();
            console.error("V2 Error response:", errorText.substring(0, 500));
          } catch (e) {
            console.error("Could not read error response:", e);
          }
          throw new Error(`Failed to fetch musician pay rates: ${response.status} ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        console.log("V2 Response content type:", contentType);
        
        let data;
        try {
          data = await response.json();
        } catch (e) {
          console.error("Failed to parse JSON response:", e);
          // Get a sample of what was returned
          const text = await response.text();
          console.error("Response text sample:", text.substring(0, 500));
          throw new Error("Server returned invalid JSON data");
        }
        
        console.log("V2 Musician pay rates data sample (first item):", data && data.length > 0 ? data[0] : "No data");
        console.log("V2 Total musician pay rates returned:", data ? data.length : 0);
        
        // Log if we're not seeing any rates
        if (!data || data.length === 0) {
          console.error("CRITICAL ERROR: No musician pay rates returned from V2 API. This could cause legal issues.");
          // Throw an error to trigger the error UI
          throw new Error("No musician pay rates found. Rate information is required for legal contracts.");
        }
        
        // Return the actual data from the database - no fallbacks
        console.log(`Retrieved ${data.length} actual musician pay rates from V2 endpoint`);
        return data;
      } catch (error) {
        console.error("Error in musician pay rates query:", error);
        throw error; // Let React Query handle the error
      }
    },
    enabled: !!musicians && musicians.length > 0,
  });
  
  // Mutation to update musician status
  const updateMusicianStatusMutation = useMutation({
    mutationFn: async ({ 
      musicianId, 
      status, 
      dateStr 
    }: { 
      musicianId: number, 
      status: string, 
      dateStr?: string 
    }) => {
      const response = await apiRequest(
        `/api/events/${eventId}/musician-status`,
        'POST',
        { musicianId, status, dateStr }
      );
      return response;
    },
    onSuccess: () => {
      // Invalidate the event query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    }
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
  
  // Debug information for musician assignments
  console.log("Event data:", event);
  console.log("Musician assignments:", event.musicianAssignments);
  
  // Normalize musician assignments for consistent access
  const normalizedAssignments: Record<string, number[]> = {};
  
  if (event.musicianAssignments && Object.keys(event.musicianAssignments).length > 0) {
    // Process all date keys to ensure consistent format
    Object.keys(event.musicianAssignments).forEach((dateKey) => {
      try {
        const date = new Date(dateKey);
        if (!isNaN(date.getTime())) {
          // Format date consistently
          const normalizedKey = format(date, 'yyyy-MM-dd');
          
          // Ensure we have an array to store the musicians
          if (!normalizedAssignments[normalizedKey]) {
            normalizedAssignments[normalizedKey] = [];
          }
          
          // Add unique musician IDs
          const musicianIds = event.musicianAssignments[dateKey];
          if (Array.isArray(musicianIds)) {
            musicianIds.forEach((id) => {
              if (!normalizedAssignments[normalizedKey].includes(id)) {
                normalizedAssignments[normalizedKey].push(id);
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error normalizing date ${dateKey}:`, error);
      }
    });
  }
  
  console.log("Normalized assignments:", normalizedAssignments);

  // Get status badge styling - using the centralized StatusBadge component
  const getStatusBadge = (status: string, entityType: string = "event", entityId?: number, musicianId?: number, eventDate?: string | Date) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;

    // Format the eventDate if it's provided as a Date object
    const formattedEventDate = eventDate instanceof Date 
      ? format(eventDate, 'yyyy-MM-dd')
      : typeof eventDate === 'string' ? eventDate : undefined;
    
    return (
      <StatusBadge 
        status={status}
        entityType={entityType}
        entityId={entityId}
        eventId={event.id} 
        musicianId={musicianId}
        eventDate={formattedEventDate}
        useCentralizedSystem={true}
      />
    );
  };
  
  // Get musician status for a specific date and musician
  const getMusicianStatus = (dateStr: string | Date, musicianId: number) => {
    if (!event.musicianStatuses) {
      console.log(`No status information available for event ${event.id}`);
      return "pending";
    }
    
    // Normalize the date if it's a Date object
    const normalizedDateStr = dateStr instanceof Date 
      ? format(dateStr, 'yyyy-MM-dd') 
      : format(new Date(dateStr), 'yyyy-MM-dd');
    
    console.log(`Looking for status for musician ${musicianId} on date ${normalizedDateStr}`);
    console.log(`Available status dates:`, Object.keys(event.musicianStatuses));
    
    // First priority: date-specific status with normalized date format
    if (event.musicianStatuses[normalizedDateStr] && event.musicianStatuses[normalizedDateStr][musicianId]) {
      console.log(`Found date-specific status for ${normalizedDateStr}: ${event.musicianStatuses[normalizedDateStr][musicianId]}`);
      return event.musicianStatuses[normalizedDateStr][musicianId];
    }
    
    // Second priority: date-specific status with original date string
    if (typeof dateStr === 'string' && event.musicianStatuses[dateStr] && event.musicianStatuses[dateStr][musicianId]) {
      console.log(`Found date-specific status for original date string ${dateStr}: ${event.musicianStatuses[dateStr][musicianId]}`);
      return event.musicianStatuses[dateStr][musicianId];
    }
    
    // Third priority: global status (date key = 'all')
    if (event.musicianStatuses['all'] && event.musicianStatuses['all'][musicianId]) {
      console.log(`Using global status: ${event.musicianStatuses['all'][musicianId]}`);
      return event.musicianStatuses['all'][musicianId];
    }
    
    console.log(`No status found for musician ${musicianId} on date ${normalizedDateStr}, using default 'pending'`);
    return "pending";
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
            {getStatusBadge(event.status, "event", event.id)}
          </div>
        </div>
        <div className="flex items-center gap-2">
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
                    <div className="text-lg">{getStatusBadge(event.status, "event", event.id)}</div>
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
              {event.musicianAssignments && Object.keys(event.musicianAssignments).length > 0 ? (
                <div className="space-y-6">
                  {event.eventDates?.map((dateStr, index) => {
                    const date = new Date(dateStr);
                    
                    // Use the normalized date format consistently (YYYY-MM-DD)
                    const normalizedDateStr = format(date, 'yyyy-MM-dd');
                    
                    // Use the already normalized assignments we created earlier
                    const assignedMusicians = normalizedAssignments[normalizedDateStr] || [];
                    
                    console.log(`Using assignments for date ${dateStr}, normalized as ${normalizedDateStr}:`, assignedMusicians);
                    
                    return (
                      <div key={index} className="space-y-3">
                        <h3 className="text-lg font-medium flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {format(date, 'EEEE, MMMM d, yyyy')}
                        </h3>
                        
                        {assignedMusicians && assignedMusicians.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Musician</TableHead>
                                <TableHead>Musician Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Rate</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {assignedMusicians.map((musicianId: number) => {
                                const musician = musicians?.find(m => m.id === musicianId);
                                return (
                                  <TableRow key={musicianId}>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                          {musician?.profileImage ? (
                                            <AvatarImage src={musician.profileImage} alt={musician?.name || "Musician"} />
                                          ) : (
                                            <AvatarFallback>
                                              {musician?.name?.charAt(0) || "M"}
                                            </AvatarFallback>
                                          )}
                                        </Avatar>
                                        <div>
                                          <p className="font-medium">{musician?.name || "Unknown Musician"}</p>
                                          <p className="text-xs text-muted-foreground">{musician?.email || ""}</p>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        <Music className="h-3 w-3 mr-1" />
                                        {musician?.categoryIds && musician.categoryIds.length > 0 && musicianCategories ? 
                                          musicianCategories.find((cat: any) => musician.categoryIds.includes(cat.id))?.title || "No Category"
                                          : "No Category"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {getStatusBadge(
                                        getMusicianStatus(date, musicianId), 
                                        "musician", 
                                        undefined, 
                                        musicianId, 
                                        date
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {(() => {
                                        // Get ALL rates for this musician - check both camelCase and snake_case properties
                                        const allMusicianRates = musicianPayRates.filter((rate: any) => {
                                          // Try both property name styles since we're not sure which one is used
                                          return (rate.musicianId === musicianId) || (rate.musician_id === musicianId);
                                        });
                                        
                                        // Log for debugging
                                        console.log("All musician rates for musician", musicianId, ":", allMusicianRates);
                                        
                                        // We'll build our list of preferred rates based on event categories
                                        let preferredRates = [];
                                        
                                        // First try to match using event's category ID - check both camelCase and snake_case properties
                                        if (event.eventCategoryId) {
                                          preferredRates = allMusicianRates.filter((rate: any) => {
                                            // Try both property name styles
                                            return (rate.eventCategoryId === event.eventCategoryId) || 
                                                   (rate.event_category_id === event.eventCategoryId);
                                          });
                                          console.log("Found rates matching event category ID:", event.eventCategoryId, preferredRates.length);
                                        }
                                        
                                        // If no matches found, try using the musician category IDs as a fallback
                                        const musicianCatIds = event.musicianCategoryIds || [];
                                        if (preferredRates.length === 0 && musicianCatIds.length > 0) {
                                          console.log("Trying to match based on musician categories:", musicianCatIds);
                                          preferredRates = allMusicianRates.filter((rate: any) =>
                                            musicianCatIds.includes(rate.eventCategoryId)
                                          );
                                        }
                                        
                                        // If still no matches, use all rates
                                        const musicianRates = preferredRates.length > 0 ? preferredRates : allMusicianRates;
                                        
                                        console.log("Using musician rates:", musicianRates);
                                        
                                        if (musicianRates && musicianRates.length > 0) {
                                          // Try to find the best rate that matches this event category
                                          
                                          // Try to find a rate that best matches this event
                                          // We prefer rates that match the event category, but will use any available rate if needed
                                          let rate = musicianRates[0]; // Default to first rate
                                          
                                          // If we have an event category, try to find an exact match
                                          if (event.eventCategoryId) {
                                            const categoryMatch = musicianRates.find((r: any) => 
                                              r.eventCategoryId === event.eventCategoryId
                                            );
                                            
                                            if (categoryMatch) {
                                              rate = categoryMatch;
                                              console.log("Using category-matched rate for event:", event.eventCategoryId);
                                            }
                                          }
                                          
                                          // Calculate the total rate based on the payment model
                                          let totalRate = 0;
                                          let rateLabel = '';
                                          
                                          // Use the payment model from the event to determine which rate to use
                                          const paymentModel = event.paymentModel || 'daily'; // Default to daily if not specified
                                          
                                          // Get rate values handling both camelCase and snake_case property names
                                          const hourlyRate = rate.hourlyRate || rate.hourly_rate;
                                          const dayRate = rate.dayRate || rate.day_rate;
                                          const eventRate = rate.eventRate || rate.event_rate;
                                          
                                          // Debug logging for payment model and rates
                                          console.log("Rate calculation:", {
                                            musicianId,
                                            paymentModel,
                                            hourlyRate,
                                            dayRate,
                                            eventRate,
                                            hoursCount: event.hoursCount, 
                                            daysCount: event.daysCount
                                          });
                                          
                                          if (paymentModel === 'hourly' && hourlyRate) {
                                            // For hourly payment: base hourly rate × hours count
                                            const hours = event.hoursCount || 0;
                                            totalRate = hourlyRate * hours;
                                            rateLabel = `$${hourlyRate.toFixed(2)}/hr × ${hours} hours = $${totalRate.toFixed(2)}`;
                                            console.log(`Calculated hourly rate: ${hourlyRate} × ${hours} = ${totalRate}`);
                                          } 
                                          else if (paymentModel === 'daily' && dayRate) {
                                            // For daily payment: base daily rate × days count
                                            const days = event.daysCount || 0;
                                            totalRate = dayRate * days;
                                            rateLabel = `$${dayRate.toFixed(2)}/day × ${days} days = $${totalRate.toFixed(2)}`;
                                            console.log(`Calculated daily rate: ${dayRate} × ${days} = ${totalRate}`);
                                          }
                                          else if (paymentModel === 'event' && eventRate) {
                                            // For event payment: flat event rate
                                            totalRate = eventRate;
                                            rateLabel = `$${totalRate.toFixed(2)} (event rate)`;
                                            console.log(`Using flat event rate: ${eventRate}`);
                                          }
                                          else {
                                            // Fallback to display a simple rate if no specific payment model
                                            const displayRateValue = hourlyRate || dayRate || eventRate || 0;
                                            const rateType = hourlyRate ? '/hr' : (dayRate ? '/day' : '/event');
                                            rateLabel = `$${displayRateValue.toFixed(2)}${rateType}`;
                                            console.log(`Using fallback rate display: ${displayRateValue}${rateType}`);
                                          }
                                          
                                          return (
                                            <div className="flex items-center">
                                              <span className="font-medium">{rateLabel}</span>
                                            </div>
                                          );
                                        }
                                        
                                        return (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => navigate(`/events/rate-musician/${eventId}/${musicianId}?date=${dateStr}`)}
                                          >
                                            <DollarSign className="h-4 w-4 mr-1" />
                                            Set Rate
                                          </Button>
                                        );
                                      })()}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex gap-2 justify-end">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button size="sm" variant="ghost">
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuLabel>Musician Actions</DropdownMenuLabel>
                                            
                                            <DropdownMenuItem onClick={() => navigate(`/musicians/${musicianId}`)}>
                                              <User className="mr-2 h-4 w-4" />
                                              <span>View Profile</span>
                                            </DropdownMenuItem>
                                            
                                            <DropdownMenuSeparator />
                                            
                                            <DropdownMenuItem 
                                              onClick={() => {
                                                updateMusicianStatusMutation.mutate(
                                                  { musicianId, status: "accepted", dateStr },
                                                  {
                                                    onSuccess: () => {
                                                      toast({
                                                        title: "Contract Sent",
                                                        description: `${musician?.name} has been accepted and a contract has been sent automatically.`
                                                      });
                                                      // Also refresh contracts
                                                      queryClient.invalidateQueries({ queryKey: ["/api/v2/contracts/event", eventId] });
                                                    }
                                                  }
                                                );
                                              }}
                                              disabled={updateMusicianStatusMutation.isPending}
                                            >
                                              <FileContract className="mr-2 h-4 w-4" />
                                              <span>Accept & Send Contract</span>
                                            </DropdownMenuItem>
                                            
                                            <DropdownMenuSeparator />
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground">No musicians assigned for this date.</p>
                        )}
                      </div>
                    );
                  })}
                  
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(`/events/${eventId}/edit`)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Event to Add More Musicians
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    No musicians have been assigned to this event yet.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/events/${eventId}/edit`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Event to Add Musicians
                  </Button>
                </div>
              )}
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
              {/* Fetch and display contracts for this specific event */}
              <ContractsTable eventId={eventId} />
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