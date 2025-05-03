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
    queryKey: ['/api/planner-assignments', planner?.id, plannerSlots ? plannerSlots.map((s: any) => s.id).join('-') : ''],
    queryFn: () => {
      if (!plannerSlots || plannerSlots.length === 0) {
        console.log("No planner slots available, skipping assignment fetch");
        return [];
      }
      
      // Use a cleaner approach to build the query with all slot IDs
      const slotIds = plannerSlots.map((slot: any) => slot.id);
      console.log("Fetching assignments for slots:", slotIds);
      
      // Build individual queries for each slot to avoid URL length issues
      const promises = slotIds.map((id: number) => 
        apiRequest(`/api/planner-assignments?slotId=${id}`)
      );
      
      // Combine all results from the individual requests
      return Promise.all(promises).then(results => {
        // Flatten the array of arrays
        const combined = results.flat();
        console.log("Combined assignments:", combined.length);
        return combined;
      });
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
  
  // Query to get musician pay rates for proper pricing calculations
  const {
    data: payRates,
    isLoading: isPayRatesLoading,
  } = useQuery({
    queryKey: ['/api/musician-pay-rates'],
    queryFn: () => apiRequest('/api/musician-pay-rates'),
  });
  
  // Query to get event categories for proper pricing calculations
  const {
    data: eventCategories,
    isLoading: isEventCategoriesLoading,
  } = useQuery({
    queryKey: ['/api/event-categories'],
    queryFn: () => apiRequest('/api/event-categories'),
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
    // First, make sure the slots are refreshed
    refetchSlots().then(updatedSlots => {
      // Now use the updated slots info to refresh assignments
      // Invalidate the query cache first
      queryClient.invalidateQueries({ 
        queryKey: ['/api/planner-assignments', planner?.id] 
      });
      
      // Then manually trigger refetches to ensure fresh data
      setTimeout(() => {
        console.log("Refreshing assignments after musician assignment");
        refetchAssignments().then(() => {
          toast({
            title: "Success",
            description: "Musician assignments updated in grid view",
          });
        });
      }, 500); // Longer delay to ensure backend processing completes
    });
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

  // Define some types to help with TypeScript
  interface Slot {
    id: number;
    venueId: number;
    date: string; // ISO string
    status?: string;
    duration?: number;
    eventCategoryId?: number;
    [key: string]: any;
  }
  
  interface Assignment {
    id: number;
    slotId: number;
    musicianId: number;
    actualFee?: number;
    [key: string]: any;
  }
  
  interface Musician {
    id: number;
    name: string;
    categoryId?: number;
    payRate?: number;
    [key: string]: any;
  }
  
  interface PayRate {
    musicianId: number;
    categoryId: number;
    hourlyRate: number;
    dayRate?: number;
    [key: string]: any;
  }
  
  // Get slot by date and venue
  const getSlotByDateAndVenue = (date: Date, venueId: number): Slot | null => {
    if (!plannerSlots) return null;
    
    return plannerSlots.find((slot: Slot) => {
      const slotDate = new Date(slot.date);
      return (
        slotDate.getDate() === date.getDate() &&
        slotDate.getMonth() === date.getMonth() &&
        slotDate.getFullYear() === date.getFullYear() &&
        slot.venueId === venueId
      );
    }) || null;
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
  const getAssignmentsForSlot = (slotId: number): Assignment[] => {
    if (!plannerAssignments || plannerAssignments.length === 0) return [];
    return plannerAssignments.filter((assignment: Assignment) => assignment.slotId === slotId);
  };

  // Get musician name by ID
  const getMusicianName = (musicianId: number): string => {
    if (!musicians || !Array.isArray(musicians)) return "Unknown Musician";
    const musician = musicians.find((m: Musician) => m.id === musicianId);
    return musician ? musician.name : "Unknown Musician";
  };

  // Get musician by ID
  const getMusician = (musicianId: number): Musician | null => {
    if (!musicians || !Array.isArray(musicians)) return null;
    return musicians.find((m: Musician) => m.id === musicianId) || null;
  };
  
  // Get musician's category name
  const getMusicianCategory = (musicianId: number): string => {
    const musician = getMusician(musicianId);
    if (!musician || !musician.categoryId) return "Unknown";
    
    // Find the category from the musicians's categoryId
    if (categories && Array.isArray(categories)) {
      const category = categories.find((c: any) => c.id === musician.categoryId);
      return category ? category.title : "Unknown";
    }
    
    return "Unknown";
  };

  // Calculate total amount for a slot
  const calculateSlotTotal = (slotId: number): number => {
    const assignments = getAssignmentsForSlot(slotId);
    if (!assignments || assignments.length === 0) return 0;
    
    return assignments.reduce((total: number, assignment: Assignment) => {
      // Use the same fee calculation logic for consistency
      const fee = calculateFeeForAssignment(assignment);
      return total + fee;
    }, 0);
  };
  
  // Get default rate for a category
  const getCategoryDefaultRate = (categoryId: number): number => {
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
  
  // Calculate fee for a single assignment (used in grid display)
  const calculateFeeForAssignment = (assignment: Assignment): number => {
    if (!assignment) return 0;
    
    // Use the assignment's actualFee if available (already calculated with proper formula)
    if (assignment.actualFee && assignment.actualFee > 0) {
      return assignment.actualFee;
    }
    
    // Get the musician
    const musician = getMusician(assignment.musicianId);
    if (!musician) return 150; // Default fallback
    
    // Get the slot to determine event details
    const slot = plannerSlots?.find((s: Slot) => s.id === assignment.slotId);
    if (!slot) return 150; // Default fallback
    
    // Calculate hours for the performance (default to 2 if not specified)
    const hours = slot.duration || 2;
    
    // TEMPORARY FIX: Hardcode to Club Performance (ID 3) per client request
    const eventCategoryId = 3; // Hardcoded to Club Performance
    
    // Get category name for logging/debugging
    const eventCategory = eventCategories?.find((cat: any) => cat.id === eventCategoryId);
    const categoryName = "Club Performance"; // Hardcoded name
    
    console.log(`⚠️ Calculating fee for Assignment ${assignment.id} - Musician ${musician.name} for event category ${categoryName} (${eventCategoryId})`);
    
    // Find the musician's pay rate for this specific event category from the pay rates table
    if (payRates && Array.isArray(payRates)) {
      // Debug all pay rates for this musician
      const muscianRates = payRates.filter((rate: PayRate) => rate.musicianId === musician.id);
      console.log(`Found ${muscianRates.length} rates for ${musician.name}`);
      
      // Debug all pay rates for this category
      const catRates = payRates.filter((rate: PayRate) => rate.categoryId === eventCategoryId);
      console.log(`Found ${catRates.length} rates for category ${categoryName}`);
      
      // Look for an exact match on musician ID and category ID
      const matchingPayRate = payRates.find((rate: PayRate) => 
        rate.musicianId === musician.id && 
        rate.categoryId === eventCategoryId
      );
      
      if (matchingPayRate) {
        console.log(`✅ Found specific hourly rate for ${musician.name} for ${categoryName}: $${matchingPayRate.hourlyRate}/hr × ${hours}hrs = $${matchingPayRate.hourlyRate * hours}`);
        return matchingPayRate.hourlyRate * hours;
      } else {
        console.log(`❌ No specific pay rate found for ${musician.name} with category ${categoryName} (${eventCategoryId})`);
      }
    }
    
    // If no specific category rate found, try the musician's default hourly rate
    if (musician.payRate && musician.payRate > 0) {
      console.log(`ℹ️ Using ${musician.name}'s default rate: $${musician.payRate}/hr × ${hours}hrs = $${musician.payRate * hours}`);
      return musician.payRate * hours;
    }
    
    // Fall back to instrument category default rate
    if (musician.categoryId) {
      const hourlyRate = getCategoryDefaultRate(musician.categoryId);
      console.log(`⚠️ Using ${getMusicianCategory(musician.id)} default rate: $${hourlyRate}/hr × ${hours}hrs = $${hourlyRate * hours}`);
      return hourlyRate * hours;
    }
    
    // Ultimate fallback - use standard industry minimum
    console.log(`❗ No rates found for ${musician.name}, using minimum rate: $150`);
    return 150;
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

  if (isSlotsLoading || isAssignmentsLoading || isMusiciansLoading || isPayRatesLoading || isEventCategoriesLoading) {
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
        <div className="overflow-auto">
          <div className="min-w-max">
            {/* Header Row with horizontal scrolling */}
            <div className="flex bg-gray-100 border-b sticky top-0 z-10">
              <div className="p-3 font-bold text-sm border-r sticky left-0 bg-gray-100 w-[120px] shrink-0">
                Date
              </div>
              <div className="flex">
                {venues.map((venue) => (
                  <div 
                    key={venue.id} 
                    className="p-3 font-bold text-sm border-r text-center w-[220px] shrink-0 whitespace-nowrap"
                  >
                    {venue.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Day Rows */}
            <div className="h-[calc(100vh-220px)] overflow-y-auto">
              {days.map((day) => (
                <div 
                  key={day.toISOString()} 
                  className={`flex border-b hover:bg-gray-50 ${
                    isWeekend(day) ? 'bg-gray-50' : ''
                  }`}
                >
                  <div className={`p-3 border-r font-medium text-sm sticky left-0 z-10 w-[120px] shrink-0 ${
                    isWeekend(day) ? 'bg-gray-50' : 'bg-white'
                  }`}>
                    {format(day, "EEE, MMM d")}
                  </div>
                  
                  <div className="flex">
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
                              className={`p-2 border-r cursor-pointer w-[220px] shrink-0 ${getSlotStatusClass(slot)} ${availabilityClass}`}
                            >
                              {assignments.length > 0 ? (
                                <div className="space-y-1">
                                  {slot && (
                                    <div className="text-xs font-semibold border-b pb-1 pt-0 mb-1 text-blue-700">
                                      Club Performance
                                      {slot.duration && <span className="float-right">{slot.duration}h</span>}
                                    </div>
                                  )}
                                  
                                  {assignments.map((assignment: Assignment) => {
                                    const musician = getMusician(assignment.musicianId);
                                    const isAvailable = availabilityView ? isMusicianAvailable(assignment.musicianId, day) : true;
                                    
                                    // Get hourly rate information for tooltip
                                    const slot = plannerSlots?.find((s: Slot) => s.id === assignment.slotId);
                                    // TEMPORARY FIX: Hardcode to Club Performance (ID 3) per client request
                                    const eventCategoryId = 3; // Hardcoded to Club Performance
                                    const hours = slot?.duration || 2;
                                    let hourlyRate = 0;
                                    let rateSource = "unknown";
                                    
                                    // Hardcoded name
                                    const categoryName = "Club Performance";
                                    
                                    if (musician && payRates && Array.isArray(payRates)) {
                                      // Find all rates for this musician to debug
                                      const allRatesForMusician = payRates.filter((rate: PayRate) => rate.musicianId === musician.id);
                                      console.log(`Found ${allRatesForMusician.length} pay rates for ${musician.name}:`);
                                      
                                      // Debug club performance rates
                                      const clubRates = payRates.filter((rate: PayRate) => rate.categoryId === 3);
                                      console.log(`Found ${clubRates.length} Club Performance rates`);
                                      
                                      // Look for exact match for Club Performance category
                                      const matchingPayRate = payRates.find((rate: PayRate) => 
                                        rate.musicianId === musician.id && 
                                        rate.categoryId === eventCategoryId
                                      );
                                      
                                      if (matchingPayRate) {
                                        hourlyRate = matchingPayRate.hourlyRate;
                                        rateSource = `Club rate`;
                                        console.log(`✓ Found Club rate: $${hourlyRate}/hr for ${musician.name}`);
                                      } else if (musician.payRate) {
                                        hourlyRate = musician.payRate;
                                        rateSource = "default rate";
                                        console.log(`⚠ No club rate found. Using default: $${hourlyRate}/hr`);
                                      } else if (musician.categoryId) {
                                        hourlyRate = getCategoryDefaultRate(musician.categoryId);
                                        rateSource = getMusicianCategory(musician.id) + " default";
                                        console.log(`⚠ No rates found. Using ${getMusicianCategory(musician.id)} default: $${hourlyRate}/hr`);
                                      }
                                    }
                                    
                                    return (
                                      <div key={assignment.id} className="flex justify-between text-sm">
                                        <div className="flex flex-col">
                                          <span className={`font-medium ${!isAvailable ? 'text-red-500' : ''}`}>
                                            {getMusicianName(assignment.musicianId)}
                                            {!isAvailable && availabilityView && (
                                              <span className="text-xs text-red-500 ml-1">
                                                (unavailable)
                                              </span>
                                            )}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {getMusicianCategory(assignment.musicianId)}
                                          </span>
                                        </div>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="text-gray-600">
                                                {formatCurrency(calculateFeeForAssignment(assignment))}
                                                <span className="text-xs block text-right">
                                                  (${hourlyRate}/hr)
                                                </span>
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">
                                              <div className="text-xs">
                                                <p>Hourly rate: ${hourlyRate} ({rateSource})</p>
                                                <p>Hours: {hours}</p>
                                                <p>Total: ${hourlyRate * hours}</p>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
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
                </div>
              ))}
            </div>
          </div>
        </div>
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