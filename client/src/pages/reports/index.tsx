import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, Download, Sliders, BarChart4, PieChart, LineChart, Save } from "lucide-react";
import { format } from "date-fns";
import VenuePerformanceReport from "@/components/reports/VenuePerformanceReport";
import MusicianEarningsReport from "@/components/reports/MusicianEarningsReport";
import FinancialReport from "@/components/reports/FinancialReport";
import BookingsTrendReport from "@/components/reports/BookingsTrendReport";
import SavedReportsList from "@/components/reports/SavedReportsList";

// Report type definitions
type ReportView = "venues" | "musicians" | "financial" | "bookings";
type ChartType = "bar" | "line" | "pie";
type DateRange = "last30days" | "last90days" | "lastYear" | "custom";

interface ReportFilters {
  dateRange: DateRange;
  startDate: Date | null;
  endDate: Date | null;
  groupBy: string;
  chartType: ChartType;
  showTables: boolean;
}

export default function ReportsPage() {
  // State for the active report view
  const [activeView, setActiveView] = useState<ReportView>("financial");
  
  // State for the custom filters
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: "last30days",
    startDate: null,
    endDate: null,
    groupBy: "month",
    chartType: "bar",
    showTables: true,
  });

  // Fetch dashboard metrics for base data
  const { data: metricsData, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  // Helper functions for date ranges
  const getDateRangeLabel = (range: DateRange): string => {
    switch (range) {
      case "last30days": return "Last 30 Days";
      case "last90days": return "Last 90 Days";
      case "lastYear": return "Last Year";
      case "custom": return "Custom Range";
    }
  };
  
  // Update filters function
  const updateFilters = (key: keyof ReportFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Format date range for display
  const getFormattedDateRange = (): string => {
    if (filters.dateRange !== "custom") {
      return getDateRangeLabel(filters.dateRange);
    }
    
    if (filters.startDate && filters.endDate) {
      return `${format(filters.startDate, "MMM d, yyyy")} - ${format(filters.endDate, "MMM d, yyyy")}`;
    }
    
    return "Custom Range";
  };

  // Mock function for exporting reports
  const exportReport = () => {
    alert("Report export functionality would be implemented here");
  };
  
  // Mock function for saving report configuration
  const saveReportConfig = () => {
    alert("Configuration saved!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Advanced Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate detailed reports and visualize your business metrics
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportReport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={saveReportConfig}>
            <Save className="mr-2 h-4 w-4" />
            Save Configuration
          </Button>
        </div>
      </div>

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ReportView)}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="venues">Venue Performance</TabsTrigger>
            <TabsTrigger value="musicians">Musician Earnings</TabsTrigger>
            <TabsTrigger value="bookings">Booking Trends</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-x-2">
            <Label htmlFor="saved-reports">Saved Reports:</Label>
            <Select>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a report" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="q1-financial">Q1 Financial Summary</SelectItem>
                <SelectItem value="top-venues">Top Performing Venues</SelectItem>
                <SelectItem value="musician-attendance">Musician Attendance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filter Panel */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Sliders className="h-5 w-5 mr-2" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date-range">Date Range</Label>
                <Select 
                  value={filters.dateRange}
                  onValueChange={(value) => updateFilters("dateRange", value)}
                >
                  <SelectTrigger id="date-range">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="last90days">Last 90 Days</SelectItem>
                    <SelectItem value="lastYear">Last Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filters.dateRange === "custom" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="start-date">Start Date</Label>
                    <DatePicker
                      id="start-date"
                      selected={filters.startDate}
                      onSelect={(date) => updateFilters("startDate", date)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end-date">End Date</Label>
                    <DatePicker
                      id="end-date"
                      selected={filters.endDate}
                      onSelect={(date) => updateFilters("endDate", date)}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="group-by">Group By</Label>
                <Select 
                  value={filters.groupBy}
                  onValueChange={(value) => updateFilters("groupBy", value)}
                >
                  <SelectTrigger id="group-by">
                    <SelectValue placeholder="Select grouping" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="quarter">Quarter</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="chart-type">Chart Type</Label>
                <div className="flex space-x-4 mt-2">
                  <Button
                    variant={filters.chartType === "bar" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateFilters("chartType", "bar")}
                    className="flex items-center"
                  >
                    <BarChart4 className="h-4 w-4 mr-1" />
                    Bar
                  </Button>
                  <Button
                    variant={filters.chartType === "line" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateFilters("chartType", "line")}
                    className="flex items-center"
                  >
                    <LineChart className="h-4 w-4 mr-1" />
                    Line
                  </Button>
                  <Button
                    variant={filters.chartType === "pie" ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateFilters("chartType", "pie")}
                    className="flex items-center"
                  >
                    <PieChart className="h-4 w-4 mr-1" />
                    Pie
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-tables"
                    checked={filters.showTables}
                    onCheckedChange={(checked) => updateFilters("showTables", checked)}
                  />
                  <Label htmlFor="show-tables">Show Data Tables</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoadingMetrics ? (
          <div className="h-80 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading report data...</span>
          </div>
        ) : (
          <>
            <TabsContent value="financial" className="mt-0">
              <FinancialReport 
                filters={filters} 
                metricsData={metricsData || {}} 
                dateRangeDisplay={getFormattedDateRange()} 
              />
            </TabsContent>
            
            <TabsContent value="venues" className="mt-0">
              <VenuePerformanceReport 
                filters={filters} 
                metricsData={metricsData || {}} 
                dateRangeDisplay={getFormattedDateRange()} 
              />
            </TabsContent>
            
            <TabsContent value="musicians" className="mt-0">
              <MusicianEarningsReport 
                filters={filters} 
                metricsData={metricsData || {}} 
                dateRangeDisplay={getFormattedDateRange()} 
              />
            </TabsContent>
            
            <TabsContent value="bookings" className="mt-0">
              <BookingsTrendReport 
                filters={filters} 
                metricsData={metricsData || {}} 
                dateRangeDisplay={getFormattedDateRange()} 
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Saved Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <SavedReportsList />
        </CardContent>
      </Card>
    </div>
  );
}