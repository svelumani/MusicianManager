import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ChevronLeft,
  DollarSign, 
  HelpCircle, 
  Loader2,
  Save 
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { insertMusicianPayRateSchema } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

// Extend the schema for form validation
const formSchema = insertMusicianPayRateSchema.extend({
  eventCategoryId: z.number().min(1, "Event category is required"),
  hourlyRate: z.number().nonnegative().optional(),
  dayRate: z.number().nonnegative().optional(),
  eventRate: z.number().nonnegative().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.hourlyRate || data.dayRate || data.eventRate,
  {
    message: "At least one rate must be specified",
    path: ["hourlyRate"], 
  }
);

type FormValues = z.infer<typeof formSchema>;

export default function RateMusicianPage() {
  const [, navigate] = useLocation();
  const { eventId, musicianId } = useParams<{ eventId: string; musicianId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get the date from URL search params
  const searchParams = new URLSearchParams(window.location.search);
  const dateStr = searchParams.get('date');
  
  // Parse IDs
  const parsedEventId = parseInt(eventId);
  const parsedMusicianId = parseInt(musicianId);
  
  // Fetch event details
  const { data: event, isLoading: isLoadingEvent } = useQuery({
    queryKey: [`/api/events/${parsedEventId}`],
    enabled: !isNaN(parsedEventId),
  });
  
  // Fetch musician details
  const { data: musician, isLoading: isLoadingMusician } = useQuery({
    queryKey: ["/api/musicians", parsedMusicianId],
    enabled: !isNaN(parsedMusicianId),
    queryFn: async () => {
      const res = await fetch(`/api/musicians/${parsedMusicianId}`);
      if (!res.ok) throw new Error("Failed to fetch musician");
      return res.json();
    },
  });
  
  // Fetch existing pay rates from v2 endpoint
  const { data: existingRates, isLoading: isLoadingRates } = useQuery({
    queryKey: ["/api/v2/musician-pay-rates", parsedMusicianId],
    enabled: !isNaN(parsedMusicianId),
    queryFn: async () => {
      // Add cache-busting timestamp
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/v2/musician-pay-rates?musicianId=${parsedMusicianId}&t=${timestamp}`);
      
      if (!res.ok) {
        console.error(`Failed to fetch pay rates: ${res.status} ${res.statusText}`);
        throw new Error("Failed to fetch pay rates from database");
      }
      
      const data = await res.json();
      console.log(`Retrieved ${data.length} pay rates from V2 API for musician ${parsedMusicianId}`);
      return data;
    },
  });
  
  // Fetch event categories for dropdown
  const { data: eventCategories } = useQuery({
    queryKey: ["/api/event-categories"],
  });
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      musicianId: parsedMusicianId,
      eventCategoryId: event?.categoryIds?.[0] || event?.musicianCategoryIds?.[0], // Set from event category if available
      hourlyRate: 0,
      dayRate: 0,
      eventRate: 0,
      notes: "",
    },
  });
  
  // Set initial form values from existing rates if available
  useEffect(() => {
    if (existingRates && existingRates.length > 0 && event) {
      // Try to find rate matching this event's category if available
      let categorySpecificRate = null;
      
      // First check if there's a match with event category IDs
      if (event.categoryIds && event.categoryIds.length > 0) {
        categorySpecificRate = existingRates.find(
          rate => event.categoryIds.includes(rate.eventCategoryId)
        );
      }
      
      // If no match found, try with musician category IDs
      if (!categorySpecificRate && event.musicianCategoryIds && event.musicianCategoryIds.length > 0) {
        categorySpecificRate = existingRates.find(
          rate => event.musicianCategoryIds.includes(rate.eventCategoryId)
        );
      }
      
      // Otherwise use the default rate
      const defaultRate = existingRates.find(
        rate => !rate.eventCategoryId
      );
      
      const rateToUse = categorySpecificRate || defaultRate;
      
      if (rateToUse) {
        form.reset({
          musicianId: parsedMusicianId,
          eventCategoryId: rateToUse.eventCategoryId,
          hourlyRate: rateToUse.hourlyRate || 0,
          dayRate: rateToUse.dayRate || 0,
          eventRate: rateToUse.eventRate || 0,
          notes: rateToUse.notes || "",
        });
      }
    }
  }, [existingRates, event, form, parsedMusicianId]);
  
  // Create or update pay rate mutation
  const rateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // API endpoint (we can still use the direct endpoint for writing)
      // The v2 endpoint is primarily needed for reading due to the Vite middleware issue
      const url = "/api/direct/musician-pay-rates";
      
      // Check if we're updating an existing rate
      let existingRateId = null;
      if (existingRates && existingRates.length > 0 && event) {
        const matchingRate = existingRates.find(
          rate => rate.eventCategoryId === values.eventCategoryId
        );
        if (matchingRate) {
          existingRateId = matchingRate.id;
        }
      }
      
      // Update existing rate or create a new one
      if (existingRateId) {
        const res = await fetch(`${url}/${existingRateId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });
        
        if (!res.ok) throw new Error("Failed to update rate");
        return res.json();
      } else {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });
        
        if (!res.ok) throw new Error("Failed to create rate");
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Musician pay rate has been saved",
      });
      
      // Invalidate relevant queries - include both the direct and v2 endpoints
      queryClient.invalidateQueries({ queryKey: ["/api/direct/musician-pay-rates", parsedMusicianId] });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/musician-pay-rates", parsedMusicianId] });
      queryClient.invalidateQueries({ queryKey: ["/api/musicians", parsedMusicianId] });
      
      // Navigate back to event view
      navigate(`/events/${parsedEventId}`);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save pay rate",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: FormValues) => {
    rateMutation.mutate(values);
  };
  
  // Format event date for display
  const formattedDate = dateStr 
    ? format(new Date(dateStr), "EEEE, MMMM d, yyyy") 
    : "Not specified";
  
  // Loading state
  if (isLoadingEvent || isLoadingMusician || isLoadingRates) {
    return (
      <div className="container py-10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  // Error state if data not found
  if (!event || !musician) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              The event or musician information could not be loaded.
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
  
  return (
    <div className="container py-8 max-w-3xl">
      <div className="space-y-1 mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={() => navigate(`/events/${parsedEventId}`)}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Event
        </Button>
        <h1 className="text-3xl font-bold">Set Musician Rate</h1>
        <p className="text-muted-foreground">
          For {event.name} on {formattedDate}
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={musician.profileImage || undefined} alt={musician.name} />
              <AvatarFallback>{musician.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{musician.name}</CardTitle>
              <CardDescription>{musician.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="eventCategoryId"
                render={({ field }) => (
                  <FormItem className="mb-4">
                    <FormLabel className="flex items-center gap-2">
                      Event Category
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The type of event this rate applies to</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select
                      value={field.value?.toString() || ""}
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Hourly Rate
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>The rate paid per hour of performance</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-8"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dayRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Day Rate
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>The rate paid for a full day of performance</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-8"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="eventRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Event Rate
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>The flat rate paid for the entire event</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="pl-8"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes about this rate (optional)"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button" 
                  variant="outline"
                  onClick={() => navigate(`/events/${parsedEventId}`)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={rateMutation.isPending}
                >
                  {rateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Rate
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}