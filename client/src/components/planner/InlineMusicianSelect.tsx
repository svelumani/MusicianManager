import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus, User, Trash, Calendar, Save, Check, DollarSign, Edit, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InlineMusicianSelectProps {
  date: Date;
  venueId: number;
  venueName: string;
  plannerId: number;
  categories: any[];
  musicians: any[];
  slot: any;
  onClose: () => void;
  onCreated?: (slot: any) => void;
  onMusicianAssigned?: () => void;
}

const InlineMusicianSelect = ({
  date,
  venueId,
  venueName,
  plannerId,
  categories,
  musicians,
  slot,
  onClose,
  onCreated,
  onMusicianAssigned
}: InlineMusicianSelectProps) => {
  const { toast } = useToast();
  const [categoryId, setCategoryId] = useState<string>(slot?.categoryId?.toString() || categories[0]?.id.toString() || "1");
  const [selectedMusicianId, setSelectedMusicianId] = useState<string>("");
  const [startTime, setStartTime] = useState(slot?.startTime || "19:00");
  const [endTime, setEndTime] = useState(slot?.endTime || "22:00");
  const [notes, setNotes] = useState(slot?.description || "");
  
  // Fee editing state
  const [editingFeeId, setEditingFeeId] = useState<number | null>(null);
  const [editingFeeValue, setEditingFeeValue] = useState<string>("");
  
  // Get current assignments for the slot
  const {
    data: currentAssignments = [],
    isLoading: isLoadingAssignments,
  } = useQuery({
    queryKey: ['/api/planner-assignments', slot?.id],
    queryFn: () => apiRequest(`/api/planner-assignments?slotId=${slot.id}`),
    enabled: !!slot?.id,
  });

  // Create or get slot mutation
  const slotMutation = useMutation({
    mutationFn: (data: any) => {
      if (slot) {
        // Update existing slot
        return apiRequest(`/api/planner-slots/${slot.id}`, "PUT", {
          ...data,
          id: slot.id
        });
      } else {
        // Create new slot
        return apiRequest("/api/planner-slots", "POST", data);
      }
    },
    onSuccess: (data) => {
      if (onCreated) onCreated(data);
      
      toast({
        title: "Success",
        description: slot ? "Slot updated successfully" : "Slot created successfully",
      });

      // If this is a slot update, call the onMusicianAssigned handler 
      // to refresh the assignment data (including recalculated fees)
      if (slot && onMusicianAssigned) {
        onMusicianAssigned();
      }
      
      // If a musician is selected, proceed to assign them
      if (selectedMusicianId && parseInt(selectedMusicianId) > 0) {
        assignMusicianToSlot(data.id, parseInt(selectedMusicianId));
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

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/planner-assignments", "POST", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Musician assigned successfully",
      });
      
      if (onMusicianAssigned) onMusicianAssigned();
      
      // Reset musician selection
      setSelectedMusicianId("");
      
      // Refresh assignments
      queryClient.invalidateQueries({ queryKey: ['/api/planner-assignments', slot?.id] });
    },
    onError: (error: any) => {
      console.error("Assignment error:", error);
      
      // Check if it's an availability error
      if (error?.error === "MUSICIAN_UNAVAILABLE") {
        toast({
          title: "Musician Unavailable",
          description: "This musician is marked as unavailable on this date. Please select another musician or update their availability calendar.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to assign musician",
          variant: "destructive",
        });
      }
    }
  });
  
  // Update assignment fee mutation
  const updateAssignmentFeeMutation = useMutation({
    mutationFn: ({ id, actualFee }: { id: number, actualFee: number }) => 
      apiRequest(`/api/planner-assignments/${id}`, "PUT", { actualFee }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Musician fee updated successfully",
      });
      
      if (onMusicianAssigned) onMusicianAssigned();
      
      // Reset editing state
      setEditingFeeId(null);
      
      // Refresh assignments
      queryClient.invalidateQueries({ queryKey: ['/api/planner-assignments', slot?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update musician fee",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Delete assignment mutation
  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) => 
      apiRequest(`/api/planner-assignments/${assignmentId}`, "DELETE"),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Musician removed successfully",
      });
      
      if (onMusicianAssigned) onMusicianAssigned();
      
      // Refresh assignments
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

  // Query available musicians for this date and category
  const {
    data: availableMusicians = [],
    isLoading: isLoadingAvailableMusicians,
  } = useQuery({
    queryKey: ['/api/available-musicians', date.toISOString().split('T')[0], categoryId],
    queryFn: () => {
      const dateStr = date.toISOString().split('T')[0];
      return apiRequest(`/api/available-musicians?date=${dateStr}&categoryIds=${categoryId}`);
    },
    enabled: !!date && !!categoryId,
  });
  
  // Merge additional data with available musicians
  const filteredMusicians = availableMusicians.map((availMusician: any) => {
    // Find the complete musician data from the passed musicians prop
    const fullMusicianData = musicians.find((m: any) => m.id === availMusician.id) || availMusician;
    return { ...fullMusicianData };
  });

  // Handle musician selection
  const handleMusicianSelect = (musicianId: string) => {
    setSelectedMusicianId(musicianId);
    
    // If we already have a slot, directly assign the musician
    if (slot) {
      assignMusicianToSlot(slot.id, parseInt(musicianId));
    } else {
      // Otherwise, create a slot first with "draft" status
      const slotData = {
        plannerId,
        date: new Date(date),
        venueId,
        categoryId: parseInt(categoryId),
        startTime,
        endTime,
        status: "draft", // Automatically set to draft
        description: notes,
        fee: null
      };
      
      slotMutation.mutate(slotData);
    }
  };

  // Assign musician to slot
  const assignMusicianToSlot = (slotId: number, musicianId: number) => {
    const musician = musicians.find(m => m.id === musicianId);
    if (!musician) return;
    
    // Check if this musician is already assigned to this slot
    const isAlreadyAssigned = currentAssignments.some(
      (assignment: any) => assignment.musicianId === musicianId
    );
    
    if (isAlreadyAssigned) {
      toast({
        title: "Info",
        description: "This musician is already assigned to this slot",
      });
      return;
    }
    
    // Find the slot to get start/end time
    let currentSlot;
    if (slot && slot.id === slotId) {
      currentSlot = slot;
    } else {
      // If this is a newly created slot, it should be available as 'slot' with updated data
      // If not, default to using startTime and endTime from state
      currentSlot = {
        startTime,
        endTime
      };
    }
    
    // Calculate hours based on start and end times
    let hours = 3; // Default to 3 hours if calculation fails
    try {
      if (currentSlot.startTime && currentSlot.endTime) {
        // Parse the time strings (format: "HH:MM" like "19:00")
        const [startHours, startMinutes] = currentSlot.startTime.split(':').map(Number);
        const [endHours, endMinutes] = currentSlot.endTime.split(':').map(Number);
        
        // Convert to minutes for easier calculation
        const startTotalMinutes = startHours * 60 + startMinutes;
        let endTotalMinutes = endHours * 60 + endMinutes;
        
        // Handle case where end time is on the next day (e.g., 01:00 AM)
        if (endTotalMinutes < startTotalMinutes) {
          endTotalMinutes += 24 * 60; // Add 24 hours in minutes
        }
        
        // Calculate the difference in hours (rounded to 1 decimal place)
        const durationMinutes = endTotalMinutes - startTotalMinutes;
        hours = Math.round((durationMinutes / 60) * 10) / 10;
      }
    } catch (error) {
      console.log(`Error calculating hours:`, error);
      hours = 3; // Fallback if calculation fails
    }
    
    // Get hourly rate (use musician.payRate as fallback)
    const hourlyRate = musician.payRate || getDefaultRateForMusician(musicianId, musician.categoryId);
    
    // Calculate total fee based on hours and hourly rate - exact multiplication without rounding
    const totalFee = parseInt((hourlyRate * hours).toFixed(0));
    
    console.log(`Assigning musician ${musician.name} with hourly rate: $${hourlyRate}, hours: ${hours}, total fee: $${totalFee} (calculation: ${hourlyRate} × ${hours} = ${hourlyRate * hours})`);
    
    const assignmentData = {
      slotId,
      musicianId,
      status: "scheduled",
      actualFee: totalFee,
    };
    
    createAssignmentMutation.mutate(assignmentData);
  };
  
  // Get default rate for musician based on category if no specific rate is set
  const getDefaultRateForMusician = (musicianId: number, categoryId: number): number => {
    // Default rates by category
    const defaultRates: {[key: number]: number} = {
      1: 150, // Vocalist
      2: 125, // Guitarist 
      3: 125, // Keyboardist
      4: 135, // Drummer
      5: 125, // Bassist
      // Add more defaults as needed
    };
    
    return defaultRates[categoryId] || 100; // Fallback to 100 if no default for category
  };

  // Handle removing a musician
  const handleRemoveMusician = (assignmentId: number) => {
    deleteAssignmentMutation.mutate(assignmentId);
  };

  // Handle saving slot changes (times, notes)
  const handleSaveSlotChanges = () => {
    if (!slot) return;
    
    const updatedData = {
      startTime,
      endTime,
      description: notes,
    };
    
    slotMutation.mutate(updatedData);
  };

  // Get musician name
  const getMusicianName = (musicianId: number) => {
    const musician = musicians.find(m => m.id === musicianId);
    return musician ? musician.name : "Unknown Musician";
  };

  // Get musician's category
  const getMusicianCategory = (musicianId: number) => {
    const musician = musicians.find(m => m.id === musicianId);
    if (!musician || !musician.categoryId) return "Unknown Category";
    
    const category = categories.find(c => c.id === musician.categoryId);
    return category ? category.title : "Unknown Category";
  };

  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.title : "Unknown Category";
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex justify-between items-center mb-2">
        <div className="font-medium">
          {format(date, "MMM d, yyyy")} - {venueName}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <Tabs defaultValue="musicians">
        <TabsList className="w-full">
          <TabsTrigger value="musicians" className="flex-1">
            <User className="h-4 w-4 mr-2" /> Musicians
          </TabsTrigger>
          <TabsTrigger value="details" className="flex-1">
            <Calendar className="h-4 w-4 mr-2" /> Details
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="musicians" className="space-y-4">
          {/* Current Assignments */}
          {currentAssignments && currentAssignments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Assigned Musicians</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {currentAssignments.map((assignment: any) => (
                  <div key={assignment.id} className="flex items-center justify-between p-2 rounded bg-gray-50">
                    <div className="flex flex-col flex-grow">
                      <span className="font-medium">{getMusicianName(assignment.musicianId)}</span>
                      
                      {editingFeeId === assignment.id ? (
                        <div className="flex items-center mt-1">
                          <span className="text-xs font-medium mr-1">$</span>
                          <Input
                            type="number"
                            value={editingFeeValue}
                            onChange={(e) => setEditingFeeValue(e.target.value)}
                            className="h-6 text-xs w-16"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateAssignmentFeeMutation.mutate({
                                  id: assignment.id,
                                  actualFee: parseInt(editingFeeValue)
                                });
                              } else if (e.key === 'Escape') {
                                setEditingFeeId(null);
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1 ml-1"
                            onClick={() => {
                              updateAssignmentFeeMutation.mutate({
                                id: assignment.id,
                                actualFee: parseInt(editingFeeValue)
                              });
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1"
                            onClick={() => setEditingFeeId(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 cursor-pointer flex items-center" 
                            onClick={() => {
                              setEditingFeeId(assignment.id);
                              setEditingFeeValue(assignment.actualFee.toString());
                            }}>
                            <DollarSign className="h-3 w-3 mr-0.5" /> 
                            {assignment.actualFee} • {getMusicianCategory(assignment.musicianId)}
                            <Edit className="h-3 w-3 ml-1 opacity-50" />
                          </span>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle className="h-3 w-3 ml-1 text-yellow-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Custom fee overrides hourly rate</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemoveMusician(assignment.id)}
                    >
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {/* Confirm Button when musicians are assigned */}
              <Button 
                className="w-full mt-3" 
                variant="default"
                onClick={() => {
                  // Call the assignment handler and then close
                  onMusicianAssigned && onMusicianAssigned();
                  
                  // Visual feedback is now provided by the PlannerGrid component
                  
                  // Close the popover
                  onClose();
                }}
              >
                <Check className="h-4 w-4 mr-2" /> Confirm
              </Button>
              
              <Separator className="mt-3" />
            </div>
          )}
          
          {/* New Assignment */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Add Musician</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Musician Category</label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Musician</label>
                <Select value={selectedMusicianId} onValueChange={handleMusicianSelect}>
                  <SelectTrigger disabled={isLoadingAvailableMusicians}>
                    <SelectValue placeholder={isLoadingAvailableMusicians ? "Loading musicians..." : "Select musician"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingAvailableMusicians ? (
                      <div className="flex items-center justify-center p-2 text-sm text-gray-500">
                        <Clock className="h-3 w-3 mr-2 animate-spin" />
                        Loading available musicians...
                      </div>
                    ) : filteredMusicians.length > 0 ? (
                      filteredMusicians.map((musician: any) => (
                        <SelectItem key={musician.id} value={musician.id.toString()}>
                          {musician.name} (${musician.payRate})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500 space-y-1">
                        <p>No available musicians found</p>
                        <p className="text-xs italic">Musicians already booked or marked as unavailable for this date will not appear here</p>
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Start Time</label>
              <Input 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">End Time</label>
              <Input 
                type="time" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes</label>
            <Input 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this assignment"
            />
          </div>
          
          {slot && (
            <Button 
              onClick={handleSaveSlotChanges}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" /> Save Changes
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InlineMusicianSelect;