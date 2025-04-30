import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Sample event dates for the demo
const eventDates = [15, 20, 25]; // July 15, 20, 25 in the example

export default function MusiciansCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { toast } = useToast();

  // Generate days for the current month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate days from previous month to fill the first week
  const firstDayOfMonth = monthStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => {
    const day = new Date(monthStart);
    day.setDate(day.getDate() - (firstDayOfMonth - i));
    return day;
  });

  // Calculate days from next month to fill the last week
  const lastWeekDay = monthEnd.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const nextMonthDays = Array.from({ length: 6 - lastWeekDay }, (_, i) => {
    const day = new Date(monthEnd);
    day.setDate(day.getDate() + i + 1);
    return day;
  });

  // Combine all days for the calendar view
  const calendarDays = [...prevMonthDays, ...monthDays, ...nextMonthDays];

  // Navigation handlers
  const prevMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const nextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  // Handle send availability requests
  const handleSendRequests = () => {
    // Mock functionality - in a real app this would send WhatsApp messages to musicians
    toast({
      title: "Availability requests sent",
      description: "Requests have been sent to all musicians via WhatsApp"
    });
  };

  // Helper to check if a day is an event date (for the demo)
  const isEventDate = (day: Date) => {
    // Only for July in this demo
    if (day.getMonth() === 6) { // July = 6
      return eventDates.includes(day.getDate());
    }
    return false;
  };

  return (
    <Card className="bg-white shadow rounded-lg">
      <CardHeader className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
          Musician Availability - {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={prevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">
            {format(currentMonth, 'MMMM yyyy')}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={nextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-5 sm:px-6 sm:pb-6">
        <div className="overflow-hidden">
          {/* Calendar Header */}
          <div className="grid grid-cols-7 text-center text-xs text-gray-500 border-b border-gray-200">
            <div className="py-2">Sun</div>
            <div className="py-2">Mon</div>
            <div className="py-2">Tue</div>
            <div className="py-2">Wed</div>
            <div className="py-2">Thu</div>
            <div className="py-2">Fri</div>
            <div className="py-2">Sat</div>
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 text-center text-sm">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);
              const isEvent = isEventDate(day);
              
              return (
                <div 
                  key={index} 
                  className={`p-2 border-t border-gray-200 ${!isCurrentMonth && 'text-gray-400'}`}
                >
                  <div 
                    className={`calendar-day ${
                      isCurrentDay ? 'bg-blue-100 text-blue-800 font-semibold' : 
                      isEvent ? 'calendar-day-active' : ''
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="mt-4">
          <Button 
            className="w-full sm:w-auto" 
            onClick={handleSendRequests}
          >
            <Send className="mr-2 h-4 w-4" />
            Send Availability Requests
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
