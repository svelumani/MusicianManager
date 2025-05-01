import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
}

export default function EventForm({ onSuccess, onCancel }: EventFormProps) {
  const { toast } = useToast();

  const { data: venues, isLoading: isLoadingVenues } = useQuery<Venue[]>({
    queryKey: ["/api/venues"],
  });



  const { data: musicianTypes, isLoading: isLoadingMusicianTypes } = useQuery<MusicianType[]>({
    queryKey: ["/api/musician-types"],
  });

  // State to track selected dates for multi-day events
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  
  // State to track selected musicians
  const [selectedMusicians, setSelectedMusicians] = useState<number[]>([]);
  
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
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
  
  // Query for available musicians based on selected musician types
  const { data: availableMusicians, isLoading: isLoadingMusicians } = useQuery<Musician[]>({
    queryKey: ["/api/musicians", { typeIds: selectedMusicianTypes }],
    enabled: selectedMusicianTypes.length > 0,
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
    musicianIds?: number[]; // Add selected musicians
  };
  
  const createEventMutation = useMutation<any, Error, EventApiValues>({
    mutationFn: async (values: EventApiValues) => {
      // No need to further transform the dates since they're already strings
      const res = await apiRequest("/api/events", "POST", values);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Event created",
        description: "The event has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Failed to create event",
        description: error.message || "An error occurred while creating the event",
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
  
  // Handle musician selection/deselection
  const toggleMusicianSelection = (musicianId: number) => {
    const isSelected = selectedMusicians.includes(musicianId);
    
    if (isSelected) {
      setSelectedMusicians(prev => prev.filter(id => id !== musicianId));
    } else {
      setSelectedMusicians(prev => [...prev, musicianId]);
    }
  };

  function onSubmit(values: EventFormValues) {
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
    };
    
    createEventMutation.mutate(formattedValues);
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
            
            {isLoadingMusicians ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : availableMusicians && availableMusicians.length > 0 ? (
              <div className="space-y-6">
                {/* Show summary of selected musicians if any */}
                {selectedMusicians.length > 0 && (
                  <div className="mb-6 p-4 border rounded-md bg-primary/5">
                    <h4 className="text-md font-medium mb-2">Selected Musicians ({selectedMusicians.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedMusicians.map(id => {
                        const musician = availableMusicians?.find(m => m.id === id);
                        if (!musician) return null;
                        
                        return (
                          <Badge 
                            key={`selected-${id}`}
                            variant="default"
                            className="flex items-center gap-1 px-3 py-1.5"
                          >
                            {musician.name}
                            <X 
                              className="h-3 w-3 cursor-pointer ml-1" 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMusicianSelection(id);
                              }}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Group musicians by type */}
                {selectedMusicianTypes.map(typeId => {
                  const musicianType = musicianTypes?.find(t => t.id === typeId);
                  const musiciansOfType = availableMusicians.filter(m => m.typeId === typeId);
                  
                  return (
                    <div key={typeId} className="space-y-3">
                      <h4 className="text-md font-medium">{musicianType?.title}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {musiciansOfType.map((musician) => {
                          // Create a unique key for each musician
                          const musicianKey = `musician-${musician.id}`;
                          // Check if this musician is already selected
                          const isSelected = selectedMusicians.includes(musician.id)
                          
                          return (
                            <Card 
                              key={musicianKey} 
                              className={`overflow-hidden cursor-pointer transition-colors ${
                                isSelected ? 'border-primary bg-primary/5' : ''
                              }`}
                              onClick={() => toggleMusicianSelection(musician.id)}
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
                                    <div className="font-medium">{musician.name}</div>
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
                                      {/* Display musician type instead of instruments since it's not in our schema yet */}
                                      <Badge variant="outline" className="mr-1 text-xs">
                                        {musicianTypes?.find(t => t.id === musician.typeId)?.title}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      id={musicianKey}
                                      checked={isSelected}
                                      onCheckedChange={() => toggleMusicianSelection(musician.id)}
                                    />
                                  </div>
                                </div>
                                
                                {/* Show which dates this musician is available for */}
                                <div className="mt-3">
                                  <p className="text-xs text-muted-foreground mb-1">Available dates:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedDates.map((date, idx) => (
                                      <Badge 
                                        key={idx}
                                        variant={idx % 2 === 0 ? "outline" : "secondary"}
                                        className="text-xs"
                                      >
                                        {format(date, "MMM d")}
                                      </Badge>
                                    ))}
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
            disabled={createEventMutation.isPending}
          >
            {createEventMutation.isPending ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
