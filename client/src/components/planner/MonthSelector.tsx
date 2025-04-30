import { useState, useEffect } from "react";
import { format, addMonths, subMonths, setMonth, setYear } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MonthSelectorProps {
  value: string; // yyyy-MM format
  onChange: (value: string) => void;
}

const MonthSelector = ({ value, onChange }: MonthSelectorProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Initialize with the provided value
  useEffect(() => {
    if (value) {
      const [year, month] = value.split("-").map(Number);
      setCurrentDate(new Date(year, month - 1, 1));
    }
  }, []);

  // Update the value when currentDate changes
  useEffect(() => {
    onChange(format(currentDate, "yyyy-MM"));
  }, [currentDate, onChange]);

  // Navigate to the previous month
  const handlePrevMonth = () => {
    setCurrentDate((prev) => subMonths(prev, 1));
  };

  // Navigate to the next month
  const handleNextMonth = () => {
    setCurrentDate((prev) => addMonths(prev, 1));
  };

  // Handle month selection
  const handleMonthSelect = (value: string) => {
    setCurrentDate((prev) => setMonth(prev, parseInt(value)));
  };

  // Handle year selection
  const handleYearSelect = (value: string) => {
    setCurrentDate((prev) => setYear(prev, parseInt(value)));
  };

  // Generate an array of months for the dropdown
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(new Date(2000, i, 1), "MMMM"),
  }));

  // Generate an array of years for the dropdown (current year +/- 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => ({
    value: (currentYear - 5 + i).toString(),
    label: (currentYear - 5 + i).toString(),
  }));

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={handlePrevMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <Select
          value={currentDate.getMonth().toString()}
          onValueChange={handleMonthSelect}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={currentDate.getFullYear().toString()}
          onValueChange={handleYearSelect}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year.value} value={year.value}>
                {year.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="icon" onClick={handleNextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default MonthSelector;