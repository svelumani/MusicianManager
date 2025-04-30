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
import { insertCategorySchema } from "@shared/schema";

// Extend the category schema with additional validation
const categoryFormSchema = insertCategorySchema.extend({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function AddCategoryPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const res = await apiRequest("POST", "/api/categories", values);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Category created",
        description: "The category has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      navigate("/categories");
    },
    onError: (error) => {
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Add New Category</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Category Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category title" {...field} />
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
                        placeholder="Enter category description"
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
                  {createCategoryMutation.isPending ? "Saving..." : "Save Category"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
