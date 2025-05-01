import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Music, Building, Calendar, Mic } from "lucide-react";
import { 
  insertMusicianCategorySchema, 
  insertVenueCategorySchema, 
  insertEventCategorySchema,
  insertMusicianTypeSchema
} from "@shared/schema";
import { useSearchParams } from "@/hooks/use-search-params";

// Extend the category schema with additional validation
const musicianCategoryFormSchema = insertMusicianCategorySchema.extend({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
});

const venueCategoryFormSchema = insertVenueCategorySchema.extend({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
});

const eventCategoryFormSchema = insertEventCategorySchema.extend({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
});

const musicianTypeFormSchema = insertMusicianTypeSchema.extend({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof musicianCategoryFormSchema>;
type CategoryType = "musician" | "venue" | "event" | "musician-type";

export default function AddCategoryPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialType = (searchParams.get("type") as CategoryType) || "musician";
  const [categoryType, setCategoryType] = useState<CategoryType>(initialType);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(
      categoryType === "musician" ? musicianCategoryFormSchema :
      categoryType === "venue" ? venueCategoryFormSchema :
      categoryType === "event" ? eventCategoryFormSchema :
      musicianTypeFormSchema
    ),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const getApiPath = () => {
    return categoryType === "musician" ? "/api/musician-categories" :
           categoryType === "venue" ? "/api/venue-categories" :
           categoryType === "event" ? "/api/event-categories" :
           "/api/musician-types";
  };

  const createCategoryMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      return await apiRequest(getApiPath(), "POST", values);
    },
    onSuccess: () => {
      toast({
        title: "Category created",
        description: `The ${categoryType} category has been created successfully`,
      });
      queryClient.invalidateQueries({ queryKey: [getApiPath()] });
      navigate("/categories");
    },
    onError: (error) => {
      console.error("Category creation error:", error);
      toast({
        title: "Failed to create category",
        description: error.message || "An error occurred while creating the category",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: CategoryFormValues) {
    createCategoryMutation.mutate(values);
  }

  const getCategoryTypeName = () => {
    switch (categoryType) {
      case "musician": return "Musician";
      case "venue": return "Venue";
      case "event": return "Event";
      case "musician-type": return "Musician Type";
      default: return "Category";
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Add New {getCategoryTypeName()} Category</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Category Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={categoryType} className="w-full mb-6" onValueChange={(value) => setCategoryType(value as CategoryType)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="musician">
                <Music className="h-4 w-4 mr-2" /> Musician
              </TabsTrigger>
              <TabsTrigger value="venue">
                <Building className="h-4 w-4 mr-2" /> Venue
              </TabsTrigger>
              <TabsTrigger value="event">
                <Calendar className="h-4 w-4 mr-2" /> Event
              </TabsTrigger>
              <TabsTrigger value="musician-type">
                <Mic className="h-4 w-4 mr-2" /> Musician Type
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder={`Enter ${getCategoryTypeName().toLowerCase()} category title`} {...field} />
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
                        placeholder={`Enter ${getCategoryTypeName().toLowerCase()} category description`}
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
                  onClick={() => navigate("/categories")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCategoryMutation.isPending}
                >
                  {createCategoryMutation.isPending ? "Saving..." : `Save ${getCategoryTypeName()} Category`}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
