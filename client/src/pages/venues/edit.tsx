import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertVenueSchema, Venue } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

const formSchema = insertVenueSchema.extend({
  capacity: z.preprocess(
    (val) => (val === "" ? null : val),
    z.number().nullable().optional()
  ),
  hourlyRate: z.preprocess(
    (val) => (val === "" ? null : val),
    z.number().nullable().optional()
  ),
  rating: z.preprocess(
    (val) => (val === "" ? null : val),
    z.number().nullable().optional()
  ).refine(
    (val) => val === null || (val >= 0 && val <= 5),
    { message: "Rating must be between 0 and 5" }
  ),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditVenuePage({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: venue, isLoading, error } = useQuery<Venue>({
    queryKey: [`/api/venues/${id}`],
  });

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest(`/api/venues/${id}`, "PUT", values);
      if (!res.ok) {
        throw new Error("Failed to update venue");
      }
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Venue updated",
        description: "The venue has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/venues/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      navigate(`/venues/${id}`);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: "",
      address: "",
      paxCount: 0,
      description: null,
      capacity: null,
      hourlyRate: null,
      openingHours: null,
      rating: null,
      venuePictures: [],
    },
  });

  useEffect(() => {
    if (venue) {
      // Reset form with venue data
      form.reset({
        name: venue.name,
        location: venue.location,
        address: venue.address,
        paxCount: venue.paxCount,
        description: venue.description,
        capacity: venue.capacity,
        hourlyRate: venue.hourlyRate,
        openingHours: venue.openingHours,
        rating: venue.rating,
        venuePictures: venue.venuePictures,
      });
    }
  }, [venue, form]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading venue",
        description: "The venue could not be found or loaded.",
        variant: "destructive",
      });
      navigate("/venues");
    }
  }, [error, toast, navigate]);

  function onSubmit(values: FormValues) {
    updateMutation.mutate(values);
  }

  if (isLoading) {
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
          <Button variant="outline" size="icon" onClick={() => navigate(`/venues/${id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Edit Venue: {venue.name}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Venue Information</CardTitle>
          <CardDescription>Update the venue details below</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter venue name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="City, State" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Full address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paxCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Person Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Number of people"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Maximum capacity (optional)"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Hourly rate (optional)"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="openingHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opening Hours</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 9am-5pm (optional)"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating (0-5)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          placeholder="Venue rating (optional)"
                          {...field}
                          value={field.value === null ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Rate from 0 to 5 stars</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the venue (optional)"
                        className="min-h-32"
                        {...field}
                        value={field.value === null ? "" : field.value}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={() => navigate(`/venues/${id}`)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Saving...
                    </div>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> 
                      Save Changes
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