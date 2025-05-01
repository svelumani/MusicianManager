import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isEqual } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MonthlyPlanner, Venue, Category, PlannerSlot, PlannerAssignment, Musician } from "@/types";
import InlineMusicianSelect from "./InlineMusicianSelect";
import FinalizeMonthlyPlanner from "./FinalizeMonthlyPlanner";
import { Calendar, Send } from "lucide-react";

interface PlannerGridProps {
  planner: any; // MonthlyPlanner
  venues: any[]; // Venue[]
  categories: any[]; // Category[]
  selectedMonth: string;
}

const STATUS_COLORS = {
  draft: "bg-gray-100",
  "contract-sent": "bg-blue-100",
  "contract-signed": "bg-green-100",
  "needs-clarification": "bg-yellow-100",
  "overseas-performer": "bg-purple-100",
  "finalized": "bg-green-50"
};

const PlannerGrid = ({ planner, venues, categories, selectedMonth }: PlannerGridProps) => {
  const { toast } = useToast();
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ date: Date; venueId: number } | null>(null);

  // Parse the selected month
  const [year, month] = selectedMonth.split("-").map(Number);
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Query to get planner slots
  const {
    data: plannerSlots,
    isLoading: isSlotsLoading,
  } = useQuery({
    queryKey: ['/api/planner-slots', planner?.id],
    queryFn: () => apiRequest(`/api/planner-slots?plannerId=${planner.id}`),
    enabled: !!planner?.id,
  });

  // Query to get planner assignments
  const {
    data: plannerAssignments,
    isLoading: isAssignmentsLoading,
  } = useQuery({
    queryKey: ['/api/planner-assignments'],
    queryFn: () => {
      if (!plannerSlots || plannerSlots.length === 0) return [];
      const slotIds = plannerSlots.map((slot: any) => slot.id);
      const query = slotIds.map((id: number) => `slotId=${id}`).join('&');
      return apiRequest(`/api/planner-assignments?${query}`);
    },
    enabled: !!plannerSlots && plannerSlots.length > 0,
  });

  // Query to get musicians with proper typing
  const {
    data: musicians,
    isLoading: isMusiciansLoading,
  } = useQuery<any[]>({
    queryKey: ['/api/musicians'],
    select: (data) => Array.isArray(data) ? data : [],
  });

  // Create a new planner slot
  const createSlotMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/planner-slots", "POST", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Slot created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/planner-slots', planner?.id] });
      setShowAssignDialog(true);
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

  // Get slot by date and venue
  const getSlotByDateAndVenue = (date: Date, venueId: number) => {
    if (!plannerSlots) return null;
    
    return plannerSlots.find((slot: any) => {
      const slotDate = new Date(slot.date);
      return (
        slotDate.getDate() === date.getDate() &&
        slotDate.getMonth() === date.getMonth() &&
        slotDate.getFullYear() === date.getFullYear() &&
        slot.venueId === venueId
      );
    });
  };

  // Get assignments for a slot
  const getAssignmentsForSlot = (slotId: number) => {
    if (!plannerAssignments || plannerAssignments.length === 0) return [];
    return plannerAssignments.filter((assignment: any) => assignment.slotId === slotId);
  };

  // Get musician name by ID
  const getMusicianName = (musicianId: number) => {
    if (!musicians || !Array.isArray(musicians)) return "Unknown Musician";
    const musician = musicians.find((m: any) => m.id === musicianId);
    return musician ? musician.name : "Unknown Musician";
  };

  // Get musician by ID
  const getMusician = (musicianId: number) => {
    if (!musicians || !Array.isArray(musicians)) return null;
    return musicians.find((m: any) => m.id === musicianId);
  };

  // Handle cell click to show the inline musician select
  const handleCellClick = (date: Date, venueId: number) => {
    const cellId = `${date.toISOString()}-${venueId}`;
    
    // If already open, close it
    if (activePopover === cellId) {
      setActivePopover(null);
      return;
    }
    
    // Open this popover and close any others
    setActivePopover(cellId);
    setSelectedCell({ date, venueId });
  };

  // Calculate total amount for a slot
  const calculateSlotTotal = (slotId: number) => {
    const assignments = getAssignmentsForSlot(slotId);
    if (!assignments || assignments.length === 0) return 0;
    
    return assignments.reduce((total: number, assignment: any) => {
      const musician = getMusician(assignment.musicianId);
      return total + (assignment.actualFee || (musician ? musician.payRate : 0));
    }, 0);
  };

  // Format amount as currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Get slot status className
  const getSlotStatusClass = (slot: any) => {
    if (!slot) return "";
    return STATUS_COLORS[slot.status as keyof typeof STATUS_COLORS] || "bg-white";
  };

  if (isSlotsLoading || isAssignmentsLoading || isMusiciansLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <ScrollArea className="h-[calc(100vh-220px)] w-full">
        <div className="min-w-[1200px]">
          {/* Header Row */}
          <div className="grid grid-cols-[120px_repeat(auto-fill,minmax(220px,1fr))] bg-gray-100 border-b">
            <div className="p-3 font-bold text-sm border-r">Date</div>
            {venues.map((venue) => (
              <div key={venue.id} className="p-3 font-bold text-sm border-r text-center">
                {venue.name}
              </div>
            ))}
          </div>

          {/* Day Rows */}
          {days.map((day) => (
            <div 
              key={day.toISOString()} 
              className="grid grid-cols-[120px_repeat(auto-fill,minmax(220px,1fr))] border-b hover:bg-gray-50"
            >
              <div className="p-3 border-r font-medium text-sm">
                {format(day, "MMM d EEEE")}
              </div>
              
              {venues.map((venue) => {
                const slot = getSlotByDateAndVenue(day, venue.id);
                const assignments = slot ? getAssignmentsForSlot(slot.id) : [];
                const totalAmount = slot ? calculateSlotTotal(slot.id) : 0;
                
                return (
                  <div 
                    key={`${day.toISOString()}-${venue.id}`}
                    onClick={() => handleCellClick(day, venue.id)}
                    className={`p-2 border-r cursor-pointer ${getSlotStatusClass(slot)}`}
                  >
                    {assignments.length > 0 ? (
                      <div className="space-y-1">
                        {assignments.map((assignment: any) => {
                          const musician = getMusician(assignment.musicianId);
                          return (
                            <div key={assignment.id} className="flex justify-between text-sm">
                              <span className="font-medium">{getMusicianName(assignment.musicianId)}</span>
                              <span className="text-gray-600">
                                {formatCurrency(assignment.actualFee || (musician ? musician.payRate : 0))}
                              </span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between border-t pt-1 text-sm">
                          <span className="font-bold">Total</span>
                          <span className="font-bold">{formatCurrency(totalAmount)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-10 flex items-center justify-center text-gray-400 text-sm">
                        Click to assign
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>

      {showAssignDialog && selectedSlot && (
        <AssignMusicianDialog
          plannerId={planner.id}
          date={selectedSlot.date}
          venueId={selectedSlot.venueId}
          onClose={() => setShowAssignDialog(false)}
          slot={getSlotByDateAndVenue(selectedSlot.date, selectedSlot.venueId)}
          musicians={musicians || []}
          categories={categories || []}
          venueName={venues.find(v => v.id === selectedSlot.venueId)?.name || ""}
        />
      )}
    </div>
  );
};

export default PlannerGrid;