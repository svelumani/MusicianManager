import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
//import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Plus, Edit, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ImprovementPlan as ImprovementPlanType, ImprovementAction } from "@shared/schema";

interface ImprovementPlanProps {
  musicianId: number;
  readOnly?: boolean;
}

// Form schemas
const improvementPlanSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  status: z.string().default("active"),
});

const improvementActionSchema = z.object({
  action: z.string().min(5, "Action must be at least 5 characters"),
  dueDate: z.string().optional(),
  feedback: z.string().optional(),
});

const completionFeedbackSchema = z.object({
  feedback: z.string().min(5, "Feedback must be at least 5 characters"),
});

export default function ImprovementPlan({ musicianId, readOnly = false }: ImprovementPlanProps) {
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<ImprovementPlanType | null>(null);
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ImprovementAction | null>(null);
  const [isProvidingFeedback, setIsProvidingFeedback] = useState(false);

  // Fetch improvement plans
  const { data: plans, isLoading } = useQuery({
    queryKey: ["/api/improvement-plans", { musicianId }],
    queryFn: async () => {
      const res = await fetch(`/api/improvement-plans?musicianId=${musicianId}`);
      if (!res.ok) throw new Error("Failed to fetch improvement plans");
      return res.json();
    },
  });

  // Fetch improvement actions for the selected plan
  const { data: actions, isLoading: actionsLoading } = useQuery({
    queryKey: ["/api/improvement-plans", selectedPlan?.id, "actions"],
    queryFn: async () => {
      if (!selectedPlan) return [];
      const res = await fetch(`/api/improvement-plans/${selectedPlan.id}/actions`);
      if (!res.ok) throw new Error("Failed to fetch improvement actions");
      return res.json();
    },
    enabled: !!selectedPlan,
  });

  // Form for creating/editing plans
  const planForm = useForm<z.infer<typeof improvementPlanSchema>>({
    resolver: zodResolver(improvementPlanSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "active",
    },
  });

  // Form for creating actions
  const actionForm = useForm<z.infer<typeof improvementActionSchema>>({
    resolver: zodResolver(improvementActionSchema),
    defaultValues: {
      action: "",
      dueDate: "",
      feedback: "",
    },
  });

  // Form for completion feedback
  const feedbackForm = useForm<z.infer<typeof completionFeedbackSchema>>({
    resolver: zodResolver(completionFeedbackSchema),
    defaultValues: {
      feedback: "",
    },
  });

  // Mutations
  const createPlanMutation = useMutation({
    mutationFn: async (data: z.infer<typeof improvementPlanSchema>) => {
      const res = await fetch("/api/improvement-plans", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          musicianId,
          createdAt: new Date().toISOString(),
        }),
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error("Failed to create improvement plan");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/improvement-plans"] });
      toast({
        title: "Plan created",
        description: "Improvement plan has been created successfully.",
      });
      setIsAddingPlan(false);
      planForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (data: z.infer<typeof improvementPlanSchema>) => {
      if (!selectedPlan) throw new Error("No plan selected");
      
      const res = await fetch(`/api/improvement-plans/${selectedPlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          updatedAt: new Date().toISOString(),
        }),
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error("Failed to update improvement plan");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/improvement-plans"] });
      toast({
        title: "Plan updated",
        description: "Improvement plan has been updated successfully.",
      });
      setIsEditingPlan(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan) throw new Error("No plan selected");
      
      const res = await fetch(`/api/improvement-plans/${selectedPlan.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error("Failed to delete improvement plan");
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/improvement-plans"] });
      toast({
        title: "Plan deleted",
        description: "Improvement plan has been deleted successfully.",
      });
      setSelectedPlan(null);
      setDeleteConfirmOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createActionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof improvementActionSchema>) => {
      if (!selectedPlan) throw new Error("No plan selected");
      
      const payload = {
        ...data,
        planId: selectedPlan.id,
        status: "pending",
        addedAt: new Date().toISOString(),
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      };
      
      const res = await fetch(`/api/improvement-plans/${selectedPlan.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error("Failed to create action item");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/improvement-plans", selectedPlan?.id, "actions"] });
      toast({
        title: "Action added",
        description: "Improvement action has been added successfully.",
      });
      setIsAddingAction(false);
      actionForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add action",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeActionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof completionFeedbackSchema>) => {
      if (!selectedAction) throw new Error("No action selected");
      
      const res = await fetch(`/api/improvement-actions/${selectedAction.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error("Failed to complete action");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/improvement-plans", selectedPlan?.id, "actions"] });
      toast({
        title: "Action completed",
        description: "Improvement action has been marked as completed.",
      });
      setIsProvidingFeedback(false);
      feedbackForm.reset();
      setSelectedAction(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete action",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteActionMutation = useMutation({
    mutationFn: async (actionId: number) => {
      const res = await fetch(`/api/improvement-actions/${actionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error("Failed to delete action item");
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/improvement-plans", selectedPlan?.id, "actions"] });
      toast({
        title: "Action removed",
        description: "Improvement action has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove action",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (plan: ImprovementPlanType) => {
    setSelectedPlan(plan);
  };

  const handleEditPlan = () => {
    if (!selectedPlan) return;
    planForm.reset({
      title: selectedPlan.title,
      description: selectedPlan.description || "",
      status: selectedPlan.status,
    });
    setIsEditingPlan(true);
  };

  const onSubmitPlan = (data: z.infer<typeof improvementPlanSchema>) => {
    if (isEditingPlan) {
      updatePlanMutation.mutate(data);
    } else {
      createPlanMutation.mutate(data);
    }
  };

  const onSubmitAction = (data: z.infer<typeof improvementActionSchema>) => {
    createActionMutation.mutate(data);
  };

  const onSubmitFeedback = (data: z.infer<typeof completionFeedbackSchema>) => {
    completeActionMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getActionStatusBadge = (action: ImprovementAction) => {
    if (action.completedAt) {
      return <Badge variant="success">Completed</Badge>;
    }
    if (action.dueDate && new Date(action.dueDate) < new Date()) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Improvement Plans</h3>
        {!readOnly && (
          <Dialog open={isAddingPlan} onOpenChange={setIsAddingPlan}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Improvement Plan</DialogTitle>
              </DialogHeader>
              <Form {...planForm}>
                <form onSubmit={planForm.handleSubmit(onSubmitPlan)} className="space-y-4">
                  <FormField
                    control={planForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Improvement plan title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={planForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the goals and purpose of this improvement plan"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createPlanMutation.isPending}>
                    {createPlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Plan
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {plans?.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Existing Plans</h4>
            <div className="space-y-2">
              {plans.map((plan: ImprovementPlanType) => (
                <div
                  key={plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  className={`p-3 rounded-md border hover:bg-accent cursor-pointer ${
                    selectedPlan?.id === plan.id ? "bg-accent border-primary" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium">{plan.title}</h5>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {plan.description}
                      </p>
                    </div>
                    <div>{getStatusBadge(plan.status)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Created: {new Date(plan.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedPlan && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedPlan.title}</CardTitle>
                    <CardDescription>
                      Created on {new Date(selectedPlan.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(selectedPlan.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Description</h4>
                  <p className="text-sm">{selectedPlan.description}</p>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">Action Items</h4>
                    {!readOnly && (
                      <Dialog open={isAddingAction} onOpenChange={setIsAddingAction}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Action
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Action Item</DialogTitle>
                          </DialogHeader>
                          <Form {...actionForm}>
                            <form onSubmit={actionForm.handleSubmit(onSubmitAction)} className="space-y-4">
                              <FormField
                                control={actionForm.control}
                                name="action"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Action</FormLabel>
                                    <FormControl>
                                      <Input placeholder="What needs to be done" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={actionForm.control}
                                name="dueDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Due Date (Optional)</FormLabel>
                                    <FormControl>
                                      <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={actionForm.control}
                                name="feedback"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Additional Notes (Optional)</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Additional details about this action"
                                        className="min-h-[80px]"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" disabled={createActionMutation.isPending}>
                                {createActionMutation.isPending && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Add Action
                              </Button>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {actionsLoading ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : actions?.length ? (
                    <Accordion type="single" collapsible className="w-full">
                      {actions.map((action: ImprovementAction) => (
                        <AccordionItem key={action.id} value={`action-${action.id}`}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center">
                                {!readOnly && (
                                  <Checkbox
                                    checked={!!action.completedAt}
                                    onCheckedChange={() => {
                                      if (!action.completedAt) {
                                        setSelectedAction(action);
                                        setIsProvidingFeedback(true);
                                      }
                                    }}
                                    disabled={!!action.completedAt || readOnly}
                                    className="mr-2"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                )}
                                <span
                                  className={`text-sm font-medium ${
                                    action.completedAt ? "line-through text-muted-foreground" : ""
                                  }`}
                                >
                                  {action.action}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {getActionStatusBadge(action)}
                                {action.dueDate && (
                                  <span className="text-xs text-muted-foreground">
                                    Due: {new Date(action.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 pl-6">
                              {/* Action details displayed here */}
                              
                              {action.completedAt && (
                                <div>
                                  <h5 className="text-xs font-medium">Completion Feedback:</h5>
                                  <p className="text-sm">{action.feedback || "No feedback provided."}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Completed on: {new Date(action.completedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              )}
                              
                              {!readOnly && !action.completedAt && (
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAction(action);
                                      setIsProvidingFeedback(true);
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Complete
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteActionMutation.mutate(action.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No action items added yet.</p>
                  )}
                </div>
              </CardContent>
              
              {!readOnly && (
                <CardFooter className="justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={handleEditPlan}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Plan
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Plan
                  </Button>
                </CardFooter>
              )}
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center p-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No Improvement Plans</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                There are no improvement plans for this musician yet. Create a plan to track development areas
                and action items.
              </p>
              {!readOnly && (
                <Button onClick={() => setIsAddingPlan(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Plan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Plan Dialog */}
      <Dialog open={isEditingPlan} onOpenChange={setIsEditingPlan}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Improvement Plan</DialogTitle>
          </DialogHeader>
          <Form {...planForm}>
            <form onSubmit={planForm.handleSubmit(onSubmitPlan)} className="space-y-4">
              <FormField
                control={planForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Improvement plan title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={planForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the goals and purpose of this improvement plan"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={planForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        {...field}
                      >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={updatePlanMutation.isPending}>
                {updatePlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Plan
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the improvement plan and all its associated actions. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePlanMutation.mutate()}
              disabled={deletePlanMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Completion Feedback Dialog */}
      <Dialog open={isProvidingFeedback} onOpenChange={setIsProvidingFeedback}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completion Feedback</DialogTitle>
          </DialogHeader>
          <Form {...feedbackForm}>
            <form onSubmit={feedbackForm.handleSubmit(onSubmitFeedback)} className="space-y-4">
              <p className="text-sm">
                You're marking this action as complete:
                <span className="font-medium block mt-1">{selectedAction?.action}</span>
              </p>
              <FormField
                control={feedbackForm.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide feedback on the completion of this action"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={completeActionMutation.isPending}>
                {completeActionMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Mark as Complete
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}