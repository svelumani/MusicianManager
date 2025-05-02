import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ContractTemplate } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Copy, Edit, Pencil, Plus, Save, Tag, Trash } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Create a schema for template form validation
const templateFormSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().optional(),
  content: z.string().min(10, { message: "Content must be at least 10 characters" }),
  isDefault: z.boolean().optional()
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export default function ContractTemplatesPage() {
  const { toast } = useToast();
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ContractTemplate | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>("");

  // Fetch templates
  const { data: templates, isLoading, error } = useQuery<ContractTemplate[]>({
    queryKey: ["/api/contract-templates"],
    // Use the default queryFn already set up in queryClient
  });

  // Set default template mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/contract-templates/${id}/set-default`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contract-templates"] });
      toast({
        title: "Default template updated",
        description: "The default contract template has been set successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error setting default template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      return await apiRequest("/api/contract-templates", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contract-templates"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Template created",
        description: "The contract template has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TemplateFormValues }) => {
      return await apiRequest(`/api/contract-templates/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contract-templates"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Template updated",
        description: "The contract template has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contract-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contract-templates"] });
      setIsDeleteDialogOpen(false);
      toast({
        title: "Template deleted",
        description: "The contract template has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form for adding a new template
  const addForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      content: "",
      isDefault: false,
    },
  });

  // Form for editing a template
  const editForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      content: "",
      isDefault: false,
    },
  });

  const onAddSubmit = (data: TemplateFormValues) => {
    createTemplateMutation.mutate(data);
  };

  const onEditSubmit = (data: TemplateFormValues) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    }
  };

  const handleEditTemplate = (template: ContractTemplate) => {
    setEditingTemplate(template);
    editForm.reset({
      name: template.name,
      description: template.description || "",
      content: template.content,
      isDefault: template.isDefault,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteTemplate = (template: ContractTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  const handlePreviewTemplate = (template: ContractTemplate) => {
    setPreviewContent(template.content);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteTemplateMutation.mutate(templateToDelete.id);
    }
  };

  const handleSetDefault = (template: ContractTemplate) => {
    if (!template.isDefault) {
      setDefaultMutation.mutate(template.id);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading templates...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load contract templates. Please try again later.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Contract Templates</h1>
          <p className="text-muted-foreground">Manage your contract templates for agreements with musicians</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Template
        </Button>
      </div>

      {templates && templates.length === 0 ? (
        <Alert>
          <AlertTitle>No templates found</AlertTitle>
          <AlertDescription>
            You haven't created any contract templates yet. Create one to get started.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates?.map((template) => (
            <Card key={template.id} className="h-full flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  {template.isDefault && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="mb-2">
                  <Label>Content Preview</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md h-32 overflow-hidden text-sm">
                    {template.content.substring(0, 200)}
                    {template.content.length > 200 && "..."}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Created: {new Date(template.createdAt).toLocaleDateString()}
                  {template.updatedAt && (
                    <>, Updated: {new Date(template.updatedAt).toLocaleDateString()}</>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2 border-t">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreviewTemplate(template)}
                  >
                    <Copy className="h-4 w-4 mr-1" /> Preview
                  </Button>
                </div>
                <div className="flex gap-2">
                  {!template.isDefault && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSetDefault(template)}
                    >
                      <Check className="h-4 w-4 mr-1" /> Set Default
                    </Button>
                  )}
                  {!template.isDefault && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template)}
                    >
                      <Trash className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add Template Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add New Contract Template</DialogTitle>
            <DialogDescription>
              Create a new contract template for musician agreements
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-6">
              <Tabs defaultValue="details">
                <TabsList className="mb-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="content">Template Content</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-4">
                  <FormField
                    control={addForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Standard Performance Contract" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Briefly describe this template's purpose"
                            className="min-h-24"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Set as Default Template</FormLabel>
                          <FormDescription>
                            This template will be used by default when creating new contracts
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                <TabsContent value="content">
                  <FormField
                    control={addForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Content</FormLabel>
                        <FormDescription>
                          Write your contract template using Markdown. You can use variables like {"{musician_name}"}, {"{event_date}"}, and {"{fee_amount}"}.
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            placeholder="# MUSICIAN PERFORMANCE AGREEMENT 
                            
This agreement is made between {client_name} and {musician_name}..."
                            className="min-h-72 font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTemplateMutation.isPending}>
                  {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Contract Template</DialogTitle>
            <DialogDescription>
              Modify the details and content of your contract template
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <Tabs defaultValue="details">
                <TabsList className="mb-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="content">Template Content</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            className="min-h-24"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={editingTemplate?.isDefault}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Set as Default Template</FormLabel>
                          <FormDescription>
                            {editingTemplate?.isDefault
                              ? "This template is already set as default"
                              : "This template will be used by default when creating new contracts"}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </TabsContent>
                <TabsContent value="content">
                  <FormField
                    control={editForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Content</FormLabel>
                        <FormDescription>
                          Edit your contract template using Markdown. You can use variables like {"{musician_name}"}, {"{event_date}"}, and {"{fee_amount}"}.
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            className="min-h-72 font-mono"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTemplateMutation.isPending}>
                  {updateTemplateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Delete */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the "{templateToDelete?.name}" template.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTemplateMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      {previewContent && (
        <Dialog open={!!previewContent} onOpenChange={() => setPreviewContent("")}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
              <DialogDescription>
                Preview how your contract will look
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-96 w-full rounded-md border p-4">
              <div className="whitespace-pre-wrap font-mono">{previewContent}</div>
            </ScrollArea>
            <DialogFooter>
              <Button onClick={() => setPreviewContent("")}>Close Preview</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}