import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  CalendarDays, 
  Music,
  CheckSquare,
  Square
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths, isAfter, startOfDay, isSameDay } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MusicianInfo {
  id: number;
  name: string;
  profileImage: string | null;
}

interface CalendarData {
  month: number;
  year: number;
  availability: {
    id: number;
    date: string;
    isAvailable: boolean;
  }[];
  bookings: {
    id: number;
    date: string;
    status: string;
  }[];
}

interface SharedAvailabilityData {
  musician: MusicianInfo;
  calendar: CalendarData;
}

export default function SharedAvailabilityView() {
  const [, params] = useRoute<{ token: string }>("/availability/:token");
  const token = params?.token;
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sharedData, setSharedData] = useState<SharedAvailabilityData | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  useEffect(() => {
    if (!token) return;
    
    const fetchSharedAvailability = async () => {
      try {
        setLoading(true);
        
        const month = currentMonth.getMonth() + 1; // 0-based to 1-based
        const year = currentMonth.getFullYear();
        
        const response = await fetch(
          `/api/public/availability/${token}?month=${month}&year=${year}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        
        if (response.status === 401) {
          setExpired(true);
          setError("This availability share link has expired");
          return;
        }
        
        if (!response.ok) {
          throw new Error("Failed to fetch shared availability");
        }
        
        const data = await response.json();
        setSharedData(data);
      } catch (err) {
        console.error("Error fetching shared availability:", err);
        setError("There was an error loading this musician's availability");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSharedAvailability();
  }, [token, currentMonth]);
  
  const navigateMonth = (direction: "next" | "prev") => {
    setCurrentMonth(prev => 
      direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1)
    );
    // Clear selected dates when changing months
    setSelectedDates([]);
  };
  
  const toggleDateSelection = (date: Date) => {
    // Don't allow selection of dates with bookings or past dates
    if (getBookingForDate(date) || !isFutureDate(date)) {
      return;
    }
    
    if (multiSelectMode) {
      setSelectedDates(prev => {
        // Check if date is already selected
        const isSelected = prev.some(selectedDate => 
          isSameDay(selectedDate, date)
        );
        
        if (isSelected) {
          // Remove date if already selected
          return prev.filter(selectedDate => !isSameDay(selectedDate, date));
        } else {
          // Add date if not already selected
          return [...prev, date];
        }
      });
    } else {
      // In single select mode, just set the date
      setSelectedDates([date]);
    }
  };
  
  const isFutureDate = (date: Date) => {
    const today = startOfDay(new Date());
    return isAfter(date, today) || isSameDay(date, today);
  };
  
  const isDateSelected = (date: Date) => {
    return selectedDates.some(selectedDate => 
      isSameDay(selectedDate, date)
    );
  };
  
  const updateAvailability = async (isAvailable: boolean) => {
    if (selectedDates.length === 0) {
      toast({
        title: "No dates selected",
        description: "Please select at least one date to update",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsUpdating(true);
      
      const formattedDates = selectedDates.map(date => 
        format(date, "yyyy-MM-dd")
      );
      
      const response = await fetch(`/api/public/availability/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dates: formattedDates,
          isAvailable
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update availability");
      }
      
      const result = await response.json();
      
      // Refresh the calendar data
      const month = currentMonth.getMonth() + 1;
      const year = currentMonth.getFullYear();
      
      const refreshResponse = await fetch(
        `/api/public/availability/${token}?month=${month}&year=${year}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh calendar data");
      }
      
      const refreshedData = await refreshResponse.json();
      setSharedData(refreshedData);
      
      // Clear selected dates
      setSelectedDates([]);
      
      toast({
        title: "Availability updated",
        description: `Successfully marked ${result.updatedDates} date(s) as ${isAvailable ? 'available' : 'unavailable'}`,
      });
      
    } catch (err) {
      console.error("Error updating availability:", err);
      toast({
        title: "Update failed",
        description: "There was an error updating your availability",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  const isDateAvailable = (date: Date) => {
    if (!sharedData?.calendar?.availability) return false;
    
    const dateStr = format(date, "yyyy-MM-dd");
    return sharedData.calendar.availability.some(
      a => new Date(a.date).toISOString().split('T')[0] === dateStr && a.isAvailable
    );
  };
  
  const isDateUnavailable = (date: Date) => {
    if (!sharedData?.calendar?.availability) return false;
    
    const dateStr = format(date, "yyyy-MM-dd");
    return sharedData.calendar.availability.some(
      a => new Date(a.date).toISOString().split('T')[0] === dateStr && !a.isAvailable
    );
  };
  
  const getBookingForDate = (date: Date) => {
    if (!sharedData?.calendar?.bookings) return undefined;
    
    const dateStr = format(date, "yyyy-MM-dd");
    return sharedData.calendar.bookings.find(
      b => new Date(b.date).toISOString().split('T')[0] === dateStr
    );
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg mt-4">Loading availability calendar...</p>
      </div>
    );
  }
  
  if (error || expired) {
    return (
      <div className="container mx-auto max-w-lg py-16 px-4">
        <Alert variant={expired ? "warning" : "destructive"} className="mb-6">
          {expired ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <AlertTitle>
            {expired ? "Expired Link" : "Error Loading Availability"}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        
        <div className="text-center mt-8">
          <Button asChild>
            <a href="/">Return to Home</a>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <Card className="border-2 border-primary/10">
        <CardHeader>
          <div className="flex items-center space-x-4 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={sharedData?.musician?.profileImage || ""} alt={sharedData?.musician?.name} />
              <AvatarFallback>
                <Music className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{sharedData?.musician?.name} - Availability Calendar</CardTitle>
              <CardDescription>
                View this musician's availability and booked dates
              </CardDescription>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("prev")}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous Month
            </Button>
            
            <h2 className="text-lg font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("next")}
            >
              Next Month
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-4 flex justify-around p-2 bg-gray-50 rounded-md text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-100 mr-2"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
              <span>Unavailable</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-100 mr-2"></div>
              <span>Booked</span>
            </div>
          </div>
          
          <Calendar
            mode="single"
            selected={undefined}
            className="rounded-md border"
            modifiers={{
              available: (date) => isDateAvailable(date),
              unavailable: (date) => isDateUnavailable(date),
              booked: (date) => getBookingForDate(date) !== undefined
            }}
            modifiersClassNames={{
              available: "bg-blue-100 hover:bg-blue-200 text-blue-900",
              unavailable: "bg-gray-200 hover:bg-gray-300 text-gray-700",
              booked: "bg-green-100 hover:bg-green-200 text-green-900"
            }}
          />
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-md text-sm">
            <div className="flex items-start">
              <CalendarDays className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
              <div>
                <h3 className="font-medium">How to use this calendar</h3>
                <p className="mt-1 text-gray-700">
                  This calendar shows the musician's availability for the selected month. 
                  Blue dates indicate the musician is available, gray dates indicate unavailability, 
                  and green dates are already booked.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}