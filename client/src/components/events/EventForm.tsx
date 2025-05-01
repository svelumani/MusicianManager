import { zodResolver } from "@hookform/resolvers/zod";
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
import { CalendarIcon } from "lucide-react";
import { insertEventSchema } from "@shared/schema";
import type { Venue, Category } from "@shared/schema";

// Extend the event schema with additional validation
const eventFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  paxCount: z.coerce.number().min(1, "Pax count must be at least 1"),
  venueId: z.coerce.number(),
  eventType: z.enum(["One Day", "Multi-day (continuous)", "Multi-day (occurrence)"]),
  startDate: z.date(),
  endDate: z.date().optional(),
  status: z.string().default("pending"),
  categoryIds: z.array(z.coerce.number()),
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

  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: "",
      paxCount: 0,
      venueId: 0,
      eventType: "One Day",
      startDate: new Date(),
      status: "pending",
      categoryIds: [],
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (values: EventFormValues) => {
      // Format the values to match the API schema
      const apiValues = {
        ...values,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate ? values.endDate.toISOString() : undefined,
      };
      
      const res = await apiRequest("/api/events", "POST", apiValues);
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

  function onSubmit(values: EventFormValues) {
    createEventMutation.mutate(values);
  }

  const isLoading = isLoadingVenues || isLoadingCategories;

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
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Type *</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="One Day">One Day</SelectItem>
                    <SelectItem value="Multi-day (continuous)">Multi-day (continuous)</SelectItem>
                    <SelectItem value="Multi-day (occurrence)">Multi-day (occurrence)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Event Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full pl-3 text-left font-normal"
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="categoryIds"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel>Music Categories Needed *</FormLabel>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {categories?.map((category) => (
                  <FormField
                    key={category.id}
                    control={form.control}
                    name="categoryIds"
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
