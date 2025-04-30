import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface VenuePerformanceReportProps {
  filters: {
    dateRange: string;
    startDate: Date | null;
    endDate: Date | null;
    groupBy: string;
    chartType: "bar" | "line" | "pie";
    showTables: boolean;
  };
  metricsData: any;
  dateRangeDisplay: string;
}

export default function VenuePerformanceReport({ filters, metricsData, dateRangeDisplay }: VenuePerformanceReportProps) {
  // Sample data for venue performance
  const venueBookingData = [
    { name: "Blue Note Jazz Club", bookings: 42, revenue: 35000, utilization: 85 },
    { name: "The Harmony Hall", bookings: 38, revenue: 32000, utilization: 78 },
    { name: "Rhythm & Brews", bookings: 35, revenue: 28000, utilization: 72 },
    { name: "The Grand Ballroom", bookings: 31, revenue: 40000, utilization: 65 },
    { name: "Soundwave Lounge", bookings: 28, revenue: 22000, utilization: 60 },
    { name: "Vineyard Stage", bookings: 25, revenue: 18000, utilization: 55 },
    { name: "The Acoustic Corner", bookings: 22, revenue: 15000, utilization: 50 },
    { name: "Marina Pavilion", bookings: 19, revenue: 12000, utilization: 45 },
  ];

  const monthlyVenueData = [
    { month: "Jan", "Blue Note Jazz Club": 5000, "The Harmony Hall": 4500, "Rhythm & Brews": 3800 },
    { month: "Feb", "Blue Note Jazz Club": 5500, "The Harmony Hall": 5000, "Rhythm & Brews": 4200 },
    { month: "Mar", "Blue Note Jazz Club": 6000, "The Harmony Hall": 5500, "Rhythm & Brews": 4600 },
    { month: "Apr", "Blue Note Jazz Club": 6500, "The Harmony Hall": 6000, "Rhythm & Brews": 5000 },
    { month: "May", "Blue Note Jazz Club": 7000, "The Harmony Hall": 6500, "Rhythm & Brews": 5400 },
    { month: "Jun", "Blue Note Jazz Club": 7500, "The Harmony Hall": 7000, "Rhythm & Brews": 5800 }
  ];

  const eventTypesByVenue = [
    { name: "Blue Note Jazz Club", Jazz: 25, Blues: 10, Fusion: 7 },
    { name: "The Harmony Hall", Classical: 15, Opera: 12, Jazz: 11 },
    { name: "Rhythm & Brews", Rock: 14, Blues: 12, Country: 9 },
    { name: "The Grand Ballroom", Ballroom: 10, Classical: 10, Jazz: 11 },
    { name: "Soundwave Lounge", Electronic: 18, Pop: 10, Fusion: 0 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Render the chart based on the selected chart type
  const renderChart = () => {
    switch (filters.chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={venueBookingData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="bookings" name="Bookings" fill="#8884d8" />
              <Bar yAxisId="right" dataKey="utilization" name="Utilization (%)" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={monthlyVenueData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, '']} />
              <Legend />
              <Line type="monotone" dataKey="Blue Note Jazz Club" stroke="#8884d8" strokeWidth={2} />
              <Line type="monotone" dataKey="The Harmony Hall" stroke="#82ca9d" strokeWidth={2} />
              <Line type="monotone" dataKey="Rhythm & Brews" stroke="#ffc658" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={venueBookingData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="revenue"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {venueBookingData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const renderUtilizationBadge = (utilization: number) => {
    if (utilization >= 80) return <Badge className="bg-green-500">High</Badge>;
    if (utilization >= 60) return <Badge className="bg-yellow-500">Medium</Badge>;
    return <Badge className="bg-red-500">Low</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center justify-between">
            <span>Venue Performance - {dateRangeDisplay}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            {renderChart()}
          </div>

          {filters.showTables && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Venue Metrics</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Venue</TableHead>
                      <TableHead className="text-right">Bookings</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Utilization</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {venueBookingData.map((venue, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{venue.name}</TableCell>
                        <TableCell className="text-right">{venue.bookings}</TableCell>
                        <TableCell className="text-right">${venue.revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{venue.utilization}%</TableCell>
                        <TableCell className="text-right">
                          {renderUtilizationBadge(venue.utilization)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Venue Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={monthlyVenueData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, '']} />
                <Legend />
                <Line type="monotone" dataKey="Blue Note Jazz Club" stroke="#8884d8" />
                <Line type="monotone" dataKey="The Harmony Hall" stroke="#82ca9d" />
                <Line type="monotone" dataKey="Rhythm & Brews" stroke="#ffc658" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Event Types by Venue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={eventTypesByVenue}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip />
                <Legend />
                <Bar dataKey="Jazz" stackId="a" fill="#8884d8" />
                <Bar dataKey="Blues" stackId="a" fill="#82ca9d" />
                <Bar dataKey="Rock" stackId="a" fill="#ffc658" />
                <Bar dataKey="Classical" stackId="a" fill="#ff8042" />
                <Bar dataKey="Electronic" stackId="a" fill="#a4de6c" />
                <Bar dataKey="Pop" stackId="a" fill="#d0ed57" />
                <Bar dataKey="Country" stackId="a" fill="#83a6ed" />
                <Bar dataKey="Opera" stackId="a" fill="#8dd1e1" />
                <Bar dataKey="Ballroom" stackId="a" fill="#a4506c" />
                <Bar dataKey="Fusion" stackId="a" fill="#9c5678" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {filters.showTables && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Performing Venues by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venue</TableHead>
                    <TableHead>Best Event Type</TableHead>
                    <TableHead className="text-right">Revenue per Event</TableHead>
                    <TableHead className="text-right">Avg. Attendance</TableHead>
                    <TableHead className="text-right">Booking Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Blue Note Jazz Club</TableCell>
                    <TableCell>Jazz</TableCell>
                    <TableCell className="text-right">$1,400</TableCell>
                    <TableCell className="text-right">95%</TableCell>
                    <TableCell className="text-right">92%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">The Harmony Hall</TableCell>
                    <TableCell>Classical</TableCell>
                    <TableCell className="text-right">$2,100</TableCell>
                    <TableCell className="text-right">88%</TableCell>
                    <TableCell className="text-right">85%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Rhythm & Brews</TableCell>
                    <TableCell>Blues</TableCell>
                    <TableCell className="text-right">$1,200</TableCell>
                    <TableCell className="text-right">91%</TableCell>
                    <TableCell className="text-right">88%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Soundwave Lounge</TableCell>
                    <TableCell>Electronic</TableCell>
                    <TableCell className="text-right">$1,800</TableCell>
                    <TableCell className="text-right">87%</TableCell>
                    <TableCell className="text-right">82%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">The Grand Ballroom</TableCell>
                    <TableCell>Jazz</TableCell>
                    <TableCell className="text-right">$2,300</TableCell>
                    <TableCell className="text-right">85%</TableCell>
                    <TableCell className="text-right">79%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}