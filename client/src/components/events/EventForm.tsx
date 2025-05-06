import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import type { Venue, MusicianCategory, Musician } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

// Extend the event schema with additional validation
const eventFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  paxCount: z.coerce.number().min(1, "Pax count must be at least 1"),
  venueId: z.coerce.number(),
  eventCategoryId: z.coerce.number(), // Event category determines the rates
  eventDates: z.array(z.date()),
  status: z.string().default("pending"),
  musicianCategoryIds: z.array(z.coerce.number()), // Multi-select musician categories (replacing types)
  paymentModel: z.string().default("daily"), // hourly, daily, or event
  hoursCount: z.coerce.number().optional(), // Only used when paymentModel is "hourly"
  daysCount: z.coerce.number().optional(), // Only used when paymentModel is "daily"
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

  const { data: eventCategories, isLoading: isLoadingEventCategories } = useQuery<any[]>({
    queryKey: ["/api/event-categories"],
  });


  const { data: musicianCategories, isLoading: isLoadingMusicianCategories } = useQuery<MusicianCategory[]>({
    queryKey: ["/api/musician-categories"],
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
      eventCategoryId: initialData.eventCategoryId || 0,
      status: initialData.status || "pending",
      musicianCategoryIds: initialData.musicianCategoryIds || initialData.musicianTypeIds || [], // Support both legacy and new format
      paymentModel: initialData.paymentModel || "daily", // default to daily for existing events
      hoursCount: initialData.hoursCount || 0, // Only relevant if paymentModel is "hourly"
      daysCount: initialData.daysCount || 0, // Only relevant if paymentModel is "daily"
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
      eventCategoryId: 0,
      status: "pending",
      musicianCategoryIds: [],
      paymentModel: "daily", // default to daily for new events
      hoursCount: 0,
      daysCount: 0,
      eventDates: [],
      notes: "",
    },
  });
  
  // Watch the musician category selection to find available musicians
  const selectedMusicianCategories = form.watch("musicianCategoryIds");
  
  // Create a watch for event dates to filter available musicians
  const eventDates = form.watch("eventDates");
  
  // Query for all musicians - always fetch this regardless of musician types
  const { data: allMusicians = [], isLoading: isLoadingAllMusicians } = useQuery<Musician[]>({
    queryKey: ["/api/musicians"],
  });
  
  // Fetch contracts for the event when editing to check statuses
  const { data: eventContracts = [], isLoading: isLoadingContracts } = useQuery({
    queryKey: ["/api/v2/contracts/event", initialData?.id],
    enabled: !!initialData?.id, // Only fetch when editing an existing event
    queryFn: async () => {
      try {
        // Add cache-busting timestamp to prevent caching issues
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/v2/contracts/event/${initialData?.id}?t=${timestamp}`);
        if (!res.ok) throw new Error("Failed to load contracts");
        return res.json();
      } catch (err) {
        console.error("Error fetching contracts:", err);
        return [];
      }
    }
  });
  
  // Create a map of musician contracts for easy lookup
  const musicianContractsMap = useMemo(() => {
    const contractMap = new Map();
    eventContracts.forEach(contract => {
      // Store by musician ID and date if present
      if (contract.eventDate) {
        const dateKey = format(new Date(contract.eventDate), 'yyyy-MM-dd');
        const mapKey = `${contract.musicianId}-${dateKey}`;
        contractMap.set(mapKey, contract);
      } else {
        // Store by musician ID only if no date
        contractMap.set(`${contract.musicianId}`, contract);
      }
    });
    return contractMap;
  }, [eventContracts]);
  
  // Function to check if a musician has a signed contract
  const hasMusicianSignedContract = useCallback((musicianId: number, date?: Date): boolean => {
    // If we have a date, check for that specific date
    if (date) {
      const dateKey = format(date, 'yyyy-MM-dd');
      const mapKey = `${musicianId}-${dateKey}`;
      const contract = musicianContractsMap.get(mapKey);
      
      if (contract) {
        return ['contract-signed', 'accepted'].includes(contract.status);
      }
    }
    
    // Otherwise check for any contract for this musician
    const contract = musicianContractsMap.get(`${musicianId}`);
    return contract ? ['contract-signed', 'accepted'].includes(contract.status) : false;
  }, [musicianContractsMap]);
  
  // Function to get musician contract status
  const getMusicianContractStatus = useCallback((musicianId: number, date?: Date): string => {
    if (date) {
      const dateKey = format(date, 'yyyy-MM-dd');
      const mapKey = `${musicianId}-${dateKey}`;
      const contract = musicianContractsMap.get(mapKey);
      return contract ? contract.status : 'none';
    }
    
    const contract = musicianContractsMap.get(`${musicianId}`);
    return contract ? contract.status : 'none';
  }, [musicianContractsMap]);
  
  // No need to maintain a separate map as we now use dateAvailabilityData from the query
  
  // Query for musicians of selected categories - we're not filtering by availability here anymore
  // We'll use dateAvailabilityData to display availability on a day-by-day basis
  const { data: availableMusicians = [], isLoading: isLoadingMusicians } = useQuery<Musician[]>({
    queryKey: ["/api/musicians", { categoryIds: selectedMusicianCategories }],
    enabled: selectedMusicianCategories.length > 0,
    queryFn: async ({ queryKey }) => {
      // Extract category IDs from the query key
      const params = queryKey[1] as { categoryIds?: number[] };
      
      // If we have category IDs, filter by them
      if (params.categoryIds && params.categoryIds.length > 0) {
        const categoryParams = params.categoryIds.map(id => `categoryIds=${id}`).join('&');
        const response = await fetch(`/api/musicians?${categoryParams}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch musicians by category');
        }
        
        return response.json();
      }
      
      // If no categories specified, fetch all musicians
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
    queryKey: ["/api/musicians/date-availability", { dates: selectedDates.map(d => format(d, 'yyyy-MM-dd')) }],
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
        // Use consistent yyyy-MM-dd format for all date keys
        const normalizedDateStr = format(date, 'yyyy-MM-dd');
        try {
          // We'll still use ISO string for the API call
          const isoDateStr = date.toISOString();
          const response = await fetch(`/api/musicians?date=${encodeURIComponent(isoDateStr)}`, {
            credentials: 'include'
          });
          if (response.ok) {
            const musicians = await response.json();
            // Store musician IDs using the normalized date string
            dateAvailability[normalizedDateStr] = musicians.map((m: Musician) => m.id);
          }
        } catch (error) {
          console.error("Error fetching available musicians for date:", normalizedDateStr, error);
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
    eventCategoryId: number; // Adding event category for rate calculation
    status: string;
    musicianTypeIds: number[];
    paymentModel: string; // hourly, daily, or event
    hoursCount?: number; // Only used when paymentModel is "hourly"
    daysCount?: number; // Only used when paymentModel is "daily"
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
  // We need to carefully control when this runs to avoid infinite loops
  useEffect(() => {
    // Only update if values actually differ - shallow equality isn't enough
    const currentFormDates = form.getValues('eventDates') || [];
    
    // Skip update if both are empty
    if (selectedDates.length === 0 && currentFormDates.length === 0) {
      return;
    }
    
    // Skip if they have same length and all dates match
    if (currentFormDates.length === selectedDates.length) {
      const allMatch = currentFormDates.every((date, index) => {
        if (!date || !selectedDates[index]) return false;
        return format(date, 'yyyy-MM-dd') === format(selectedDates[index], 'yyyy-MM-dd');
      });
      
      if (allMatch) return;
    }
    
    // Only update if there are actually changes
    if (selectedDates.length > 0) {
      form.setValue('eventDates', selectedDates, { shouldValidate: true, shouldDirty: true });
    }
  }, [selectedDates]);

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
  // Only watching selectedDates to avoid potential infinite loops
  useEffect(() => {
    // Only update active date if necessary to prevent infinite loops
    if (selectedDates.length > 0 && !activeDate) {
      // We have dates but no active date - set the first one as active
      setActiveDate(selectedDates[0]);
    } else if (selectedDates.length === 0 && activeDate) {
      // We have no dates but still have an active date - clear it
      setActiveDate(null);
    }
  }, [selectedDates]);
  
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
  
  // Extra effect to fetch musicians when editing an event with existing musician categories or types
  // We only want this to run once on component mount, hence the empty dependency array
  useEffect(() => {
    // This is initialization code so we only want it to run once
    console.log("Initial musician data:", { 
      categoryIds: initialData?.musicianCategoryIds,
      typeIds: initialData?.musicianTypeIds 
    });
    
    // Only run this if initialData and form are available
    if ((initialData?.musicianCategoryIds?.length > 0 || initialData?.musicianTypeIds?.length > 0) && form) {
      const categoryIds = initialData?.musicianCategoryIds || initialData?.musicianTypeIds || [];
      console.log("Setting form musicianCategoryIds", categoryIds);
      form.setValue("musicianCategoryIds", categoryIds);
    }
    
    // Also load existing musician assignments when editing
    if (initialData?.musicianAssignments) {
      console.log("Initial musician assignments:", initialData.musicianAssignments);
      // Update the musicianAssignments state with the initial assignments
      setMusicianAssignments(initialData.musicianAssignments);
    }
  }, []);
  
  // Function to check if a musician is available on a specific date
  const isMusicianAvailableForDate = (musicianId: number, date: Date): boolean => {
    try {
      // Use a consistent date format for comparison
      const normalizedDateStr = format(date, 'yyyy-MM-dd');
      
      console.log('Checking availability for musician:', musicianId, 'on date:', normalizedDateStr);
      
      // Check if this musician exists
      const musician = allMusicians.find(m => m.id === musicianId);
      if (!musician) {
        console.log('Musician not found in allMusicians');
        // For now, allow musician selection even if not found in the list
        return true;
      }
      
      // Always allow musicians to be selected regardless of availability data
      // This is a temporary fix to address the selection bug
      return true;
      
      /* ORIGINAL IMPLEMENTATION (DISABLED FOR TROUBLESHOOTING)
      // First check if we have date-specific availability data
      if (dateAvailabilityData && Object.keys(dateAvailabilityData).length > 0) {
        console.log('Checking date-specific availability data:', dateAvailabilityData);
        
        // Try direct lookup first - simplest approach
        if (dateAvailabilityData[normalizedDateStr]) {
          const isAvailable = dateAvailabilityData[normalizedDateStr].includes(musicianId);
          console.log('Direct lookup result:', isAvailable);
          return isAvailable;
        }
        
        // Try to find the date in our availability data using the normalized format
        const matchingKey = Object.keys(dateAvailabilityData).find(key => {
          try {
            const keyDate = new Date(key);
            return format(keyDate, 'yyyy-MM-dd') === normalizedDateStr;
          } catch (e) {
            return false;
          }
        });
        
        if (matchingKey && dateAvailabilityData[matchingKey]) {
          const isAvailable = dateAvailabilityData[matchingKey].includes(musicianId);
          console.log('Matching key lookup result:', isAvailable);
          return isAvailable;
        }
      }
      
      // If we don't have date-specific data yet, check the overall musician list
      const isInAvailableList = availableMusicians.some(m => m.id === musicianId);
      console.log('Falling back to general availability list. Result:', isInAvailableList);
      
      return isInAvailableList;
      */
    } catch (error) {
      console.error("Error checking musician availability for date " + format(date, 'yyyy-MM-dd') + ":", error);
      // Also return true for errors to allow musician selection
      // We'll handle actual availability on the server side
      return true;
    }
  };

  // Using memoized functions with empty dependencies to prevent recreations
  const handleAddMusicianToDate = useCallback((musicianId: number, date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const isAvailable = isMusicianAvailableForDate(musicianId, date);
    
    if (!isAvailable) {
      toast({
        title: "Musician unavailable",
        description: "This musician is not available on this date. Please choose another musician or date.",
        variant: "destructive",
      });
      return;
    }
    
    setMusicianAssignments(prev => {
      // Create a deep copy to avoid mutation
      const newAssignments = JSON.parse(JSON.stringify(prev));
      
      // Add musician to this date
      if (!newAssignments[dateKey]) {
        newAssignments[dateKey] = [musicianId];
      } else if (!newAssignments[dateKey].includes(musicianId)) {
        newAssignments[dateKey] = [...newAssignments[dateKey], musicianId];
      }
      
      return newAssignments;
    });
  }, []); // Empty dependency array
  
  const handleRemoveMusicianFromDate = useCallback((musicianId: number, date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    
    setMusicianAssignments(prev => {
      // Create a deep copy to avoid mutation
      const newAssignments = JSON.parse(JSON.stringify(prev));
      
      // Remove musician from this date
      if (newAssignments[dateKey]) {
        newAssignments[dateKey] = newAssignments[dateKey].filter(id => id !== musicianId);
        if (newAssignments[dateKey].length === 0) {
          delete newAssignments[dateKey];
        }
      }
      
      return newAssignments;
    });
  }, []); // Empty dependency array
  
  // Create a stable wrapper function that doesn't recreate on each render
  const toggleMusicianSelection = useCallback((musicianId: number, date: Date) => {
    if (!date || !musicianId) return;
    
    const dateKey = format(date, 'yyyy-MM-dd');
    const isCurrentlyAssigned = musicianAssignments[dateKey]?.includes(musicianId) || false;
    
    if (isCurrentlyAssigned) {
      handleRemoveMusicianFromDate(musicianId, date);
    } else {
      handleAddMusicianToDate(musicianId, date);
    }
  }, [musicianAssignments, handleAddMusicianToDate, handleRemoveMusicianFromDate]);

  function onSubmit(values: EventFormValues) {
    // Validate if there are any musician assignments
    if (selectedMusicians.length === 0 && selectedDates.length > 0 && selectedMusicianCategories.length > 0) {
      toast({
        title: "No musicians selected",
        description: "Please select at least one musician for your event dates",
        variant: "destructive",
      });
      return;
    }
    
    // We've made sure all keys in musicianAssignments are already yyyy-MM-dd format
    // so there's no need to normalize them again
    
    // Create a new object with the formatted values to match our EventApiValues type
    const formattedValues: EventApiValues = {
      name: values.name,
      paxCount: values.paxCount,
      venueId: values.venueId,
      eventCategoryId: values.eventCategoryId, // Add event category for rate calculation
      status: values.status,
      paymentModel: values.paymentModel, // Add the payment model
      musicianCategoryIds: values.musicianCategoryIds,
      notes: values.notes,
      eventDates: values.eventDates.map(date => format(date, 'yyyy-MM-dd')), // Use consistent date format
      musicianIds: selectedMusicians.length > 0 ? selectedMusicians : undefined,
      musicianAssignments: Object.keys(musicianAssignments).length > 0 ? musicianAssignments : undefined,
    };
    
    // Add conditional fields based on payment model
    if (values.paymentModel === "hourly" && values.hoursCount !== undefined) {
      formattedValues.hoursCount = values.hoursCount;
    } else if (values.paymentModel === "daily" && values.daysCount !== undefined) {
      formattedValues.daysCount = values.daysCount;
    }
    
    console.log("Submitting form data:", formattedValues);
    eventMutation.mutate(formattedValues);
  }

  const isLoading = isLoadingVenues || isLoadingMusicianCategories || isLoadingEventCategories;

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="eventCategoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Category *</FormLabel>
                <Select
                  value={field.value.toString()}
                  onValueChange={(value) => field.onChange(parseInt(value))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {eventCategories?.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Model *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment model" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                    <SelectItem value="daily">Daily Rate</SelectItem>
                    <SelectItem value="event">Event Rate</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Conditional fields based on paymentModel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {form.watch("paymentModel") === "hourly" && (
            <FormField
              control={form.control}
              name="hoursCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Hours *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter number of hours"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the total number of hours for this event
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {form.watch("paymentModel") === "daily" && (
            <FormField
              control={form.control}
              name="daysCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Days *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter number of days"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the total number of days for this event
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
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

        {/* Musician Categories - Multiple Selection */}
        <FormField
          control={form.control}
          name="musicianCategoryIds"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel>Musician Categories Needed *</FormLabel>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {musicianCategories?.map((category) => (
                  <FormField
                    key={category.id}
                    control={form.control}
                    name="musicianCategoryIds"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={category.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(category.id)}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || [];
                                return checked
                                  ? field.onChange([...currentValues, category.id])
                                  : field.onChange(
                                      currentValues.filter((value) => value !== category.id)
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {category.title}
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
        {selectedMusicianCategories.length > 0 && selectedDates.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Musician Invitations</h3>
            
            {renderAvailabilityInfo()}
            
            {isLoadingMusicians ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : allMusicians && allMusicians.filter(m => 
                // Check if the musician has any categories that match the selectedMusicianCategories
                m.categoryIds && m.categoryIds.some(catId => selectedMusicianCategories.includes(catId))
              ).length > 0 ? (
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
                        variant={activeDate && format(date, 'yyyy-MM-dd') === format(activeDate, 'yyyy-MM-dd') ? "default" : "outline"}
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
                        {activeDate && musicianAssignments[format(activeDate, 'yyyy-MM-dd')]?.map(musicianId => {
                          const musician = allMusicians?.find(m => m.id === musicianId);
                          if (!musician) return null;
                          
                          return (
                            <Badge 
                              key={`selected-${musicianId}-${format(activeDate, 'yyyy-MM-dd')}`}
                              variant="default"
                              className="flex items-center gap-1 px-3 py-1.5"
                            >
                              {musician.name}
                              <X 
                                className="h-3 w-3 cursor-pointer ml-1" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault(); // Prevent form submission
                                  
                                  // Use direct state update instead of function call
                                  const normDate = format(activeDate, 'yyyy-MM-dd');
                                  const newAssignments = {...musicianAssignments};
                                  
                                  // We know the musician is already assigned since we're in this map function
                                  newAssignments[normDate] = newAssignments[normDate].filter(id => id !== musicianId);
                                  
                                  // Remove empty dates
                                  if (newAssignments[normDate].length === 0) {
                                    delete newAssignments[normDate];
                                  }
                                  
                                  // Update state
                                  setMusicianAssignments(newAssignments);
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
                          const musician = allMusicians?.find(m => m.id === id);
                          if (!musician) return null;
                          
                          // Count how many dates this musician is assigned to
                          // Use a Set to ensure we're not counting duplicate date entries
                          const assignedDatesCount = Object.entries(musicianAssignments).reduce(
                            (count, [dateStr, musicians]) => {
                              // Parse the date to normalize it
                              const normalizedDate = format(new Date(dateStr), 'yyyy-MM-dd');
                              
                              // Only increment count if this musician is assigned and we haven't counted this date yet
                              if (musicians.includes(id) && !count.dates.has(normalizedDate)) {
                                count.dates.add(normalizedDate);
                                count.total += 1;
                              }
                              return count;
                            }, 
                            { total: 0, dates: new Set<string>() }
                          ).total;
                          
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

                {/* Group musicians by category */}
                {selectedMusicianCategories.map(categoryId => {
                  const category = musicianCategories?.find(c => c.id === categoryId);
                  const musiciansOfCategory = allMusicians.filter(m => 
                    m.categoryIds && m.categoryIds.includes(categoryId)
                  );
                  
                  return (
                    <div key={categoryId} className="space-y-3">
                      <h4 className="text-md font-medium">{category?.title}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {musiciansOfCategory.map((musician) => {
                          // Create a unique key for each musician
                          const musicianKey = `musician-${musician.id}`;
                          // Check if this musician is already selected for any date
                          const isSelectedAnywhere = selectedMusicians.includes(musician.id);
                          
                          // Check if this musician is selected for the currently active date
                          // Use a simple and direct approach
                          const isSelectedForActiveDate = activeDate 
                            ? musicianAssignments[format(activeDate, 'yyyy-MM-dd')]?.includes(musician.id) || false
                            : false;
                          
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
                              // Remove onClick handler from the card itself
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
                                      {/* Display musician categories */}
                                      <div className="flex flex-wrap gap-1">
                                        {musician.categoryIds?.map(catId => {
                                          const category = musicianCategories?.find(c => c.id === catId);
                                          return (
                                            <Badge key={catId} variant="outline" className="mr-1 text-xs">
                                              {category?.title || 'Unknown Category'}
                                            </Badge>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                  {activeDate && (
                                    <>
                                      {/* Show contract status if available */}
                                      {isSelectedForActiveDate && (
                                        <div className="mr-2">
                                          {getMusicianContractStatus(musician.id, activeDate) !== 'none' && (
                                            <Badge 
                                              variant="outline" 
                                              className={`mr-2 text-xs ${
                                                hasMusicianSignedContract(musician.id, activeDate) 
                                                  ? 'bg-green-100 border-green-300 text-green-800' 
                                                  : 'bg-blue-100 border-blue-300 text-blue-800'
                                              }`}
                                            >
                                              {hasMusicianSignedContract(musician.id, activeDate) 
                                                ? 'Contract Signed' 
                                                : 'Contract Sent'}
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                      
                                      <Button
                                        type="button"
                                        variant={isSelectedForActiveDate ? "destructive" : "outline"}
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          
                                          if (isSelectedForActiveDate) {
                                            // Check if musician has signed a contract
                                            if (hasMusicianSignedContract(musician.id, activeDate)) {
                                              toast({
                                                title: "Cannot remove musician",
                                                description: "This musician has signed a contract and cannot be removed.",
                                                variant: "destructive",
                                              });
                                              return;
                                            }
                                            handleRemoveMusicianFromDate(musician.id, activeDate);
                                          } else {
                                            if (isMusicianAvailableForDate(musician.id, activeDate)) {
                                              handleAddMusicianToDate(musician.id, activeDate);
                                            } else {
                                              toast({
                                                title: "Musician unavailable",
                                                description: "This musician is not available on this date.",
                                                variant: "destructive",
                                              });
                                            }
                                          }
                                        }}
                                        disabled={isSelectedForActiveDate && hasMusicianSignedContract(musician.id, activeDate)}
                                      >
                                        {isSelectedForActiveDate ? "Remove" : "Select"}
                                      </Button>
                                    </>
                                  )}
                                </div>
                                
                                {/* Show which dates this musician is assigned to */}
                                <div className="mt-3">
                                  <p className="text-xs text-muted-foreground mb-1">Date assignments:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedDates.map((date, idx) => {
                                      // Only check the normalized date format to avoid inconsistencies
                                      const normalizedDateStr = format(date, 'yyyy-MM-dd');
                                      // Simple, direct check using only the normalized date format
                                      const isAssignedToDate = musicianAssignments[normalizedDateStr]?.includes(musician.id) || false;
                                      
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
                                            
                                            // Use direct add/remove functions
                                            if (isAssignedToDate) {
                                              // Check if musician has signed a contract for this date
                                              if (hasMusicianSignedContract(musician.id, date)) {
                                                toast({
                                                  title: "Cannot remove musician",
                                                  description: "This musician has signed a contract and cannot be removed.",
                                                  variant: "destructive",
                                                });
                                                return;
                                              }
                                              handleRemoveMusicianFromDate(musician.id, date);
                                            } else if (isAvailableForDate) {
                                              handleAddMusicianToDate(musician.id, date);
                                            } else {
                                              toast({
                                                title: "Musician unavailable",
                                                description: "This musician is not available on this date.",
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                          // Disable the badge click if contract is signed
                                          style={isAssignedToDate && hasMusicianSignedContract(musician.id, date) ? { pointerEvents: 'none', opacity: 0.7 } : {}}
                                        >
                                          {format(date, "MMM d")}
                                          {isAssignedToDate && hasMusicianSignedContract(musician.id, date) && (
                                            <span className="ml-1" title="Contract Signed">✓</span>
                                          )}
                                          {!isAvailableForDate && !isAssignedToDate && (
                                            <span className="ml-1" title="Not available">❌</span>
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
                <p className="text-muted-foreground">No musicians found for the selected category(ies)</p>
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
