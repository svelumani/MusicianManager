import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { X, Check, ChevronDown, Calendar } from "lucide-react";
import { format } from "date-fns";

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

  // Create or get slot mutation
  const slotMutation = useMutation({
    mutationFn: (data: any) => {
      if (slot) {
        return Promise.resolve(slot); // Slot already exists
      } else {
        return apiRequest("/api/planner-slots", "POST", data);
      }
    },
    onSuccess: (data) => {
      if (onCreated) onCreated(data);
      
      // If a musician is selected, proceed to assign them
      if (selectedMusicianId && parseInt(selectedMusicianId) > 0) {
        assignMusicianToSlot(data.id, parseInt(selectedMusicianId));
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create slot",
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
      
      // Close the popover
      onClose();
      
      // Refresh assignments
      queryClient.invalidateQueries({ queryKey: ['/api/planner-assignments'] });
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

  // Filter musicians by category
  const filteredMusicians = musicians.filter(
    (musician) => musician.categoryId === parseInt(categoryId)
  );

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
        startTime: "19:00",
        endTime: "22:00",
        status: "draft", // Automatically set to draft
        description: "",
        fee: null
      };
      
      slotMutation.mutate(slotData);
    }
  };

  // Assign musician to slot
  const assignMusicianToSlot = (slotId: number, musicianId: number) => {
    const musician = musicians.find(m => m.id === musicianId);
    if (!musician) return;
    
    const assignmentData = {
      slotId,
      musicianId,
      status: "scheduled",
      actualFee: musician.payRate || 0,
    };
    
    createAssignmentMutation.mutate(assignmentData);
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex justify-between items-center mb-2">
        <div className="font-medium">
          {format(date, "MMM d")} - {venueName}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
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
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Musician</label>
        <Select value={selectedMusicianId} onValueChange={handleMusicianSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select musician" />
          </SelectTrigger>
          <SelectContent>
            {filteredMusicians.map((musician) => (
              <SelectItem key={musician.id} value={musician.id.toString()}>
                {musician.name} (${musician.payRate})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default InlineMusicianSelect;