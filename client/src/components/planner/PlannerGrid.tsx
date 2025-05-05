import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { forcePlannerReload } from "@/lib/utils/forceRefresh";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import InlineMusicianSelect from "./InlineMusicianSelect";
import SimplifiedContractSender from "./SimplifiedContractSender";
import { Send, Save, FileText, Calendar, Info, CheckCircle2, RefreshCw, Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useVersionedQuery } from "@/hooks/use-versioned-query";
import { DataUpdateNotification } from "@/components/DataUpdateNotification";

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

  // Query to get planner slots using versioned query
  const {
    data: plannerSlots,
    isLoading: isSlotsLoading,
    forceRefresh: forceRefreshSlots
  } = useVersionedQuery<Slot[]>({
    entity: 'plannerSlots',
    endpoint: `/api/planner-slots`,
    params: { plannerId: planner?.id },
    enabled: !!planner?.id,
    transform: (data) => Array.isArray(data) ? data : []
  });

  // Query to get all planner assignments for this planner
  const {
    data: plannerAssignments,
    isLoading: isAssignmentsLoading,
    forceRefresh: forceRefreshAssignments
  } = useVersionedQuery<Assignment[]>({
    entity: 'plannerAssignments',
    endpoint: '/api/planner-assignments',
    params: { plannerId: planner?.id },
    enabled: !!plannerSlots && plannerSlots.length > 0,
    transform: (data) => {
      // This is a synchronous transform just to satisfy TypeScript
      // The actual data fetching is done in the API
      return Array.isArray(data) ? data : [];
    }
  });

  // Query to get musicians with version tracking
  const {
    data: musicians,
    isLoading: isMusiciansLoading,
    forceRefresh: forceRefreshMusicians
  } = useVersionedQuery<Musician[]>({
    entity: 'musicians',
    endpoint: '/api/musicians',
    transform: (data) => Array.isArray(data) ? data : [],
  });

  // Query to get musician availability data with version tracking
  const {
    data: availabilityData,
    isLoading: isAvailabilityLoading,
    forceRefresh: forceRefreshAvailability
  } = useVersionedQuery<any>({
    entity: 'availability',
    endpoint: `/api/availability?year=${year}&month=${month}`,
    transform: (data) => data || {},
    enabled: availabilityView && !!musicians && musicians.length > 0,
  });
  
  // Query to get musician pay rates for proper pricing calculations with version tracking
  const {
    data: payRates,
    isLoading: isPayRatesLoading,
    forceRefresh: forceRefreshPayRates
  } = useVersionedQuery<PayRate[]>({
    entity: 'musicianPayRates',
    endpoint: '/api/musician-pay-rates',
    transform: (rates) => {
      if (!Array.isArray(rates)) return [];
      
      // Debug: Log James Wilson's rates for Club Performance
      const jamesRates = rates.filter((r: PayRate) => r.musicianId === 7);
      const clubRates = rates.filter((r: PayRate) => r.eventCategoryId === 7);
      const jamesClubRates = rates.filter((r: PayRate) => 
        r.musicianId === 7 && r.eventCategoryId === 7
      );
      
      console.log("DEBUG - All pay rates count:", rates.length);
      console.log("DEBUG - James Wilson (ID 7) rates:", jamesRates);
      console.log("DEBUG - Club Performance (ID 7) rates:", clubRates);
      console.log("DEBUG - James Wilson Club Performance (ID 7) rates:", jamesClubRates);
      
      return rates;
    }
  });
  
  // Query to get event categories for proper pricing calculations with version tracking
  const {
    data: eventCategories,
    isLoading: isEventCategoriesLoading,
    forceRefresh: forceRefreshCategories
  } = useVersionedQuery<any[]>({
    entity: 'categories',
    endpoint: '/api/event-categories',
    transform: (data) => Array.isArray(data) ? data : []
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
  
  // Handle unfinalizing the planner to allow editing
  const handleUnfinalize = () => {
    if (!planner) return;
    
    // Show a loading toast
    toast({
      title: "Updating Planner",
      description: "Changing planner status to draft...",
    });
    
    // Generate a unique timestamp for cache busting
    const timestamp = new Date().getTime();
    
    // Make a copy of the current planner
    const updatedPlanner = {
      ...planner,
      status: 'draft',
      updatedAt: new Date().toISOString()
    };
    
    // Direct API call to ensure immediate status update
    apiRequest(`/api/planners/${planner.id}`, "PUT", updatedPlanner)
    .then(response => {
      console.log("Planner status updated to draft:", response);
      
      // Most aggressive cache clearing strategy possible:
      
      // 1. Clear entire cache for all queries
      queryClient.clear();
      
      // 2. Reset all queries to their initial state
      queryClient.resetQueries();
      
      // Show success message
      toast({
        title: "Planner Reopened",
        description: "You can now make changes to the planner. The status is now 'draft'.",
      });
      
      // Use our utility function to force a clean reload 
      // with guaranteed fresh data and correct context
      forceReloadWithCorrectContext();
    })
    .catch(error => {
      console.error("Failed to unfinalize planner:", error);
      toast({
        title: "Error",
        description: "Failed to reopen planner for editing",
        variant: "destructive",
      });
    });
  };

  // Query to get current version info - using standard React Query to avoid UpdateEntity type issue
  const {
    data: versionInfo,
    isLoading: isVersionsLoading
  } = useQuery({
    queryKey: ['/api/versions'],
    refetchInterval: 30000, // Check every 30 seconds
    select: (data) => data || {}
  });

  // Auto-save feature
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isAutoSaveEnabled && planner && planner.id) {
      intervalId = setInterval(() => {
        updatePlannerMutation.mutate({
          ...planner,
          updatedAt: new Date(),
          version: versionInfo?.monthly_planners || planner.version || 1
        });
      }, AUTO_SAVE_INTERVAL);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoSaveEnabled, planner, updatePlannerMutation, versionInfo]);

  // Wrapper function for our centralized utilities that adds user feedback
  const forceReloadWithCorrectContext = () => {
    // Show a warning toast to inform the user before reload
    toast({
      title: "Refreshing Data",
      description: "Reloading page to ensure you have the most up-to-date information...",
      variant: "warning"
    });
    
    // Small delay to let the toast display
    setTimeout(() => {
      // Make sure we have the planner context before reloading
      if (planner?.month && planner?.year) {
        // Clear all caches first
        queryClient.clear();
        
        // Then force a reload with the imported utility 
        forcePlannerReload(planner.month, planner.year);
      }
    }, 500);
  };

  // Handle slot creation/update via the inline musician select
  const handleSlotCreated = (slot: any) => {
    queryClient.invalidateQueries({ queryKey: ['/api/planner-slots', planner?.id] });
  };

  // Handle musician assignment - with versioned query refresh
  const handleMusicianAssigned = () => {
    // Force refresh the slots data
    forceRefreshSlots();
    console.log("Slots refreshed after musician assignment");
    
    // Force refresh the assignments data
    forceRefreshAssignments();
    
    // Success notification
    toast({
      title: "Success",
      description: "Musician assignments updated",
    });
  };

  // Data refreshing handled internally by React Query
  // refreshData function removed as part of UI streamlining

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
    eventCategoryId: number; // Field name in DB is eventCategoryId, not categoryId
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
    if (!plannerAssignments || !Array.isArray(plannerAssignments) || plannerAssignments.length === 0) return [];
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
    
    // TEMPORARY FIX: Hardcode to Club Performance (ID 7) per client request
    const eventCategoryId = 7; // Hardcoded to Club Performance
    
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
      const catRates = payRates.filter((rate: PayRate) => rate.eventCategoryId === eventCategoryId);
      console.log(`Found ${catRates.length} rates for category ${categoryName}`);
      
      // Look for an exact match on musician ID and category ID
      const matchingPayRate = payRates.find((rate: PayRate) => 
        rate.musicianId === musician.id && 
        rate.eventCategoryId === eventCategoryId
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
      {/* Real-time data updates notification */}
      <DataUpdateNotification />
      
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
          
          {/* Version information */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center space-x-2 text-xs text-gray-500 border-l pl-2 cursor-help">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>Monthly planner v{versionInfo?.monthly_planners || planner?.version || '-'}</span>
                  </div>
                  {planner?.updatedAt && (
                    <div className="flex items-center ml-2">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Updated: {format(new Date(planner.updatedAt), "MMM d, HH:mm:ss")}</span>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1">
                  <div className="font-bold">Data Versions Info:</div>
                  <div>Planner: v{planner?.version || '-'}</div>
                  <div>Last Auto-save: {lastSaved ? format(lastSaved, "HH:mm:ss") : 'None'}</div>
                  <hr className="my-1" />
                  <div>To manually refresh data, click the "Refresh Data" button.</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Real-time update indicator */}
          <div className="flex items-center mr-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries();
                toast({
                  title: "Data Refreshed",
                  description: "Planner data has been refreshed with the latest information"
                });
              }}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Data</span>
            </Button>
          </div>
          
          {/* Additional UI controls removed for streamlining */}
          
          {planner?.status === "finalized" ? (
            <Button 
              onClick={handleUnfinalize}
              variant="outline"
              className="gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              Edit Planner
            </Button>
          ) : (
            <Button 
              onClick={() => setShowFinalizeDialog(true)}
              variant="default"
              className="gap-1"
            >
              <Send className="h-4 w-4" />
              Finalize & Send
            </Button>
          )}
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
                                    // TEMPORARY FIX: Hardcode to Club Performance (ID 7) per client request
                                    const eventCategoryId = 7; // Hardcoded to Club Performance
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
                                      const clubRates = payRates.filter((rate: PayRate) => rate.eventCategoryId === 7);
                                      console.log(`Found ${clubRates.length} Club Performance rates`);
                                      
                                      // Look for exact match for Club Performance category
                                      const matchingPayRate = payRates.find((rate: PayRate) => 
                                        rate.musicianId === musician.id && 
                                        rate.eventCategoryId === eventCategoryId
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

      {/* Simplified Contract Sender Dialog */}
      {showFinalizeDialog && (
        <SimplifiedContractSender
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