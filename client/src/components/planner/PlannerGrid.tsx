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
import { FileText, Calendar, Info, CheckCircle2, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PlannerGridProps {
  plannerId: number;
  month: number;
  year: number;
  onPrepareContracts?: () => void;
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

const PlannerGrid = ({ plannerId, month, year, onPrepareContracts }: PlannerGridProps) => {
  const { toast } = useToast();
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ date: Date; venueId: number } | null>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [availabilityView, setAvailabilityView] = useState(false);

  // Get planner data
  const {
    data: planner,
    isLoading: isPlannerLoading,
  } = useQuery({
    queryKey: ['/api/planners', plannerId],
    queryFn: () => apiRequest(`/api/planners/${plannerId}`),
    enabled: !!plannerId,
  });

  // Get venues data
  const {
    data: venues,
    isLoading: isVenuesLoading,
  } = useQuery<any[]>({
    queryKey: ['/api/venues'],
    select: (data) => Array.isArray(data) ? data : [],
  });

  // Get categories data
  const {
    data: categories,
    isLoading: isCategoriesLoading,
  } = useQuery<any[]>({
    queryKey: ['/api/categories'],
    select: (data) => Array.isArray(data) ? data : [],
  });

  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Query to get planner slots
  const {
    data: plannerSlots,
    isLoading: isSlotsLoading,
    refetch: refetchSlots
  } = useQuery({
    queryKey: ['/api/planner-slots', plannerId],
    queryFn: () => apiRequest(`/api/planner-slots?plannerId=${plannerId}`),
    enabled: !!plannerId,
  });

  // Query to get all planner assignments for the current planner in a single request
  const {
    data: plannerAssignments,
    isLoading: isAssignmentsLoading,
    refetch: refetchAssignments
  } = useQuery({
    queryKey: ['plannerAssignments', plannerId],
    queryFn: async () => {
      if (!plannerId) {
        console.log("No planner ID available, skipping assignment fetch");
        return [];
      }
      
      try {
        // Fetch all assignments for this planner in a single request
        console.log(`Fetching all assignments for planner ID: ${plannerId}`);
        const assignments = await apiRequest(`/api/planner-assignments/by-planner/${plannerId}`);
        console.log(`Retrieved ${assignments?.length || 0} assignments for planner`);
        return assignments || [];
      } catch (error) {
        console.error("Error fetching planner assignments:", error);
        return [];
      }
    },
    enabled: !!plannerId,
    // Cache for 30 seconds to reduce unnecessary refetches
    staleTime: 30000
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
    queryKey: ['/api/direct/musician-pay-rates'],
    queryFn: () => apiRequest('/api/direct/musician-pay-rates'),
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
      apiRequest(`/api/planners/${plannerId}`, "PUT", data),
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
    
    if (isAutoSaveEnabled && planner && plannerId) {
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
  }, [isAutoSaveEnabled, planner, updatePlannerMutation, plannerId]);

  // Handle slot creation/update via the inline musician select
  const handleSlotCreated = (slot: any) => {
    queryClient.invalidateQueries({ queryKey: ['/api/planner-slots', plannerId] });
  };

  // Handle musician assignment - simplified with direct invalidation
  const handleMusicianAssigned = () => {
    // First, make sure the slots are refreshed
    refetchSlots().then(() => {
      console.log("Slots refreshed after musician assignment");
      
      // Now invalidate the assignments data to trigger a refetch
      // Use the simplified key for reliable invalidation
      queryClient.invalidateQueries({ 
        queryKey: ['plannerAssignments', plannerId] 
      });
      
      // Directly trigger a refetch for immediate feedback
      refetchAssignments().then(() => {
        // Success notification
        toast({
          title: "Success",
          description: "Musician assignments updated",
        });
      });
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
    if (!musician) return 0; // Default fallback
    
    // Get the slot to determine event details
    const slot = plannerSlots?.find((s: Slot) => s.id === assignment.slotId);
    if (!slot) return 0; // Default fallback
    
    // Calculate hours based on start and end times
    let hours = 2; // Default fallback
    if (slot.startTime && slot.endTime) {
      try {
        // Parse the time strings (format: "HH:MM" like "19:00")
        const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
        const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
        
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
      } catch (error) {
        console.log(`Error calculating hours for slot ${slot.id}:`, error);
        hours = 2; // Fallback if calculation fails
      }
    } else if (slot.duration) {
      // Use duration if explicitly set
      hours = slot.duration;
    }
    
    // TEMPORARY FIX: Hardcode to Club Performance (ID 7) per client request
    const eventCategoryId = 7; // Hardcoded to Club Performance
    
    // Get the hourly rate - this is a fixed negotiated value
    let hourlyRate = 50; // Default fallback
    
    if (payRates && Array.isArray(payRates)) {
      // Look for exact match for this musician and category
      const matchingPayRate = payRates.find((rate: PayRate) => 
        rate.musicianId === musician.id && 
        rate.eventCategoryId === eventCategoryId
      );
      
      if (matchingPayRate) {
        // Use the hourly rate from pay rates - this is a fixed negotiated value
        hourlyRate = matchingPayRate.hourlyRate;
      } else if (musician.payRate) {
        // Fallback to musician default rate if available
        hourlyRate = musician.payRate;
      } else if (musician.categoryId) {
        // Use category default rate if musician has a category
        hourlyRate = getCategoryDefaultRate(musician.categoryId);
      }
    }
    
    // Calculate total fee based on the fixed hourly rate and the hours
    return hourlyRate * hours;
  };
  
  // Format currency for display 
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  // Check if musician is available on a specific date
  const isMusicianAvailable = useCallback((musicianId: number, date: Date) => {
    if (!availabilityData || !availabilityData.musicians) return true; // Default to available if no data
    
    const musicianAvailability = availabilityData.musicians[musicianId];
    if (!musicianAvailability) return true; // Default to available if no data for this musician
    
    const dateStr = format(date, "yyyy-MM-dd");
    return !musicianAvailability.unavailableDates.includes(dateStr);
  }, [availabilityData]);

  // Get CSS class for cell based on slot status
  const getSlotStatusClass = (slot: Slot | null): string => {
    if (!slot) return STATUS_COLORS.open;
    
    // Use contract status if available (for colored indicators)
    if (slot.contractStatus) {
      switch (slot.contractStatus) {
        case "sent":
          return STATUS_COLORS["contract-sent"];
        case "signed":
          return STATUS_COLORS["contract-signed"];
        case "needs-clarification":
          return STATUS_COLORS["needs-clarification"];
        default:
          break;
      }
    }
    
    // Otherwise use the slot status
    return slot.status && STATUS_COLORS[slot.status as keyof typeof STATUS_COLORS]
      ? STATUS_COLORS[slot.status as keyof typeof STATUS_COLORS]
      : STATUS_COLORS.open;
  };

  // Get class for cell based on musician availability
  const getCellAvailabilityClass = (date: Date, assignments: any[]) => {
    if (!availabilityView) return "";
    if (assignments.length === 0) return "";
    
    // Check if any musician is unavailable
    const hasUnavailableMusician = assignments.some(assignment => 
      !isMusicianAvailable(assignment.musicianId, date)
    );
    
    if (hasUnavailableMusician) {
      return "bg-red-50"; // Some musicians are unavailable
    } else {
      return "bg-green-50"; // All musicians are available
    }
  };

  // Get venue name by ID
  const getVenueName = (venueId: number): string => {
    if (!venues || !Array.isArray(venues)) return "Unknown Venue";
    const venue = venues.find((v: any) => v.id === venueId);
    return venue ? venue.name : "Unknown Venue";
  };

  // Handle the Prepare Contracts button click
  const handlePrepareContracts = () => {
    if (onPrepareContracts) {
      onPrepareContracts();
    }
  };

  // Check if slots and musicians are still loading
  if (isPlannerLoading || isVenuesLoading || isCategoriesLoading || isSlotsLoading || isMusiciansLoading || isAssignmentsLoading || isPayRatesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (!planner) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <h2 className="text-red-800 font-bold text-lg mb-2">Error Loading Planner</h2>
        <p className="text-red-700">Unable to load planner data. Please try again later.</p>
      </div>
    );
  }

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
          
          <Button
            onClick={handlePrepareContracts}
            variant="default"
            className="gap-1"
          >
            <FileText className="h-4 w-4" />
            Prepare Contracts
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
                {venues && venues.length > 0 ? venues.map((venue: any) => (
                  <div 
                    key={venue.id} 
                    className="p-3 font-bold text-sm border-r text-center w-[220px] shrink-0 whitespace-nowrap"
                  >
                    {venue.name}
                  </div>
                )) : null}
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
                    {venues && venues.length > 0 ? venues.map((venue: any) => {
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
                                      {slot.startTime && slot.endTime && (
                                        <span className="ml-1">
                                          ({slot.startTime.substring(0, 5)}-{slot.endTime.substring(0, 5)})
                                        </span>
                                      )}
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
                                    
                                    // Calculate hours based on start and end times
                                    let hours = 2; // Default fallback
                                    if (slot?.startTime && slot?.endTime) {
                                      try {
                                        // Parse the time strings (format: "HH:MM" like "19:00")
                                        const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
                                        const [endHours, endMinutes] = slot.endTime.split(':').map(Number);
                                        
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
                                      } catch (error) {
                                        console.log(`Error calculating hours for slot ${slot.id}:`, error);
                                        hours = 2; // Fallback if calculation fails
                                      }
                                    } else if (slot?.duration) {
                                      // Use duration if explicitly set
                                      hours = slot.duration;
                                    }
                                    
                                    // Get the hourly rate from musician's pay rates or default rate
                                    let hourlyRate = 0;
                                    let rateSource = "default rate";
                                    let totalFee = 0;
                                    
                                    // First try to get the rate from musician pay rates for this category
                                    if (musician && payRates && Array.isArray(payRates)) {
                                      // Look for exact match for Club Performance category (ID 7)
                                      const matchingPayRate = payRates.find((rate: PayRate) => 
                                        rate.musicianId === musician.id && 
                                        rate.eventCategoryId === 7 // Club Performance
                                      );
                                      
                                      if (matchingPayRate) {
                                        hourlyRate = matchingPayRate.hourlyRate;
                                        rateSource = "club rate";
                                      } else if (musician.payRate) {
                                        hourlyRate = musician.payRate;
                                        rateSource = "musician default";
                                      } else {
                                        hourlyRate = 50; // absolute fallback
                                        rateSource = "system default";
                                      }
                                    } else {
                                      hourlyRate = 50; // fallback if no rates found
                                      rateSource = "system default";
                                    }
                                    
                                    // Calculate total fee based on hourly rate
                                    totalFee = hourlyRate * hours;
                                    
                                    // If an actual fee has been manually set, we'll display that total
                                    // but we'll still show the original hourly rate for reference
                                    let actualFeeExists = assignment.actualFee && assignment.actualFee > 0;
                                    let displayFee = actualFeeExists ? assignment.actualFee : totalFee;
                                    
                                    // Hardcoded name
                                    const categoryName = "Club Performance";
                                    
                                    // Debug log to inspect values
                                    console.log(`Assignment ${assignment.id} for musician ${assignment.musicianId}: actualFee=${assignment.actualFee}, hours=${hours}, hourlyRate=${hourlyRate}`);
                                    
                                    // Additional debug info
                                    if (musician && payRates && Array.isArray(payRates)) {
                                      // Find all rates for this musician to debug
                                      const allRatesForMusician = payRates.filter((rate: PayRate) => rate.musicianId === musician.id);
                                      console.log(`Found ${allRatesForMusician.length} pay rates for musician ${musician.id}`);
                                      
                                      // Debug club performance rates
                                      const clubRates = payRates.filter((rate: PayRate) => rate.eventCategoryId === 7);
                                      console.log(`Found ${clubRates.length} pay rates for Club Performance (ID 7)`);
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
                                                  (${Math.round(hourlyRate)}/hr)
                                                </span>
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">
                                              <div className="text-xs">
                                                {assignment.actualFee && assignment.actualFee > 0 ? (
                                                  <>
                                                    <p>Default hourly rate: ${Math.round(hourlyRate)}/hr ({rateSource})</p>
                                                    <p>Negotiated fee: ${assignment.actualFee}</p>
                                                    <p>Hours: {hours}</p>
                                                    <p>Effective rate: ${Math.round(assignment.actualFee / hours)}/hr</p>
                                                  </>
                                                ) : (
                                                  <>
                                                    <p>Hourly rate: ${Math.round(hourlyRate)}/hr ({rateSource})</p>
                                                    <p>Hours: {hours}</p>
                                                    <p>Total: ${Math.round(hourlyRate * hours)}</p>
                                                  </>
                                                )}
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
                                plannerId={plannerId}
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
                    }) : null}
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


    </div>
  );
};

export default PlannerGrid;