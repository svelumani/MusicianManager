import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, PlusCircle, X, Check, Star } from "lucide-react";
import { insertEventSchema } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Venue, MusicianType, Musician } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

// Extend the event schema with additional validation
const eventFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  paxCount: z.coerce.number().min(1, "Pax count must be at least 1"),
  venueId: z.coerce.number(),
  eventDates: z.array(z.date()),
  status: z.string().default("pending"),
  musicianTypeIds: z.array(z.coerce.number()), // Multi-select musician types
  notes: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any; // Using any type to accommodate the event data structure
}

export default function EventForm({ onSuccess, onCancel, initialData }: EventFormProps) {
  const { toast } = useToast();

  const { data: venues, isLoading: isLoadingVenues } = useQuery<Venue[]>({
    queryKey: ["/api/venues"],
  });



  const { data: musicianTypes, isLoading: isLoadingMusicianTypes } = useQuery<MusicianType[]>({
    queryKey: ["/api/musician-types"],
  });

  // State to track selected dates for multi-day events
  const [selectedDates, setSelectedDates] = useState<Date[]>(
    initialData?.eventDates 
      ? (Array.isArray(initialData.eventDates) 
          ? initialData.eventDates.map(d => typeof d === 'string' ? new Date(d) : d) 
          : [])
      : []
  );
  
  // State to track selected musicians with date assignments
  // Structure: { dateString: [musicianId1, musicianId2, ...], ... }
  const [musicianAssignments, setMusicianAssignments] = useState<Record<string, number[]>>(
    initialData?.musicianAssignments || {}
  );
  
  // Derived state: flat array of all selected musicians across all dates
  const selectedMusicians = useMemo(() => {
    const allMusicians = new Set<number>();
    Object.values(musicianAssignments).forEach(musicians => {
      musicians.forEach(id => allMusicians.add(id));
    });
    return Array.from(allMusicians);
  }, [musicianAssignments]);
  
  // Initialize form with default values or initialData if provided
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      paxCount: initialData.paxCount,
      venueId: initialData.venueId,
      status: initialData.status || "pending",
      musicianTypeIds: initialData.musicianTypeIds || [],
      eventDates: initialData.eventDates ? 
        (Array.isArray(initialData.eventDates) ? 
          initialData.eventDates.map(d => new Date(d)) : 
          []) : 
        [],
      notes: initialData.notes || "",
    } : {
      name: "",
      paxCount: 0,
      venueId: 0,
      status: "pending",
      musicianTypeIds: [],
      eventDates: [],
      notes: "",
    },
  });
  
  // Watch the musician type selection to find available musicians
  const selectedMusicianTypes = form.watch("musicianTypeIds");
  
  // Create a watch for event dates to filter available musicians
  const eventDates = form.watch("eventDates");
  
  // Query for all musicians - always fetch this regardless of musician types
  const { data: allMusicians = [], isLoading: isLoadingAllMusicians } = useQuery<Musician[]>({
    queryKey: ["/api/musicians"],
  });
  
  // No need to maintain a separate map as we now use dateAvailabilityData from the query
  
  // Query for musicians of selected types - we're not filtering by availability here anymore
  // We'll use dateAvailabilityData to display availability on a day-by-day basis
  const { data: availableMusicians = [], isLoading: isLoadingMusicians } = useQuery<Musician[]>({
    queryKey: ["/api/musicians", { typeIds: selectedMusicianTypes }],
    enabled: selectedMusicianTypes.length > 0,
    queryFn: async ({ queryKey }) => {
      // Extract type IDs from the query key
      const params = queryKey[1] as { typeIds?: number[] };
      
      // If we have type IDs, filter by them
      if (params.typeIds && params.typeIds.length > 0) {
        const typeParams = params.typeIds.map(id => `typeIds=${id}`).join('&');
        const response = await fetch(`/api/musicians?${typeParams}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch musicians by type');
        }
        
        return response.json();
      }
      
      // If no types specified, fetch all musicians
      const response = await fetch('/api/musicians');
      if (!response.ok) {
        throw new Error('Failed to fetch musicians');
      }
      
      return response.json();
    }
  });
  
  // Create a single query for date-specific musician availability
  // We'll use this for checking individual date availability
  const { data: dateAvailabilityData = {}, isLoading: isLoadingDateAvailability } = useQuery<Record<string, number[]>>({
    queryKey: ["/api/musicians/date-availability", { dates: selectedDates.map(d => d.toISOString()) }],
    enabled: selectedDates.length > 0,
    queryFn: async () => {
      // Create an object to store available musician ids by date
      const dateAvailability: Record<string, number[]> = {};
      
      // Only proceed if we have selected dates
      if (selectedDates.length === 0) {
        return dateAvailability;
      }
      
      // For each date, fetch available musicians
      await Promise.all(selectedDates.map(async (date) => {
        const dateStr = date.toISOString();
        try {
          const response = await fetch(`/api/musicians?date=${encodeURIComponent(dateStr)}`);
          if (response.ok) {
            const musicians = await response.json();
            dateAvailability[dateStr] = musicians.map((m: Musician) => m.id);
          }
        } catch (error) {
          console.error("Error fetching available musicians for date:", dateStr, error);
        }
      }));
      
      return dateAvailability;
    }
  });

  // Define the API value type to avoid type issues
  type EventApiValues = {
    name: string;
    paxCount: number;
    venueId: number;
    status: string;
    musicianTypeIds: number[];
    notes?: string;
    eventDates: string[];
    musicianIds?: number[]; // All selected musicians
    musicianAssignments?: Record<string, number[]>; // Date-specific musician assignments
  };
  
  const eventMutation = useMutation<any, Error, EventApiValues>({
    mutationFn: async (values: EventApiValues) => {
      // If initialData exists, we're updating an existing event
      if (initialData?.id) {
        const res = await apiRequest(`/api/events/${initialData.id}`, "PUT", values);
        return res;
      } else {
        // Otherwise, we're creating a new event
        const res = await apiRequest("/api/events", "POST", values);
        return res;
      }
    },
    onSuccess: () => {
      toast({
        title: initialData ? "Event updated" : "Event created",
        description: initialData 
          ? "The event has been updated successfully" 
          : "The event has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      if (initialData?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/events/${initialData.id}`] });
      }
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: initialData ? "Failed to update event" : "Failed to create event",
        description: error.message || `An error occurred while ${initialData ? 'updating' : 'creating'} the event`,
        variant: "destructive",
      });
    },
  });

  // Update the form when selectedDates changes
  useEffect(() => {
    if (selectedDates.length > 0) {
      form.setValue('eventDates', selectedDates);
    }
  }, [selectedDates, form]);

  // Handle multi-day date selection
  const handleMultiDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    // Check if the date is already selected
    const dateExists = selectedDates.some((selectedDate) => 
      selectedDate.toDateString() === date.toDateString()
    );
    
    if (dateExists) {
      // Remove date if already selected
      const newDates = selectedDates.filter(
        (selectedDate) => selectedDate.toDateString() !== date.toDateString()
      );
      setSelectedDates(newDates);
    } else {
      // Add date if not selected
      setSelectedDates([...selectedDates, date]);
    }
  };
  
  // Add a state to track the currently active date for assignments
  const [activeDate, setActiveDate] = useState<Date | null>(
    initialData?.eventDates && initialData.eventDates.length > 0
      ? new Date(initialData.eventDates[0])
      : null
  );
  
  // When selectedDates changes, set the active date to the first date if not already set
  useEffect(() => {
    if (selectedDates.length > 0 && !activeDate) {
      setActiveDate(selectedDates[0]);
    } else if (selectedDates.length === 0) {
      // If all dates are removed, clear the active date
      setActiveDate(null);
    }
  }, [selectedDates, activeDate]);
  
  // Add an info alert at the top of the musicians section if there are selected dates
  const renderAvailabilityInfo = () => {
    if (selectedDates.length === 0) return null;
    
    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
        <p className="text-sm mb-2">
          <strong>Note:</strong> Musician availability is checked for each specific date. Dates where a musician is unavailable 
          are marked with <span className="line-through text-red-800">strikethrough</span> and an ❌ symbol.
        </p>
        <p className="text-sm">
          <strong>Date-specific availability:</strong> Attempting to select a musician for a date they've marked as unavailable 
          will show an error message. Only available musicians can be assigned to events.
        </p>
      </div>
    );
  };
  
  // Extra effect to fetch musicians when editing an event with existing musician types
  useEffect(() => {
    console.log("Initial musicianTypeIds:", initialData?.musicianTypeIds);
    
    // Only run this effect once on initial render if initialData is available
    if (initialData?.musicianTypeIds?.length > 0 && form) {
      console.log("Setting form musicianTypeIds", initialData.musicianTypeIds);
      form.setValue("musicianTypeIds", initialData.musicianTypeIds);
    }
    
    // Also load existing musician assignments when editing
    if (initialData?.musicianAssignments) {
      console.log("Initial musician assignments:", initialData.musicianAssignments);
      // Update the musicianAssignments state with the initial assignments
      setMusicianAssignments(initialData.musicianAssignments);
    }
  }, [initialData, form]);
  
  // Function to check if a musician is available on a specific date
  const isMusicianAvailableForDate = (musicianId: number, date: Date): boolean => {
    try {
      // Convert to date string for comparison
      const dateStr = date.toISOString();
      
      // Check if this musician exists
      const musician = allMusicians.find(m => m.id === musicianId);
      if (!musician) {
        return false;
      }
      
      // First check if we have date-specific availability data
      if (dateAvailabilityData && dateAvailabilityData[dateStr]) {
        return dateAvailabilityData[dateStr].includes(musicianId);
      }
      
      // If we don't have date-specific data yet but the query is still loading,
      // we'll default to checking the overall available musicians list
      const isInAvailableList = availableMusicians.some(m => m.id === musicianId);
      
      // If musician is in the overall availability list, they're available for all selected dates
      return isInAvailableList;
    } catch (error) {
      console.error("Error checking musician availability:", error);
      // Default to not available in case of error to prevent incorrect bookings
      return false;
    }
  };

  // Handle musician selection/deselection for a specific date
  const toggleMusicianSelection = (musicianId: number, date: Date = activeDate!) => {
    if (!date) return; // Make sure we have a date
    
    // Check if musician is available for this specific date
    const isAvailable = isMusicianAvailableForDate(musicianId, date);
    
    // Don't allow assigning unavailable musicians
    if (!isAvailable) {
      toast({
        title: "Musician unavailable",
        description: "This musician is not available on this date. Please choose another musician or date.",
        variant: "destructive",
      });
      return;
    }
    
    const dateKey = date.toISOString();
    setMusicianAssignments(prev => {
      const newAssignments = { ...prev };
      
      // Initialize the array for this date if it doesn't exist
      if (!newAssignments[dateKey]) {
        newAssignments[dateKey] = [];
      }
      
      // Check if musician is already assigned to this date
      const isAssigned = newAssignments[dateKey].includes(musicianId);
      
      if (isAssigned) {
        // Remove the musician from this date
        newAssignments[dateKey] = newAssignments[dateKey].filter(id => id !== musicianId);
        // If the array is empty, we can remove the key
        if (newAssignments[dateKey].length === 0) {
          delete newAssignments[dateKey];
        }
      } else {
        // Add the musician to this date
        newAssignments[dateKey] = [...newAssignments[dateKey], musicianId];
      }
      
      return newAssignments;
    });
  };

  function onSubmit(values: EventFormValues) {
    // Validate if there are any musician assignments
    if (selectedMusicians.length === 0 && selectedDates.length > 0 && selectedMusicianTypes.length > 0) {
      toast({
        title: "No musicians selected",
        description: "Please select at least one musician for your event dates",
        variant: "destructive",
      });
      return;
    }
    
    // Create a new object with the formatted values to match our EventApiValues type
    const formattedValues: EventApiValues = {
      name: values.name,
      paxCount: values.paxCount,
      venueId: values.venueId,
      status: values.status,
      musicianTypeIds: values.musicianTypeIds,
      notes: values.notes,
      eventDates: values.eventDates.map(date => date.toISOString()),
      musicianIds: selectedMusicians.length > 0 ? selectedMusicians : undefined,
      musicianAssignments: Object.keys(musicianAssignments).length > 0 ? musicianAssignments : undefined,
    };
    
    eventMutation.mutate(formattedValues);
  }

  const isLoading = isLoadingVenues || isLoadingMusicianTypes;

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter event name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="paxCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Pax *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter pax count"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="venueId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venue *</FormLabel>
                <Select
                  value={field.value.toString()}
                  onValueChange={(value) => field.onChange(parseInt(value))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a venue" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {venues?.map((venue) => (
                      <SelectItem key={venue.id} value={venue.id.toString()}>
                        {venue.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>



        {/* Event Dates Selection */}
        <FormField
          control={form.control}
          name="eventDates"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Dates *</FormLabel>
              <div className="border rounded-md p-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDates.length === 0
                        ? "Select dates"
                        : `${selectedDates.length} date${selectedDates.length > 1 ? "s" : ""} selected`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(dates) => {
                        if (dates) setSelectedDates(dates as Date[]);
                      }}
                      initialFocus
                      className="rounded-md border"
                    />
                  </PopoverContent>
                </Popover>
                
                {/* Display selected dates with remove option */}
                {selectedDates.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {selectedDates.map((date, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {format(date, "MMM d, yyyy")}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => {
                            const newDates = selectedDates.filter((_, i) => i !== index);
                            setSelectedDates(newDates);
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Musician Types - Multiple Selection */}
        <FormField
          control={form.control}
          name="musicianTypeIds"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel>Musician Types Needed *</FormLabel>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {musicianTypes?.map((type) => (
                  <FormField
                    key={type.id}
                    control={form.control}
                    name="musicianTypeIds"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={type.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(type.id)}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || [];
                                return checked
                                  ? field.onChange([...currentValues, type.id])
                                  : field.onChange(
                                      currentValues.filter((value) => value !== type.id)
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {type.title}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Available Musicians Section */}
        {selectedMusicianTypes.length > 0 && selectedDates.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Musician Invitations</h3>
            
            {renderAvailabilityInfo()}
            
            {isLoadingMusicians ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : allMusicians && allMusicians.filter(m => selectedMusicianTypes.includes(m.typeId)).length > 0 ? (
              <div className="space-y-6">
                {/* Date selector for musician assignments */}
                <div className="mb-6 p-4 border rounded-md">
                  <h4 className="text-md font-medium mb-2">Select Musicians for Each Date</h4>
                  
                  {/* Date tabs */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedDates.map((date, index) => (
                      <Button
                        key={`date-tab-${index}`}
                        type="button" // Explicitly set type to button to prevent form submission
                        variant={activeDate && date.toISOString() === activeDate.toISOString() ? "default" : "outline"}
                        onClick={(e) => {
                          e.preventDefault(); // Prevent any form submission
                          setActiveDate(date);
                        }}
                        className="text-sm"
                      >
                        {format(date, "MMM d, yyyy")}
                      </Button>
                    ))}
                  </div>
                  
                  {/* Show currently selected musicians for active date */}
                  {activeDate && (
                    <div className="mb-4 p-3 bg-muted rounded-md">
                      <h5 className="text-sm font-medium mb-2">
                        Musicians for {format(activeDate, "MMMM d, yyyy")}
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {musicianAssignments[activeDate.toISOString()]?.map(musicianId => {
                          const musician = availableMusicians?.find(m => m.id === musicianId);
                          if (!musician) return null;
                          
                          return (
                            <Badge 
                              key={`selected-${musicianId}-${activeDate.toISOString()}`}
                              variant="default"
                              className="flex items-center gap-1 px-3 py-1.5"
                            >
                              {musician.name}
                              <X 
                                className="h-3 w-3 cursor-pointer ml-1" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMusicianSelection(musicianId, activeDate);
                                }}
                              />
                            </Badge>
                          );
                        }) || (
                          <div className="text-sm text-muted-foreground">No musicians selected for this date</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Summary of all selections */}
                  {selectedMusicians.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h5 className="text-sm font-medium mb-2">All Selected Musicians ({selectedMusicians.length})</h5>
                      <div className="flex flex-wrap gap-2">
                        {selectedMusicians.map(id => {
                          const musician = availableMusicians?.find(m => m.id === id);
                          if (!musician) return null;
                          
                          // Count how many dates this musician is assigned to
                          const assignedDatesCount = Object.values(musicianAssignments).reduce(
                            (count, musicians) => musicians.includes(id) ? count + 1 : count, 
                            0
                          );
                          
                          return (
                            <Badge 
                              key={`selected-summary-${id}`}
                              variant="secondary"
                              className="flex items-center gap-1 px-3 py-1.5"
                            >
                              {musician.name} ({assignedDatesCount} date{assignedDatesCount !== 1 ? 's' : ''})
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Group musicians by type */}
                {selectedMusicianTypes.map(typeId => {
                  const musicianType = musicianTypes?.find(t => t.id === typeId);
                  const musiciansOfType = allMusicians.filter(m => m.typeId === typeId);
                  
                  return (
                    <div key={typeId} className="space-y-3">
                      <h4 className="text-md font-medium">{musicianType?.title}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {musiciansOfType.map((musician) => {
                          // Create a unique key for each musician
                          const musicianKey = `musician-${musician.id}`;
                          // Check if this musician is already selected for any date
                          const isSelectedAnywhere = selectedMusicians.includes(musician.id);
                          
                          // Check if this musician is selected for the currently active date
                          const isSelectedForActiveDate = activeDate && 
                            musicianAssignments[activeDate.toISOString()]?.includes(musician.id);
                          
                          return (
                            <Card 
                              key={musicianKey} 
                              className={`overflow-hidden cursor-pointer transition-colors ${
                                isSelectedForActiveDate 
                                  ? 'border-primary bg-primary/5' 
                                  : isSelectedAnywhere 
                                    ? 'border-yellow-400 bg-yellow-50/10'
                                    : ''
                              }`}
                              onClick={(e) => {
                                e.preventDefault(); // Prevent form submission
                                if (activeDate) toggleMusicianSelection(musician.id, activeDate);
                              }}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                  <Avatar>
                                    <AvatarImage
                                      src={musician.profileImage || undefined}
                                      alt={musician.name}
                                    />
                                    <AvatarFallback>{musician.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="flex items-center">
                                      <span className="font-medium">{musician.name}</span>
                                      {/* Check if musician is available for the active date */}
                                      {activeDate && (
                                        isMusicianAvailableForDate(musician.id, activeDate) ? (
                                          <Badge 
                                            variant="outline" 
                                            className="ml-2 text-xs bg-green-100 border-green-300 text-green-800">
                                            Available on {format(activeDate, 'MMM d')}
                                          </Badge>
                                        ) : (
                                          <Badge 
                                            variant="outline" 
                                            className="ml-2 text-xs bg-red-100 border-red-300 text-red-800">
                                            Not available on {format(activeDate, 'MMM d')}
                                          </Badge>
                                        )
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center">
                                      {musician.rating && (
                                        <div className="flex items-center mr-2">
                                          {Array.from({ length: 5 }).map((_, i) => (
                                            <Star
                                              key={i}
                                              className={`h-3 w-3 ${
                                                i < musician.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                      )}
                                      {/* Display musician type */}
                                      <Badge variant="outline" className="mr-1 text-xs">
                                        {musicianTypes?.find(t => t.id === musician.typeId)?.title}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      id={musicianKey}
                                      checked={isSelectedForActiveDate || false}
                                      onCheckedChange={(checked) => {
                                        if (activeDate) {
                                          toggleMusicianSelection(musician.id, activeDate);
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                                
                                {/* Show which dates this musician is assigned to */}
                                <div className="mt-3">
                                  <p className="text-xs text-muted-foreground mb-1">Date assignments:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedDates.map((date, idx) => {
                                      // Check if musician is assigned to this date
                                      const isAssignedToDate = musicianAssignments[date.toISOString()]?.includes(musician.id) || false;
                                      
                                      // Check if musician is available for this specific date
                                      const isAvailableForDate = isMusicianAvailableForDate(musician.id, date);
                                      
                                      // Determine badge styling based on availability and assignment
                                      let badgeVariant: "default" | "destructive" | "outline" | "secondary" | null | undefined = "outline";
                                      let badgeClass = "text-xs cursor-pointer ";
                                      
                                      if (isAssignedToDate) {
                                        badgeVariant = "default";
                                        badgeClass += 'bg-green-600 hover:bg-green-700';
                                      } else if (!isAvailableForDate) {
                                        badgeClass += 'bg-red-100 border-red-300 text-red-800 line-through opacity-60';
                                      }
                                      
                                      return (
                                        <Badge 
                                          key={idx}
                                          variant={badgeVariant}
                                          className={badgeClass}
                                          onClick={(e) => {
                                            e.preventDefault(); // Prevent form submission
                                            e.stopPropagation(); // Prevent event bubbling
                                            toggleMusicianSelection(musician.id, date);
                                          }}
                                        >
                                          {format(date, "MMM d")}
                                          {!isAvailableForDate && !isAssignedToDate && (
                                            <span className="ml-1">❌</span>
                                          )}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-6 bg-muted rounded-md">
                <p className="text-muted-foreground">No musicians available for the selected type(s) and date(s)</p>
              </div>
            )}
          </div>
        )}

        {/* Notes Field */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter any additional notes about the event"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />



        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={eventMutation.isPending}
          >
            {eventMutation.isPending 
              ? (initialData ? "Updating..." : "Creating...") 
              : (initialData ? "Update Event" : "Create Event")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
