import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiSelect } from "@/components/ui/multi-select";

interface AssignMusicianDialogProps {
  plannerId: number;
  date: Date;
  venueId: number;
  venueName: string;
  onClose: () => void;
  slot: any; // PlannerSlot | null
  musicians: any[]; // Musician[]
  categories: any[]; // Category[]
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "contract-sent", label: "Contract Sent" },
  { value: "contract-signed", label: "Contract Signed" },
  { value: "needs-clarification", label: "Needs Clarification" },
  { value: "overseas-performer", label: "Overseas Performer" },
];

const AssignMusicianDialog = ({
  plannerId,
  date,
  venueId,
  venueName,
  onClose,
  slot,
  musicians,
  categories,
}: AssignMusicianDialogProps) => {
  const { toast } = useToast();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    slot?.categoryIds 
      ? Array.isArray(slot.categoryIds) 
        ? slot.categoryIds.map(id => id.toString()) 
        : [slot.categoryIds.toString()]
      : slot?.categoryId 
        ? [slot.categoryId.toString()] 
        : []
  );
  const [selectedStatus, setSelectedStatus] = useState<string>(
    slot?.status || "draft"
  );
  const [startTime, setStartTime] = useState<string>(slot?.startTime || "19:00");
  const [endTime, setEndTime] = useState<string>(slot?.endTime || "22:00");
  const [selectedMusicians, setSelectedMusicians] = useState<any[]>([]);
  const [open, setOpen] = useState<boolean>(true);

  // Query to get planner assignments for this slot
  const {
    data: assignments,
    isLoading: isAssignmentsLoading,
  } = useQuery({
    queryKey: ['/api/planner-assignments', slot?.id],
    queryFn: () => apiRequest(`/api/planner-assignments?slotId=${slot.id}`),
    enabled: !!slot?.id,
  });

  // Set selected musicians from assignments
  useEffect(() => {
    if (assignments && musicians) {
      const selectedMusicianDetails = assignments.map((assignment: any) => {
        const musician = musicians.find((m: any) => m.id === assignment.musicianId);
        return {
          ...musician,
          assignmentId: assignment.id,
          actualFee: assignment.actualFee,
        };
      });
      setSelectedMusicians(selectedMusicianDetails);
    }
  }, [assignments, musicians]);

  // Update or create slot
  const slotMutation = useMutation({
    mutationFn: (data: any) => {
      if (slot) {
        return apiRequest(`/api/planner-slots/${slot.id}`, "PUT", data);
      } else {
        return apiRequest("/api/planner-slots", "POST", data);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: slot ? "Slot updated successfully" : "Slot created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/planner-slots', plannerId] });
      
      // If no slot existed before, use the newly created one
      if (!slot) {
        setUpNewSlot(data);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: slot ? "Failed to update slot" : "Failed to create slot",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Create assignment
  const createAssignmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/planner-assignments", "POST", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Musician assigned successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/planner-assignments', slot?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to assign musician",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Update assignment
  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/planner-assignments/${id}`, "PUT", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Assignment updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/planner-assignments', slot?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Delete assignment
  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/planner-assignments/${id}`, "DELETE"),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Musician removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/planner-assignments', slot?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove musician",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Set up new slot with created slot data
  const setUpNewSlot = (newSlot: any) => {
    if (newSlot) {
      // Update the component with the new slot information
      if (newSlot.categoryIds) {
        setSelectedCategories(
          Array.isArray(newSlot.categoryIds)
            ? newSlot.categoryIds.map(id => id.toString())
            : [newSlot.categoryIds.toString()]
        );
      } else if (newSlot.categoryId) {
        setSelectedCategories([newSlot.categoryId.toString()]);
      }
      setSelectedStatus(newSlot.status);
      setStartTime(newSlot.startTime);
      setEndTime(newSlot.endTime);
    }
  };

  // Handle saving the slot
  const handleSaveSlot = () => {
    // When updating an existing slot, don't pass the date 
    // This avoids the date format conversion issues
    const slotData: any = {
      plannerId,
      venueId,
      categoryIds: selectedCategories.map(id => parseInt(id)),
      startTime,
      endTime,
      status: selectedStatus,
    };

    // Only include date when creating a new slot
    if (!slot) {
      slotData.date = date.toISOString();
    }

    console.log("Saving slot with data:", slotData);
    slotMutation.mutate(slotData);
  };

  // Handle assigning a musician
  const handleAssignMusician = (musicianId: number) => {
    if (!slot) {
      // Create slot first if it doesn't exist
      const slotData: any = {
        plannerId,
        date: new Date(date), // Use proper Date object
        venueId,
        categoryIds: selectedCategories.map(id => parseInt(id)),
        startTime,
        endTime,
        status: selectedStatus,
      };

      console.log("Creating slot before assigning musician:", slotData);
      slotMutation.mutate(slotData);
      return;
    }

    // Check if musician is already selected
    if (selectedMusicians.some((m) => m.id === musicianId)) {
      toast({
        title: "Warning",
        description: "This musician is already assigned to this slot",
      });
      return;
    }

    // Create assignment
    const assignmentData = {
      slotId: slot.id,
      musicianId,
      status: "scheduled",
      actualFee: musicians.find((m) => m.id === musicianId)?.payRate || null,
    };

    createAssignmentMutation.mutate(assignmentData);
  };

  // Handle removing a musician
  const handleRemoveMusician = (musicianId: number) => {
    const musician = selectedMusicians.find((m) => m.id === musicianId);
    if (musician && musician.assignmentId) {
      deleteAssignmentMutation.mutate(musician.assignmentId);
    }
  };

  // Handle updating musician fee
  const handleUpdateFee = (musicianId: number, fee: number) => {
    const musician = selectedMusicians.find((m) => m.id === musicianId);
    if (musician && musician.assignmentId) {
      updateAssignmentMutation.mutate({
        id: musician.assignmentId,
        data: { actualFee: fee },
      });
    }
  };

  // Filter musicians by selected categories
  const [activeCategory, setActiveCategory] = useState<string | null>(
    selectedCategories.length > 0 ? selectedCategories[0] : null
  );

  // Update active category when selected categories change
  useEffect(() => {
    if (selectedCategories.length > 0 && !activeCategory) {
      setActiveCategory(selectedCategories[0]);
    } else if (selectedCategories.length === 0) {
      setActiveCategory(null);
    } else if (activeCategory && !selectedCategories.includes(activeCategory)) {
      setActiveCategory(selectedCategories[0]);
    }
  }, [selectedCategories, activeCategory]);

  // Filter musicians by active category
  const filteredMusicians = musicians.filter(
    (musician) => activeCategory ? musician.categoryId === parseInt(activeCategory) : false
  );

  return (
    <Dialog open={open} onOpenChange={(open) => {
      setOpen(open);
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            Assign Musicians - {venueName} ({format(date, "MMMM d, yyyy")})
          </DialogTitle>
          <DialogDescription>
            Assign musicians to this venue for the selected date.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slot Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Slot Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time</label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Musician Types</label>
              <MultiSelect
                options={categories.map((category) => ({
                  value: category.id.toString(),
                  label: category.title
                }))}
                selected={selectedCategories}
                onChange={setSelectedCategories}
                placeholder="Select musician types"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleSaveSlot} disabled={slotMutation.isPending}>
              {slotMutation.isPending ? "Saving..." : "Save Slot"}
            </Button>
          </div>

          {/* Assigned Musicians */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Assigned Musicians</h3>
            
            {isAssignmentsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : selectedMusicians.length > 0 ? (
              <div className="space-y-3">
                {selectedMusicians.map((musician) => (
                  <div key={musician.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <div className="font-medium">{musician.name}</div>
                      <div className="text-sm text-gray-500">{categories.find((c) => c.id === musician.categoryId)?.title}</div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-24"
                        value={musician.actualFee || musician.payRate || 0}
                        onChange={(e) => handleUpdateFee(musician.id, parseFloat(e.target.value))}
                      />
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMusician(musician.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between p-3 border-t">
                  <div className="font-bold">Total</div>
                  <div className="font-bold">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(
                      selectedMusicians.reduce(
                        (total, musician) => total + (musician.actualFee || musician.payRate || 0),
                        0
                      )
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 border rounded-md text-gray-500">
                No musicians assigned yet
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="all" className="mt-6">
          <TabsList>
            <TabsTrigger value="all">All Musicians</TabsTrigger>
            <TabsTrigger value="available">Available Musicians</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="border rounded-md p-4">
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Filter by Musician Type</label>
              <Select
                value={activeCategory || ""}
                onValueChange={value => setActiveCategory(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCategories.length > 0 ? (
                    selectedCategories.map(catId => {
                      const category = categories.find(c => c.id.toString() === catId);
                      return (
                        <SelectItem key={catId} value={catId}>
                          {category?.title || "Unknown"}
                        </SelectItem>
                      );
                    })
                  ) : (
                    <SelectItem value="" disabled>
                      No categories selected
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {filteredMusicians.length > 0 ? (
                filteredMusicians.map((musician) => (
                  <div
                    key={musician.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium">{musician.name}</div>
                      <div className="text-sm text-gray-500">
                        {categories.find((c) => c.id === musician.categoryId)?.title} - 
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(musician.payRate || 0)}
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAssignMusician(musician.id)}
                      disabled={selectedMusicians.some((m) => m.id === musician.id)}
                    >
                      {selectedMusicians.some((m) => m.id === musician.id) ? (
                        <Check className="h-4 w-4 mr-1" />
                      ) : (
                        <Plus className="h-4 w-4 mr-1" />
                      )}
                      {selectedMusicians.some((m) => m.id === musician.id)
                        ? "Assigned"
                        : "Assign"}
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center p-6 text-gray-500">
                  {selectedCategories.length > 0 
                    ? "No musicians found in this category" 
                    : "Please select at least one musician type above"}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="available" className="border rounded-md p-4">
            <div className="text-center p-6 text-gray-500">
              Available musicians feature coming soon. Will show only musicians with availability marked for this date.
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignMusicianDialog;