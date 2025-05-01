import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertMusicianSchema } from "@shared/schema";
import type { Category } from "@shared/schema";

// Extend the musician schema with additional validation
const musicianFormSchema = insertMusicianSchema.extend({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  type: z.string().min(2, "Type must be at least 2 characters"),
  payRate: z.coerce.number().min(1, "Pay rate must be at least 1"),
  categoryId: z.coerce.number(),
  instruments: z.array(z.string()).optional(),
  profileImage: z.string().optional(),
  bio: z.string().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
});

type MusicianFormValues = z.infer<typeof musicianFormSchema>;

export default function AddMusicianPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<MusicianFormValues>({
    resolver: zodResolver(musicianFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      type: "",
      payRate: 0,
      categoryId: 0,
      instruments: [],
      profileImage: "",
      bio: "",
      rating: undefined,
    },
  });

  const createMusicianMutation = useMutation({
    mutationFn: async (values: MusicianFormValues) => {
      try {
        const response = await apiRequest("POST", "/api/musicians", values);
        return response;
      } catch (err) {
        console.error("Error saving musician:", err);
        throw err;
      }
    },
    onSuccess: () => {
      toast({
        title: "Musician created",
        description: "The musician has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/musicians"] });
      navigate("/musicians");
    },
    onError: (error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Failed to create musician",
        description: error.message || "An error occurred while creating the musician",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: MusicianFormValues) {
    // Handle the instruments array
    if (!values.instruments || values.instruments.length === 0) {
      values.instruments = [values.type];
    }
    
    // Use a default profile image if none provided
    if (!values.profileImage) {
      values.profileImage = "https://images.unsplash.com/photo-1531384441138-2736e62e0919?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80";
    }
    
    createMusicianMutation.mutate(values);
  }

  if (isLoadingCategories) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Add New Musician</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Musician Information</CardTitle>
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Pianist, Guitarist, Vocalist" {...field} />
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
                  name="payRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pay Rate per Hour ($) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter pay rate"
                          {...field}
                        />
                      </FormControl>
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
                        value={field.value.toString()} 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
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

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/musicians")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMusicianMutation.isPending}
                >
                  {createMusicianMutation.isPending ? "Saving..." : "Save Musician"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
