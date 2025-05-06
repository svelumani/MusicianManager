import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertMusicianSchema, insertMusicianPayRateSchema } from "@shared/schema";
import type { MusicianCategory, MusicianType, EventCategory, Musician, MusicianPayRate } from "@shared/schema";
import { Loader2, Trash2, PlusCircle, ChevronLeft } from "lucide-react";
import { useEffect } from "react";

// Create a schema for the pay rate items
const payRateSchema = z.object({
  id: z.number().optional(),
  eventCategoryId: z.coerce.number().min(1, "Event category is required"),
  hourlyRate: z.coerce.number().min(0, "Hourly rate must be at least 0").optional().nullable(),
  dayRate: z.coerce.number().min(0, "Day rate must be at least 0").optional().nullable(),
  eventRate: z.coerce.number().min(0, "Event rate must be at least 0").optional().nullable(),
  notes: z.string().optional().nullable(),
  musicianId: z.number().optional(),
});

// Extend the musician schema with additional validation
const musicianFormSchema = insertMusicianSchema
  .omit({ typeId: true })
  .extend({
    id: z.number().optional(),
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 characters"),
    typeId: z.coerce.number().min(1, "Type is required"),
    categoryId: z.coerce.number().min(1, "Category is required"),
    instruments: z.array(z.string()).optional(),
    profileImage: z.string().optional(),
    bio: z.string().optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    payRates: z.array(payRateSchema),
  });

type MusicianFormValues = z.infer<typeof musicianFormSchema>;

export default function EditMusicianPage() {
  const { id } = useParams<{ id: string }>();
  const musicianId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: musician, isLoading: isLoadingMusician } = useQuery<Musician>({
    queryKey: ["/api/musicians", musicianId],
    queryFn: async () => {
      const res = await fetch(`/api/musicians/${musicianId}`);
      if (!res.ok) throw new Error("Failed to fetch musician");
      return res.json();
    },
  });

  const { data: payRates, isLoading: isLoadingPayRates } = useQuery<MusicianPayRate[]>({
    queryKey: ["/api/v2/musician-pay-rates", musicianId],
    queryFn: async () => {
      // Add cache-busting timestamp
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/v2/musician-pay-rates?musicianId=${musicianId}&t=${timestamp}`);
      if (!res.ok) throw new Error("Failed to fetch pay rates");
      return res.json();
    },
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery<MusicianCategory[]>({
    queryKey: ["/api/musician-categories"],
  });

  const { data: musicianTypes, isLoading: isLoadingMusicianTypes } = useQuery<MusicianType[]>({
    queryKey: ["/api/musician-types"],
  });

  const { data: eventCategories, isLoading: isLoadingEventCategories } = useQuery<EventCategory[]>({
    queryKey: ["/api/event-categories"],
  });

  const form = useForm<MusicianFormValues>({
    resolver: zodResolver(musicianFormSchema),
    defaultValues: {
      id: musicianId,
      name: "",
      email: "",
      phone: "",
      typeId: 0,
      categoryId: 0,
      instruments: [],
      profileImage: "",
      bio: "",
      rating: undefined,
      payRates: [],
    },
  });

  // Set up field array for dynamic pay rates
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "payRates",
  });

  // Update form when musician data loads
  useEffect(() => {
    if (musician && form) {
      form.reset({
        id: musician.id,
        name: musician.name,
        email: musician.email,
        phone: musician.phone,
        typeId: musician.typeId,
        categoryId: musician.categoryId,
        instruments: musician.instruments || [],
        profileImage: musician.profileImage || "",
        bio: musician.bio || "",
        rating: musician.rating !== null ? musician.rating : undefined,
        payRates: payRates || [],
      });
    }
  }, [musician, payRates, form]);

  // Add missing pay rates when event categories load
  useEffect(() => {
    if (musician && payRates && eventCategories && eventCategories.length > 0) {
      // Create a set of existing event category IDs in the pay rates
      const existingCategoryIds = new Set(payRates.map(rate => rate.eventCategoryId));
      
      // Find missing event categories
      const missingCategories = eventCategories.filter(
        category => !existingCategoryIds.has(category.id)
      );
      
      // Update the form with all pay rates (existing and new ones)
      if (missingCategories.length > 0) {
        const newPayRates = [
          ...payRates,
          ...missingCategories.map(category => ({
            eventCategoryId: category.id,
            hourlyRate: 0,
            dayRate: null,
            eventRate: null,
            notes: null,
            musicianId: musician.id,
          }))
        ];
        
        replace(newPayRates);
      }
    }
  }, [musician, payRates, eventCategories, replace]);

  const updateMusicianMutation = useMutation({
    mutationFn: async (values: MusicianFormValues) => {
      try {
        // Extract pay rates data and musician data
        const { payRates, ...musicianData } = values;

        // Update the musician
        const musicianResponse = await fetch(`/api/musicians/${musicianId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(musicianData),
          credentials: "include"
        });
        
        if (!musicianResponse.ok) {
          throw new Error(`HTTP error ${musicianResponse.status}`);
        }
        
        const updatedMusician = await musicianResponse.json();
        
        // Handle pay rates - update existing ones and create new ones
        const payRatePromises = payRates.map(payRate => {
          const endpoint = "/api/musician-pay-rates";
          const method = payRate.id ? "PUT" : "POST";
          const url = payRate.id ? `${endpoint}/${payRate.id}` : endpoint;
          
          return fetch(url, {
            method,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...payRate,
              musicianId: updatedMusician.id
            }),
            credentials: "include"
          });
        });
        
        await Promise.all(payRatePromises);
        
        return updatedMusician;
      } catch (err) {
        console.error("Error updating musician:", err);
        throw err;
      }
    },
    onSuccess: () => {
      toast({
        title: "Musician updated",
        description: "The musician has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/musicians"] });
      queryClient.invalidateQueries({ queryKey: ["/api/musicians", musicianId] });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/musician-pay-rates", musicianId] });
      navigate(`/musicians/${musicianId}`);
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Failed to update musician",
        description: error.message || "An error occurred while updating the musician",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: MusicianFormValues) {
    // Handle the instruments array
    if (!values.instruments || values.instruments.length === 0) {
      const selectedType = musicianTypes?.find(type => type.id === values.typeId);
      values.instruments = [selectedType?.title || "Unknown"];
    }
    
    updateMusicianMutation.mutate(values);
  }

  const isLoading = isLoadingMusician || isLoadingPayRates || isLoadingCategories 
    || isLoadingMusicianTypes || isLoadingEventCategories;

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2"
            onClick={() => navigate(`/musicians/${musicianId}`)}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Musician
          </Button>
          <h1 className="text-2xl font-bold">Edit Musician</h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Musician Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter musician name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="Enter email address" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter phone number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="typeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select 
                        value={field.value ? field.value.toString() : ""} 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select musician type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {musicianTypes?.map((type) => (
                            <SelectItem 
                              key={type.id} 
                              value={type.id.toString()}
                            >
                              {type.title}
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
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select 
                        value={field.value ? field.value.toString() : ""} 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select musician category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem 
                              key={category.id} 
                              value={category.id.toString()}
                            >
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
                  name="profileImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Image URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter image URL"
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
                          value={field.value === undefined ? "" : field.value}
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

              <div className="mt-6">
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter musician bio"
                          className="resize-none h-32"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Pay Rates</CardTitle>
              <CardDescription>Set different pay rates for each event category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {fields.map((field, index) => {
                  const eventCategory = eventCategories?.find(
                    category => category.id === field.eventCategoryId
                  );
                  
                  return (
                    <div key={field.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-md font-medium">
                          {eventCategory?.title || `Event Category ${index + 1}`}
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name={`payRates.${index}.eventCategoryId`}
                          render={({ field }) => (
                            <FormItem className="hidden">
                              <FormControl>
                                <Input type="hidden" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`payRates.${index}.hourlyRate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hourly Rate ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  {...field}
                                  value={field.value === undefined || field.value === null ? "" : field.value}
                                  onChange={(e) => {
                                    const value = e.target.value === "" ? null : parseFloat(e.target.value);
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
                          name={`payRates.${index}.dayRate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Daily Rate ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  {...field}
                                  value={field.value === undefined || field.value === null ? "" : field.value}
                                  onChange={(e) => {
                                    const value = e.target.value === "" ? null : parseFloat(e.target.value);
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
                          name={`payRates.${index}.eventRate`}
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2 md:col-span-1">
                              <FormLabel>Event Rate ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  {...field}
                                  value={field.value === undefined || field.value === null ? "" : field.value}
                                  onChange={(e) => {
                                    const value = e.target.value === "" ? null : parseFloat(e.target.value);
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
                          name={`payRates.${index}.notes`}
                          render={({ field }) => (
                            <FormItem className="md:col-span-3">
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Add notes about this rate"
                                  className="resize-none"
                                  {...field}
                                  value={field.value || ""}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              type="button"
              onClick={() => navigate(`/musicians/${musicianId}`)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateMusicianMutation.isPending}
              className="px-8"
            >
              {updateMusicianMutation.isPending ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}