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
import SimplifiedContractSender from "./SimplifiedContractSender";
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
  "signed": "bg-green-100", // Alias for contract-signed
  "accepted": "bg-green-100", // Alias for accepted contracts
  "rejected": "bg-red-100", // For rejected contracts
  "pending": "bg-yellow-100", // For pending monthly contract responses
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

  // Query to get planner slots with improved error handling
  const {
    data: plannerSlots,
    isLoading: isSlotsLoading,
    refetch: refetchSlots
  } = useQuery({
    queryKey: ['/api/planner-slots', planner?.id],
    queryFn: async () => {
      if (!planner?.id) {
        console.warn("No planner ID available for fetching slots");
        return [];
      }

      try {
        // Use direct fetch to handle auth errors better
        const response = await fetch(`/api/planner-slots?plannerId=${planner.id}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.status === 401) {
          console.warn("Unauthorized access to planner slots. Please log in.");
          return [];
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error ${response.status} fetching planner slots: ${errorText}`);
          return [];
        }

        try {
          const slots = await response.json();
          console.log(`Fetched ${slots.length} planner slots for planner ${planner.id}`);
          return slots;
        } catch (e) {
          console.warn("Invalid JSON in planner slots response");
          return [];
        }
      } catch (error) {
        console.error("Error fetching planner slots:", error);
        // Return an empty array rather than failing
        return [];
      }
    },
    enabled: !!planner?.id,
  });

  // Query to get planner assignments with improved error handling
  const {
    data: plannerAssignments,
    isLoading: isAssignmentsLoading,
    refetch: refetchAssignments
  } = useQuery({
    // Use a simpler queryKey that's easier to invalidate
    queryKey: ['plannerAssignments', planner?.id, Date.now()], // Add timestamp to force refresh
    queryFn: async () => {
      if (!plannerSlots || plannerSlots.length === 0) {
        console.log("No planner slots available, skipping assignment fetch");
        return [];
      }
      
      // Use a cleaner approach to build the query with all slot IDs
      const slotIds = plannerSlots.map((slot: any) => slot.id);
      console.log("Fetching assignments for slots:", slotIds);
      
      try {
        // Build individual queries for each slot to avoid URL length issues
        const assignments = [];
        
        for (const id of slotIds) {
          try {
            // Use direct fetch for better control over auth
            const response = await fetch(`/api/planner-assignments?slotId=${id}`, {
              credentials: 'include',
              headers: {
                'Accept': 'application/json'
              }
            });
            
            if (response.status === 401) {
              console.warn(`Unauthorized access to assignments for slot ${id}. Please log in.`);
              continue;
            }
            
            if (!response.ok) {
              console.error(`Error ${response.status} fetching assignments for slot ${id}`);
              continue;
            }
            
            try {
              const data = await response.json();
              if (Array.isArray(data) && data.length > 0) {
                assignments.push(...data);
              }
            } catch (e) {
              console.warn(`Invalid JSON in slot ${id} assignments response`);
            }
          } catch (error) {
            console.error(`Error fetching assignments for slot ${id}:`, error);
          }
        }
        
        console.log("Combined assignments:", assignments.length);
        
        // Log some assignment status information
        if (assignments.length > 0) {
          try {
            const statuses = assignments.map((a: any) => a.status);
            const uniqueStatuses = Array.from(new Set(statuses));
            console.log("Assignment statuses found:", uniqueStatuses);
            
            // Debug: Show assignments with specific statuses
            if (uniqueStatuses.includes('contract-sent')) {
              console.log("Found assignments with contract-sent status:", 
                assignments.filter((a: any) => a.status === 'contract-sent').map((a: any) => a.id)
              );
            }
            
            if (uniqueStatuses.includes('contract-signed')) {
              console.log("Found assignments with contract-signed status:", 
                assignments.filter((a: any) => a.status === 'contract-signed').map((a: any) => a.id)
              );
            }
          } catch (error) {
            console.error("Error processing status information:", error);
          }
        }
        
        return assignments;
      } catch (error) {
        console.error("Error fetching assignments:", error);
        return [];
      }
    },
    enabled: !!plannerSlots && plannerSlots.length > 0,
    // Stale time set to 0 to ensure fresh data on every render
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Query to get musicians with improved error handling
  const {
    data: musicians,
    isLoading: isMusiciansLoading,
  } = useQuery<any[]>({
    queryKey: ['/api/musicians'],
    queryFn: async () => {
      try {
        // Use direct fetch to handle auth errors better
        const response = await fetch('/api/musicians', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.status === 401) {
          console.warn("Unauthorized access to musicians. Please log in.");
          return [];
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error ${response.status} fetching musicians: ${errorText}`);
          return [];
        }

        try {
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        } catch (e) {
          console.warn("Invalid JSON in musicians response");
          return [];
        }
      } catch (error) {
        console.error("Error fetching musicians:", error);
        return [];
      }
    }
  });

  // Query to get musician availability data with improved error handling
  const {
    data: availabilityData,
    isLoading: isAvailabilityLoading,
  } = useQuery({
    queryKey: ['/api/availability', year, month],
    queryFn: async () => {
      try {
        // Use direct fetch to handle auth errors better
        const response = await fetch(`/api/availability?year=${year}&month=${month}`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.status === 401) {
          console.warn("Unauthorized access to availability data. Please log in.");
          return [];
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error ${response.status} fetching availability: ${errorText}`);
          return [];
        }

        try {
          const data = await response.json();
          return data;
        } catch (e) {
          console.warn("Invalid JSON in availability response");
          return [];
        }
      } catch (error) {
        console.error("Error fetching availability:", error);
        return [];
      }
    },
    enabled: availabilityView && !!musicians && musicians.length > 0,
  });
  
  // Query to get musician pay rates with improved error handling
  const {
    data: payRates,
    isLoading: isPayRatesLoading,
  } = useQuery({
    queryKey: ['/api/musician-pay-rates'],
    queryFn: async () => {
      try {
        // Use direct fetch to handle auth errors better
        const response = await fetch('/api/musician-pay-rates', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.status === 401) {
          console.warn("Unauthorized access to pay rates. Please log in.");
          return [];
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error ${response.status} fetching pay rates: ${errorText}`);
          return [];
        }

        try {
          const rates = await response.json();
          
          // Debug: Log James Wilson's rates for Club Performance
          const jamesRates = rates.filter((r: any) => r.musicianId === 7);
          const clubRates = rates.filter((r: any) => r.eventCategoryId === 3);
          const jamesClubRates = rates.filter((r: any) => r.musicianId === 7 && r.eventCategoryId === 3);
          
          console.log("DEBUG - All pay rates count:", rates.length);
          console.log("DEBUG - James Wilson (ID 7) rates:", jamesRates);
          console.log("DEBUG - Club Performance (ID 3) rates:", clubRates);
          console.log("DEBUG - James Wilson Club Performance rates:", jamesClubRates);
          
          return rates;
        } catch (e) {
          console.warn("Invalid JSON in pay rates response");
          return [];
        }
      } catch (error) {
        console.error("Error fetching pay rates:", error);
        return [];
      }
    }
  });
  
  // Query to get event categories with improved error handling
  const {
    data: eventCategories,
    isLoading: isEventCategoriesLoading,
  } = useQuery({
    queryKey: ['/api/event-categories'],
    queryFn: async () => {
      try {
        // Use direct fetch to handle auth errors better
        const response = await fetch('/api/event-categories', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.status === 401) {
          console.warn("Unauthorized access to event categories. Please log in.");
          return [];
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error ${response.status} fetching event categories: ${errorText}`);
          return [];
        }

        try {
          const data = await response.json();
          return data;
        } catch (e) {
          console.warn("Invalid JSON in event categories response");
          return [];
        }
      } catch (error) {
        console.error("Error fetching event categories:", error);
        return [];
      }
    }
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

  // Handle musician assignment - simplified with direct invalidation
  const handleMusicianAssigned = () => {
    // First, make sure the slots are refreshed
    refetchSlots().then(() => {
      console.log("Slots refreshed after musician assignment");
      
      // Now invalidate the assignments data to trigger a refetch
      // Use the simplified key for reliable invalidation
      queryClient.invalidateQueries({ 
        queryKey: ['plannerAssignments', planner?.id] 
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
  
  // Get slot by date and venue with additional error handling
  const getSlotByDateAndVenue = (date: Date, venueId: number): Slot | null => {
    // Handle case when plannerSlots is undefined or not an array
    if (!plannerSlots || !Array.isArray(plannerSlots)) {
      console.warn("No planner slots available or plannerSlots is not an array");
      return null;
    }
    
    try {
      return plannerSlots.find((slot: Slot) => {
        const slotDate = new Date(slot.date);
        return (
          slotDate.getDate() === date.getDate() &&
          slotDate.getMonth() === date.getMonth() &&
          slotDate.getFullYear() === date.getFullYear() &&
          slot.venueId === venueId
        );
      }) || null;
    } catch (error) {
      console.error("Error finding slot by date and venue:", error);
      return null;
    }
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

  // Get slot status className with fully revised and robust error handling
  const getSlotStatusClass = (slot: any) => {
    // DEFENSE LEVEL 1: Handle missing slot completely
    if (!slot) {
      return "bg-white"; // Absolute safe default
    }
    
    try {
      // DEFENSE LEVEL 2: Safe logging with null checks
      if (slot && typeof slot === 'object') {
        const slotId = slot.id || 'unknown';
        const slotStatus = typeof slot.status === 'string' ? slot.status : 'unknown';
        console.log("Slot status:", slotStatus, "Slot ID:", slotId);
      }
      
      // DEFENSE LEVEL 3: Extract status with multiple fallbacks
      // Multiple defense layers for status extraction
      const statusKey = (slot && 
                         typeof slot === 'object' && 
                         typeof slot.status === 'string' && 
                         slot.status.trim() !== '') 
                         ? slot.status 
                         : 'open';
      
      // DEFENSE LEVEL 4: Status color mapping with guaranteed fallback
      // Start with absolute default
      let statusColor = "bg-white"; 
      
      // DEFENSE LEVEL 5: Safe lookup with explicit type checking
      // Only proceed if we have a valid status key AND our color map exists
      if (typeof statusKey === 'string' && 
          STATUS_COLORS && 
          typeof STATUS_COLORS === 'object') {
        
        // Check if status exists in our map
        if (statusKey in STATUS_COLORS) {
          // Safe retrieval with explicit type assertion
          statusColor = STATUS_COLORS[statusKey as keyof typeof STATUS_COLORS] || "bg-white";
        } 
        // Handle special status values with custom mapping
        else if (['scheduled', 'confirmed'].includes(statusKey)) {
          statusColor = "bg-gray-100"; // Use draft color for these statuses
        }
      }
      
      // DEFENSE LEVEL 6: Assignment-based status calculation
      // First validate plannerAssignments with strong type checking
      const assignmentsValid = plannerAssignments && 
                              Array.isArray(plannerAssignments) && 
                              plannerAssignments.length > 0;
      
      // Only proceed if we have valid assignments AND a valid slot
      if (assignmentsValid && slot && typeof slot.id === 'number') {
        // Filter with comprehensive safety checks
        const slotAssignments = plannerAssignments.filter((a: any) => 
          a && 
          typeof a === 'object' && 
          'slotId' in a && 
          typeof a.slotId === 'number' && 
          a.slotId === slot.id
        );
        
        // Process assignments if we have any
        if (slotAssignments && slotAssignments.length > 0) {
          // Log for debugging
          console.log("Combined assignments:", slotAssignments.length);
          
          // Extract valid statuses with rigorous validation
          const assignmentStatuses = slotAssignments
            .map((a: any) => {
              return (a && 
                     typeof a === 'object' && 
                     'status' in a && 
                     typeof a.status === 'string' && 
                     a.status.trim() !== '') 
                     ? a.status.toLowerCase() 
                     : "unknown";
            })
            .filter((s: string) => s !== "unknown");
          
          // Log extracted statuses for debugging
          console.log("Assignment statuses found:", [...new Set(assignmentStatuses)]);
          
          // DEFENSE LEVEL 7: Status prioritization with safe lookups
          // Define status priorities with comprehensive checks
          
          // 1. Highest priority: Confirmed/Accepted/Signed statuses
          const confirmedStatuses = ['contract-signed', 'signed', 'accepted', 'confirmed'];
          if (assignmentStatuses.some(s => confirmedStatuses.includes(s))) {
            return (STATUS_COLORS['contract-signed'] || 
                   STATUS_COLORS['signed'] || 
                   STATUS_COLORS['accepted'] || 
                   "bg-green-100");
          }
          
          // 2. Medium priority: In-progress/Pending statuses
          const pendingStatuses = ['contract-sent', 'pending', 'scheduled'];
          if (assignmentStatuses.some(s => pendingStatuses.includes(s))) {
            return (STATUS_COLORS['contract-sent'] || 
                   STATUS_COLORS['pending'] || 
                   "bg-blue-100");
          }
          
          // 3. Problem statuses: Rejected/Needs clarification
          const problemStatuses = ['rejected', 'needs-clarification'];
          if (assignmentStatuses.some(s => problemStatuses.includes(s))) {
            return (STATUS_COLORS['rejected'] || 
                   STATUS_COLORS['needs-clarification'] || 
                   "bg-red-100");
          }
          
          // 4. Default for assignments with no specific status
          return STATUS_COLORS['draft'] || "bg-gray-100";
        }
      }
      
      // DEFENSE LEVEL 8: Final safe return
      // If we've made it this far, use the individually determined status color
      return statusColor;
    } catch (error) {
      // DEFENSE LEVEL 9: Error recovery
      console.error("Error determining slot status:", error);
      console.error("Problem slot:", slot);
      // Absolute safe default on any error
      return "bg-white"; 
    }
  };
  
  // Watch for slots & assignments changes to apply correct status colors
  useEffect(() => {
    if (plannerSlots && plannerSlots.length > 0 && plannerAssignments) {
      console.log("PlannerGrid: Slots and assignments updated, refreshing status colors");
    }
  }, [plannerSlots, plannerAssignments]);

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

  // Double-check that all necessary data is present before trying to render
  // This prevents the most common rendering errors
  const dataIsComplete = () => {
    // Check if we have all necessary data to render
    const hasPlanner = planner && planner.id;
    const hasVenues = venues && Array.isArray(venues) && venues.length > 0;
    const hasSlots = plannerSlots && Array.isArray(plannerSlots);
    const hasMusicians = musicians && Array.isArray(musicians) && musicians.length > 0;
    const hasCategories = categories && Array.isArray(categories);
    
    // Log any specific missing data for debugging
    if (!hasPlanner) console.warn("Planner data is missing");
    if (!hasVenues) console.warn("Venues data is missing");
    if (!hasSlots) console.warn("Slots data is missing");
    if (!hasMusicians) console.warn("Musicians data is missing");
    if (!hasCategories) console.warn("Categories data is missing");
    
    return hasPlanner && hasVenues && hasSlots && hasMusicians && hasCategories;
  };
  
  // Only show loading when essential data is loading OR data is incomplete
  if (isMusiciansLoading || isPayRatesLoading || isEventCategoriesLoading || !dataIsComplete()) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-4 text-sm text-blue-700 border border-blue-200 bg-blue-50 rounded-md mb-4">
          <svg className="animate-spin h-5 w-5 mr-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading planner grid data...</span>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
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

          {/* Removed "Refresh data" button for UI streamlining */}
          
          {/* Removed "Show availability" button for UI streamlining */}
          
          {/* Removed "Save" button for UI streamlining */}
          
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