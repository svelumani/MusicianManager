import React, { useState, useEffect } from "react";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Loader2 } from "lucide-react";
import { format, getMonth, getYear, setMonth, setYear } from "date-fns";

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
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

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
  
  // Helper to get date style classes based on availability and bookings
  const getDateClass = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isPast = date < today;
    const isBooked = !!getBookingForDate(date);
    const isAvailable = isDateAvailable(date);
    
    if (isPast) {
      return isBooked ? "bg-green-100 text-green-900" : "bg-gray-100 text-gray-500";
    }
    
    if (isBooked) {
      return "bg-green-100 text-green-900";
    }
    
    if (isAvailable) {
      return "bg-blue-100 text-blue-900";
    }
    
    return "bg-gray-50 text-gray-400";
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
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
              modifiersClassNames={{
                today: "bg-yellow-100 text-yellow-900 font-bold",
              }}
              modifiers={{
                booked: (date) => !!getBookingForDate(date),
                available: (date) => isDateAvailable(date),
              }}
              modifiersStyles={{
                booked: { backgroundColor: "rgb(220, 252, 231)", color: "rgb(20, 83, 45)" },
                available: { backgroundColor: "rgb(219, 234, 254)", color: "rgb(30, 58, 138)" },
              }}
            />
            
            <div className="mt-4 flex gap-3">
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
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}