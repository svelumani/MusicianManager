import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { EmailTemplate } from "@shared/schema";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2, Save } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Form schema for email templates
const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  htmlContent: z.string().min(1, "HTML content is required"),
  textContent: z.string().min(1, "Text content is required"),
  description: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

// Template Editor component
const TemplateEditor = ({ 
  template, 
  onSave, 
  onCancel 
}: { 
  template: EmailTemplate | null;
  onSave: (data: TemplateFormValues) => void;
  onCancel: () => void;
}) => {
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: template ? {
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      description: template.description,
      isDefault: template.isDefault,
    } : {
      name: "",
      subject: "",
      htmlContent: "",
      textContent: "",
      description: "",
      isDefault: false,
    },
  });

  const [activeTab, setActiveTab] = useState<string>("html");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Template Name</FormLabel>
                <FormControl>
                  <Input placeholder="Monthly Assignment Email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Subject</FormLabel>
                <FormControl>
                  <Input placeholder="Your Performance Schedule for &#123;&#123;month&#125;&#125; &#123;&#123;year&#125;&#125;" {...field} />
                </FormControl>
                <FormDescription>
                  Use placeholders like &#123;&#123;name&#125;&#125; for dynamic content
                </FormDescription>
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
                <Input placeholder="Template for sending monthly performance schedules to musicians" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="border rounded-md">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center p-2 bg-muted/50">
              <TabsList>
                <TabsTrigger value="html">HTML Content</TabsTrigger>
                <TabsTrigger value="text">Text Content</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="html" className="p-4">
              <FormField
                control={form.control}
                name="htmlContent"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="HTML content with placeholders like &#123;&#123;musicianName&#125;&#125;"
                        className="min-h-[300px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Use HTML for rich formatting. Use placeholders like &#123;&#123;musicianName&#125;&#125; for dynamic content.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            
            <TabsContent value="text" className="p-4">
              <FormField
                control={form.control}
                name="textContent"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Plain text content with placeholders like &#123;&#123;musicianName&#125;&#125;"
                        className="min-h-[300px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Fallback plain text version for email clients that don't support HTML.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            
            <TabsContent value="preview" className="p-4">
              <div className="border rounded p-4 bg-card">
                <div className="mb-2 font-bold">Subject: {form.watch("subject")}</div>
                <div className="border-t pt-2">
                  <div 
                    className="prose max-w-none" 
                    dangerouslySetInnerHTML={{ __html: form.watch("htmlContent") }}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                This is a rough preview. Placeholders will be replaced with actual data when sending emails.
              </p>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Template
          </Button>
        </div>
      </form>
    </Form>
  );
};

// Main Templates Page
const EmailTemplatesPage = () => {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<EmailTemplate | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);

  // Fetch all templates
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ["/api/email-templates"],
    queryFn: async () => {
      const response = await fetch("/api/email-templates");
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }
      return response.json();
    },
  });

  // Create new template
  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      const response = await apiRequest("POST", "/api/email-templates", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template created",
        description: "The email template has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setIsEditing(false);
      setCurrentTemplate(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to create template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update existing template
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TemplateFormValues }) => {
      const response = await apiRequest("PUT", `/api/email-templates/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template updated",
        description: "The email template has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setIsEditing(false);
      setCurrentTemplate(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to update template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete template
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/email-templates/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template deleted",
        description: "The email template has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete template",
        description: error.message,
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
    },
  });

  // Handle saving template
  const handleSaveTemplate = (data: TemplateFormValues) => {
    if (currentTemplate) {
      updateMutation.mutate({ id: currentTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Handle edit button click
  const handleEditTemplate = (template: EmailTemplate) => {
    setCurrentTemplate(template);
    setIsEditing(true);
  };

  // Handle delete button click
  const handleDeleteClick = (template: EmailTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-destructive text-center">
          <h3 className="text-lg font-semibold">Error Loading Templates</h3>
          <p>{(error as Error).message}</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] })} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground">Manage email templates for musician communications</p>
        </div>
        
        <Button onClick={() => {
          setCurrentTemplate(null);
          setIsEditing(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>{currentTemplate ? "Edit Template" : "Create New Template"}</CardTitle>
            <CardDescription>
              {currentTemplate 
                ? "Modify the template's content and settings" 
                : "Create a new email template with placeholders for dynamic content"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TemplateEditor 
              template={currentTemplate}
              onSave={handleSaveTemplate}
              onCancel={() => {
                setIsEditing(false);
                setCurrentTemplate(null);
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Available Templates</CardTitle>
            <CardDescription>
              Email templates for various communications with musicians
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.length > 0 ? (
                  templates.map((template: EmailTemplate) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell>{template.description}</TableCell>
                      <TableCell>
                        {template.isDefault ? (
                          <Badge>Default</Badge>
                        ) : (
                          <Badge variant="outline">Custom</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!template.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(template)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      No email templates found. Create your first template to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the template "{templateToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplatesPage;