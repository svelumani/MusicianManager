import React, { useState, useEffect } from "react";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { format, getMonth, getYear, setMonth, setYear, isSameDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface BookingData {
  id: number;
  eventId: number;
  musicianId: number;
  date: string;
  // Other booking fields will be available but not used in calendar view
}

interface AvailabilityData {
  id: number;
  date: string;
  musicianId: number;
  isAvailable: boolean;
  month: string;
  year: number;
}

interface CalendarData {
  month: number;
  year: number;
  availability: AvailabilityData[];
  bookings: BookingData[];
}

interface AvailabilityCalendarProps {
  musicianId: number;
}

export function AvailabilityCalendar({ musicianId }: AvailabilityCalendarProps) {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  
  const { toast } = useToast();
  const availabilityCache = new Map<string, CalendarData>();

  // Load calendar data for the selected month
  useEffect(() => {
    const fetchCalendarData = async () => {
      setLoading(true);
      setError(null);
      
      const month = getMonth(selectedDate) + 1; // JavaScript months are 0-based
      const year = getYear(selectedDate);
      
      // Check if data is in cache
      const cacheKey = `${musicianId}-${month}-${year}`;
      if (availabilityCache.has(cacheKey)) {
        setCalendarData(availabilityCache.get(cacheKey)!);
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(
          `/api/musicians/${musicianId}/availability-calendar/${month}/${year}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );
        
        if (!response.ok) {
          throw new Error(`Error fetching availability: ${response.statusText}`);
        }
        
        const data = await response.json();
        availabilityCache.set(cacheKey, data);
        setCalendarData(data);
      } catch (err) {
        console.error("Error fetching availability calendar data:", err);
        setError("Failed to load availability data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchCalendarData();
  }, [musicianId, selectedDate]);
  
  // Helper function to check if a date is available
  const isDateAvailable = (date: Date): boolean => {
    if (!calendarData) return false;
    
    const dateStr = format(date, "yyyy-MM-dd");
    return calendarData.availability.some(
      a => new Date(a.date).toISOString().split('T')[0] === dateStr && a.isAvailable
    );
  };
  
  // Helper function to check if a date has a booking
  const getBookingForDate = (date: Date): BookingData | undefined => {
    if (!calendarData) return undefined;
    
    const dateStr = format(date, "yyyy-MM-dd");
    return calendarData.bookings.find(
      b => new Date(b.date).toISOString().split('T')[0] === dateStr
    );
  };
  
  // Month selection options
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Generate year options (current year - 1 to current year + 2)
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
  
  const handleMonthChange = (value: string) => {
    const monthIndex = months.findIndex(m => m === value);
    if (monthIndex !== -1) {
      const newDate = setMonth(selectedDate, monthIndex);
      setSelectedDate(newDate);
    }
  };
  
  const handleYearChange = (value: string) => {
    const year = parseInt(value);
    if (!isNaN(year)) {
      const newDate = setYear(selectedDate, year);
      setSelectedDate(newDate);
    }
  };
  
  // Update availability for selected dates
  const updateAvailability = async (isAvailable: boolean) => {
    setUpdatingAvailability(true);
    
    try {
      // Use the single selected date if not in multi-select mode
      const datesToUpdate = multiSelectMode ? selectedDates : [selectedDate];
      
      if (datesToUpdate.length === 0) {
        toast({
          title: "No dates selected",
          description: "Please select at least one date to update",
          variant: "destructive",
        });
        return;
      }
      
      // Create an array of promises for each date update
      const updatePromises = datesToUpdate.map(async (date) => {
        const response = await fetch(`/api/musicians/${musicianId}/availability`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            date: format(date, "yyyy-MM-dd"),
            isAvailable
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to update availability for ${format(date, "yyyy-MM-dd")}`);
        }
        
        return await response.json();
      });
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      // Clear the availability cache for this month/year
      const month = getMonth(selectedDate) + 1;
      const year = getYear(selectedDate);
      const cacheKey = `${musicianId}-${month}-${year}`;
      availabilityCache.delete(cacheKey);
      
      // Refresh calendar data
      const response = await fetch(
        `/api/musicians/${musicianId}/availability-calendar/${month}/${year}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );
      
      const data = await response.json();
      availabilityCache.set(cacheKey, data);
      setCalendarData(data);
      
      // Clear multi-select if active
      if (multiSelectMode) {
        setSelectedDates([]);
      }
      
      toast({
        title: "Availability updated",
        description: `Successfully marked ${datesToUpdate.length} date(s) as ${isAvailable ? 'available' : 'unavailable'}`,
      });
      
    } catch (err) {
      console.error("Error updating availability:", err);
      toast({
        title: "Update failed",
        description: "There was an error updating the availability",
        variant: "destructive",
      });
    } finally {
      setUpdatingAvailability(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability Calendar</CardTitle>
        <CardDescription>View past bookings and future availability</CardDescription>
        
        <div className="flex space-x-2 mt-4">
          <Select
            value={months[getMonth(selectedDate)]}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={getYear(selectedDate).toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">{error}</div>
        ) : (
          <>
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMultiSelectMode(!multiSelectMode);
                      if (!multiSelectMode) {
                        setSelectedDates([]);
                      }
                    }}
                    className={multiSelectMode ? "bg-blue-50 border-blue-200" : ""}
                  >
                    {multiSelectMode ? "Exit Multi-Select" : "Select Multiple Days"}
                  </Button>
                  
                  {multiSelectMode && (
                    <span className="text-sm text-muted-foreground">
                      {selectedDates.length} date(s) selected
                    </span>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-500 hover:bg-green-50"
                    onClick={() => updateAvailability(true)}
                    disabled={updatingAvailability}
                  >
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Mark Available
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500 hover:bg-red-50"
                    onClick={() => updateAvailability(false)}
                    disabled={updatingAvailability}
                  >
                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                    Mark Unavailable
                  </Button>
                </div>
              </div>
              
              {updatingAvailability && (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">Updating availability...</span>
                </div>
              )}
            </div>
            
            <div className="relative">
              {multiSelectMode ? (
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => dates && setSelectedDates(dates)}
                  className="rounded-md border"
                  modifiers={{
                    available: (date) => isDateAvailable(date),
                    unavailable: (date) => {
                      if (!calendarData) return false;
                      const dateStr = format(date, "yyyy-MM-dd");
                      return calendarData.availability.some(
                        a => new Date(a.date).toISOString().split('T')[0] === dateStr && !a.isAvailable
                      );
                    },
                    booked: (date) => getBookingForDate(date) !== undefined
                  }}
                  modifiersClassNames={{
                    available: "bg-blue-100 hover:bg-blue-200 text-blue-900",
                    unavailable: "bg-gray-50 hover:bg-gray-100 text-gray-700",
                    booked: "bg-green-100 hover:bg-green-200 text-green-900"
                  }}
                />
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border"
                  modifiers={{
                    available: (date) => isDateAvailable(date),
                    unavailable: (date) => {
                      if (!calendarData) return false;
                      const dateStr = format(date, "yyyy-MM-dd");
                      return calendarData.availability.some(
                        a => new Date(a.date).toISOString().split('T')[0] === dateStr && !a.isAvailable
                      );
                    },
                    booked: (date) => getBookingForDate(date) !== undefined
                  }}
                  modifiersClassNames={{
                    available: "bg-blue-100 hover:bg-blue-200 text-blue-900",
                    unavailable: "bg-gray-50 hover:bg-gray-100 text-gray-700",
                    booked: "bg-green-100 hover:bg-green-200 text-green-900"
                  }}
                />
              )}
            </div>
            
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-green-100 mr-2"></div>
                <span className="text-sm">Booked</span>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-blue-100 mr-2"></div>
                <span className="text-sm">Available</span>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-gray-50 mr-2"></div>
                <span className="text-sm">Unavailable</span>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-yellow-100 mr-2"></div>
                <span className="text-sm">Today</span>
              </div>
              {multiSelectMode && (
                <div className="flex items-center col-span-2">
                  <div className="h-3 w-3 rounded-full bg-primary mr-2"></div>
                  <span className="text-sm">Selected</span>
                </div>
              )}
            </div>
            
            {multiSelectMode && (
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200 text-sm">
                <strong>Multi-select mode:</strong> Click on multiple dates to select them, then use the buttons above to mark them all as available or unavailable.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}