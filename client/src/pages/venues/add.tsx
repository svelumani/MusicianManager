import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { insertVenueSchema } from "@shared/schema";

// Extend the venue schema with additional validation
const venueFormSchema = insertVenueSchema.extend({
  name: z.string().min(3, "Name must be at least 3 characters"),
  location: z.string().min(2, "Location must be at least 2 characters"),
  paxCount: z.coerce.number().min(1, "Pax count must be at least 1"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  venuePictures: z.array(z.string()).optional(),
  openingHours: z.string().optional(),
  capacity: z.coerce.number().optional(),
  hourlyRate: z.coerce.number().optional(),
  description: z.string().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
});

type VenueFormValues = z.infer<typeof venueFormSchema>;

export default function AddVenuePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<VenueFormValues>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: {
      name: "",
      location: "",
      paxCount: 0,
      address: "",
      venuePictures: [],
      openingHours: "",
      capacity: undefined,
      hourlyRate: undefined,
      description: "",
      rating: undefined,
    },
  });

  const createVenueMutation = useMutation({
    mutationFn: async (values: VenueFormValues) => {
      const res = await apiRequest("/api/venues", "POST", values);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Venue created",
        description: "The venue has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      navigate("/venues");
    },
    onError: (error) => {
      toast({
        title: "Failed to create venue",
        description: error.message || "An error occurred while creating the venue",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: VenueFormValues) {
    // For demo purposes, if venuePictures is empty, add a placeholder image
    if (!values.venuePictures || values.venuePictures.length === 0) {
      values.venuePictures = ["https://images.unsplash.com/photo-1566737236500-c8ac43014a67?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=900&q=80"];
    }
    
    createVenueMutation.mutate(values);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Add New Venue</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Venue Information</CardTitle>
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
                      <FormLabel>Venue Name *</FormLabel>
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
                      <FormLabel>Location *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter location" {...field} />
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
                      <FormLabel>Pax Count *</FormLabel>
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
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter capacity"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                            field.onChange(value);
                          }}
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
                          placeholder="e.g., 9:00 AM - 11:00 PM"
                          {...field}
                          value={field.value || ""}
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
                          placeholder="Enter hourly rate"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter venue description"
                        className="resize-none h-32"
                        {...field}
                        value={field.value || ""}
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
                        placeholder="Enter rating"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          field.onChange(value);
                        }}
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
                  onClick={() => navigate("/venues")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createVenueMutation.isPending}
                >
                  {createVenueMutation.isPending ? "Saving..." : "Save Venue"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
