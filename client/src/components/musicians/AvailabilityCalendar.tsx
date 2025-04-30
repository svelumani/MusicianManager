import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Check, X } from "lucide-react";

interface AvailabilityCalendarProps {
  musicianId: number;
  onSave: (dates: Date[]) => void;
  onCancel: () => void;
  initialDates?: Date[];
}

export default function AvailabilityCalendar({
  musicianId,
  onSave,
  onCancel,
  initialDates = [],
}: AvailabilityCalendarProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>(initialDates);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    // Check if the date is already selected
    const dateExists = selectedDates.some(
      (selectedDate) => format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );

    if (dateExists) {
      // Remove the date if already selected
      setSelectedDates(
        selectedDates.filter(
          (selectedDate) => format(selectedDate, 'yyyy-MM-dd') !== format(date, 'yyyy-MM-dd')
        )
      );
    } else {
      // Add the date if not already selected
      setSelectedDates([...selectedDates, date]);
    }
  };

  const handleSave = () => {
    onSave(selectedDates);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow">
        <Calendar
          mode="multiple"
          selected={selectedDates}
          onSelect={(value) => {
            if (Array.isArray(value) && value.length > 0) {
              setSelectedDates(value);
            } else if (value instanceof Date) {
              handleDateSelect(value);
            }
          }}
          className="rounded-md border"
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Selected Dates</h3>
        {selectedDates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedDates.map((date) => (
              <div 
                key={date.toISOString()} 
                className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded"
              >
                {format(date, 'MMM dd, yyyy')}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No dates selected yet</p>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button
          onClick={handleSave}
        >
          <Check className="mr-2 h-4 w-4" />
          Save Availability
        </Button>
      </div>
    </div>
  );
}
