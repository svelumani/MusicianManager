import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import InlineMusicianSelect from "./InlineMusicianSelect";
import FinalizeMonthlyPlanner from "./FinalizeMonthlyPlanner";
import { Send, Save, FileText, Calendar, Info, CheckCircle2, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PlannerGridProps {
  planner: any; // MonthlyPlanner
  venues: any[]; // Venue[]
  categories: any[]; // Category[]
  selectedMonth: string;
}

const STATUS_COLORS = {
  open: "bg-white",
  draft: "bg-gray-100",
  "contract-sent": "bg-blue-100",
  "contract-signed": "bg-green-100",
  "needs-clarification": "bg-yellow-100",
  "overseas-performer": "bg-purple-100",
  "finalized": "bg-green-50"
};

const AUTO_SAVE_INTERVAL = 60000; // 1 minute

const PlannerGrid = ({ planner, venues, categories, selectedMonth }: PlannerGridProps) => {
  const { toast } = useToast();
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ date: Date; venueId: number } | null>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [availabilityView, setAvailabilityView] = useState(false);

  // Parse the selected month
  const [year, month] = selectedMonth.split("-").map(Number);
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Query to get planner slots
  const {
    data: plannerSlots,
    isLoading: isSlotsLoading,
    refetch: refetchSlots
  } = useQuery({
    queryKey: ['/api/planner-slots', planner?.id],
    queryFn: () => apiRequest(`/api/planner-slots?plannerId=${planner.id}`),
    enabled: !!planner?.id,
  });

  // Query to get planner assignments
  const {
    data: plannerAssignments,
    isLoading: isAssignmentsLoading,
    refetch: refetchAssignments
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

  // Query to get musician availability data
  const {
    data: availabilityData,
    isLoading: isAvailabilityLoading,
  } = useQuery({
    queryKey: ['/api/availability', year, month],
    queryFn: () => apiRequest(`/api/availability?year=${year}&month=${month}`),
    enabled: availabilityView && !!musicians && musicians.length > 0,
  });

  // Update planner status mutation
  const updatePlannerMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest(`/api/planners/${planner.id}`, "PUT", data),
    onSuccess: () => {
      setLastSaved(new Date());
      toast({
        title: "Success",
        description: "Planner saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save planner",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Handle manual save
  const handleManualSave = () => {
    if (!planner) return;
    updatePlannerMutation.mutate({
      ...planner,
      updatedAt: new Date(),
    });
  };

  // Auto-save feature
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isAutoSaveEnabled && planner && planner.id) {
      intervalId = setInterval(() => {
        updatePlannerMutation.mutate({
          ...planner,
          updatedAt: new Date(),
        });
      }, AUTO_SAVE_INTERVAL);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoSaveEnabled, planner, updatePlannerMutation]);

  // Handle slot creation/update via the inline musician select
  const handleSlotCreated = (slot: any) => {
    queryClient.invalidateQueries({ queryKey: ['/api/planner-slots', planner?.id] });
  };

  // Handle musician assignment
  const handleMusicianAssigned = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/planner-assignments'] });
  };

  // Refresh data
  const refreshData = () => {
    refetchSlots();
    refetchAssignments();
    toast({
      title: "Refreshed",
      description: "Planner data refreshed",
    });
  };

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

  // Check if musician is available on a given date
  const isMusicianAvailable = useCallback((musicianId: number, date: Date) => {
    if (!availabilityData) return true;
    
    const musicianAvailability = availabilityData.find(
      (a: any) => a.musicianId === musicianId
    );
    
    if (!musicianAvailability) return true;
    
    // Check if the date is in the available dates
    const availableDates = musicianAvailability.dates || [];
    return availableDates.some((d: string) => {
      const availableDate = new Date(d);
      return (
        availableDate.getDate() === date.getDate() &&
        availableDate.getMonth() === date.getMonth() &&
        availableDate.getFullYear() === date.getFullYear()
      );
    });
  }, [availabilityData]);

  // Determine cell background based on availability
  const getCellAvailabilityClass = (date: Date, assignments: any[]) => {
    if (!availabilityView || assignments.length === 0) return "";
    
    // Check if any assigned musician is unavailable
    const hasUnavailableMusician = assignments.some(
      (assignment) => !isMusicianAvailable(assignment.musicianId, date)
    );
    
    return hasUnavailableMusician ? "bg-red-50" : "bg-green-50";
  };

  if (isSlotsLoading || isAssignmentsLoading || isMusiciansLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  // Format month name for the planner title
  const monthName = format(new Date(year, month - 1), "MMMM yyyy");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {planner?.name || `${monthName} Planner`}
        </h2>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 mr-4">
            <Switch
              id="auto-save"
              checked={isAutoSaveEnabled}
              onCheckedChange={setIsAutoSaveEnabled}
            />
            <Label htmlFor="auto-save" className="cursor-pointer">Auto-save</Label>
            {lastSaved && (
              <span className="text-xs text-gray-500">
                Last saved: {format(lastSaved, "HH:mm:ss")}
              </span>
            )}
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={refreshData}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAvailabilityView(!availabilityView)}
                  className={availabilityView ? "bg-blue-50" : ""}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{availabilityView ? "Hide" : "Show"} availability</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button 
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            className="gap-1"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
          
          <Button 
            onClick={() => setShowFinalizeDialog(true)}
            disabled={planner?.status === "finalized"}
            variant="default"
            className="gap-1"
          >
            <Send className="h-4 w-4" />
            Finalize & Send
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <ScrollArea className="h-[calc(100vh-220px)] w-full">
          <div className="min-w-[1200px]">
            {/* Header Row */}
            <div className="grid grid-cols-[120px_repeat(auto-fill,minmax(220px,1fr))] bg-gray-100 border-b sticky top-0 z-10">
              <div className="p-3 font-bold text-sm border-r sticky left-0 bg-gray-100">Date</div>
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
                className={`grid grid-cols-[120px_repeat(auto-fill,minmax(220px,1fr))] border-b hover:bg-gray-50 ${
                  isWeekend(day) ? 'bg-gray-50' : ''
                }`}
              >
                <div className={`p-3 border-r font-medium text-sm sticky left-0 bg-white z-10 ${
                  isWeekend(day) ? 'bg-gray-50' : ''
                }`}>
                  {format(day, "EEE, MMM d")}
                </div>
                
                {venues.map((venue) => {
                  const cellId = `${day.toISOString()}-${venue.id}`;
                  const slot = getSlotByDateAndVenue(day, venue.id);
                  const assignments = slot ? getAssignmentsForSlot(slot.id) : [];
                  const totalAmount = slot ? calculateSlotTotal(slot.id) : 0;
                  const availabilityClass = availabilityView ? getCellAvailabilityClass(day, assignments) : "";
                  
                  return (
                    <Popover key={cellId} open={activePopover === cellId} onOpenChange={(open) => {
                      if (!open) setActivePopover(null);
                    }}>
                      <PopoverTrigger asChild>
                        <div 
                          onClick={() => handleCellClick(day, venue.id)}
                          className={`p-2 border-r cursor-pointer ${getSlotStatusClass(slot)} ${availabilityClass}`}
                        >
                          {assignments.length > 0 ? (
                            <div className="space-y-1">
                              {assignments.map((assignment: any) => {
                                const musician = getMusician(assignment.musicianId);
                                const isAvailable = availabilityView ? isMusicianAvailable(assignment.musicianId, day) : true;
                                
                                return (
                                  <div key={assignment.id} className="flex justify-between text-sm">
                                    <span className={`font-medium ${!isAvailable ? 'text-red-500' : ''}`}>
                                      {getMusicianName(assignment.musicianId)}
                                      {!isAvailable && availabilityView && (
                                        <span className="text-xs text-red-500 ml-1">
                                          (unavailable)
                                        </span>
                                      )}
                                    </span>
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
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0 shadow-lg">
                        {selectedCell && activePopover === cellId && (
                          <InlineMusicianSelect
                            plannerId={planner.id}
                            date={day}
                            venueId={venue.id}
                            venueName={venue.name}
                            slot={slot}
                            musicians={musicians || []}
                            categories={categories || []}
                            onClose={() => setActivePopover(null)}
                            onCreated={handleSlotCreated}
                            onMusicianAssigned={handleMusicianAssigned}
                          />
                        )}
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-100 border"></div>
            <span>Draft</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-100 border"></div>
            <span>Contract Sent</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-100 border"></div>
            <span>Contract Signed</span>
          </div>
          {availabilityView && (
            <>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-50 border"></div>
                <span>Unavailable Musician</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-50 border"></div>
                <span>All Available</span>
              </div>
            </>
          )}
        </div>
        <div>
          {planner?.status === "draft" ? (
            <Badge variant="outline" className="bg-gray-100">Draft</Badge>
          ) : planner?.status === "finalized" ? (
            <Badge variant="outline" className="bg-green-100">Finalized</Badge>
          ) : (
            <Badge variant="outline">{planner?.status || "Unknown"}</Badge>
          )}
        </div>
      </div>

      {/* Finalize Monthly Planner Dialog */}
      {showFinalizeDialog && (
        <FinalizeMonthlyPlanner
          plannerId={planner.id}
          plannerName={planner.name || monthName}
          plannerMonth={monthName}
          open={showFinalizeDialog}
          onClose={() => setShowFinalizeDialog(false)}
        />
      )}
    </div>
  );
};

export default PlannerGrid;