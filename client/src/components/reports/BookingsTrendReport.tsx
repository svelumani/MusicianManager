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
  ResponsiveContainer,
  ComposedChart,
  Area
} from "recharts";

interface BookingsTrendReportProps {
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

export default function BookingsTrendReport({ filters, metricsData, dateRangeDisplay }: BookingsTrendReportProps) {
  // Sample data for bookings trend
  const bookingsTrendData = [
    { month: "Jan", bookings: 28, revenue: 22400, cancellations: 2 },
    { month: "Feb", bookings: 32, revenue: 25600, cancellations: 3 },
    { month: "Mar", bookings: 38, revenue: 30400, cancellations: 2 },
    { month: "Apr", bookings: 42, revenue: 33600, cancellations: 1 },
    { month: "May", bookings: 48, revenue: 38400, cancellations: 4 },
    { month: "Jun", bookings: 52, revenue: 41600, cancellations: 2 },
  ];

  const bookingsByCategory = [
    { name: "Jazz", value: 35 },
    { name: "Classical", value: 25 },
    { name: "Rock", value: 18 },
    { name: "Blues", value: 15 },
    { name: "Electronic", value: 10 },
    { name: "Folk", value: 8 },
    { name: "Pop", value: 5 },
  ];

  const upcomingBookings = [
    { date: "Jun 15, 2024", venue: "The Harmony Hall", musician: "Classical Quartet", status: "Confirmed", fee: 2000 },
    { date: "Jun 18, 2024", venue: "Blue Note Jazz Club", musician: "Jazz Trio", status: "Confirmed", fee: 1500 },
    { date: "Jun 20, 2024", venue: "Rhythm & Brews", musician: "Blues Band", status: "Pending", fee: 1200 },
    { date: "Jun 25, 2024", venue: "Soundwave Lounge", musician: "Electronic DJ", status: "Confirmed", fee: 1800 },
    { date: "Jun 28, 2024", venue: "The Grand Ballroom", musician: "String Orchestra", status: "Confirmed", fee: 3000 },
  ];

  const bookingDayDistribution = [
    { name: "Monday", bookings: 15 },
    { name: "Tuesday", bookings: 20 },
    { name: "Wednesday", bookings: 25 },
    { name: "Thursday", bookings: 35 },
    { name: "Friday", bookings: 50 },
    { name: "Saturday", bookings: 60 },
    { name: "Sunday", bookings: 40 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  // Render the chart based on the selected chart type
  const renderChart = () => {
    switch (filters.chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={bookingsTrendData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === "revenue") return [`$${value}`, "Revenue"];
                  return [value, name === "bookings" ? "Bookings" : "Cancellations"];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="bookings" name="Bookings" fill="#8884d8" />
              <Bar yAxisId="left" dataKey="cancellations" name="Cancellations" fill="#ff8042" />
              <Bar yAxisId="right" dataKey="revenue" name="Revenue ($)" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart
              data={bookingsTrendData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === "revenue") return [`$${value}`, "Revenue"];
                  return [value, name === "bookings" ? "Bookings" : "Cancellations"];
                }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="bookings" name="Bookings" stroke="#8884d8" strokeWidth={2} />
              <Line yAxisId="left" type="monotone" dataKey="cancellations" name="Cancellations" stroke="#ff8042" strokeWidth={2} />
              <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue ($)" fill="#82ca9d" stroke="#82ca9d" />
            </ComposedChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={bookingsByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {bookingsByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Bookings']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === "Confirmed") return <Badge className="bg-green-500">Confirmed</Badge>;
    if (status === "Pending") return <Badge className="bg-yellow-500">Pending</Badge>;
    return <Badge className="bg-red-500">Cancelled</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center justify-between">
            <span>Bookings Trend - {dateRangeDisplay}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            {renderChart()}
          </div>

          {filters.showTables && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Booking Metrics</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Total Bookings</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Cancellations</TableHead>
                      <TableHead className="text-right">Conversion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookingsTrendData.map((data, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{data.month}</TableCell>
                        <TableCell className="text-right">{data.bookings}</TableCell>
                        <TableCell className="text-right">${data.revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{data.cancellations}</TableCell>
                        <TableCell className="text-right">
                          {(((data.bookings - data.cancellations) / data.bookings) * 100).toFixed(1)}%
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
            <CardTitle className="text-lg">Bookings by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bookingsByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {bookingsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Bookings']} />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bookings by Day of Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={bookingDayDistribution}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="bookings" name="Bookings" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {filters.showTables && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Musician</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingBookings.map((booking, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{booking.date}</TableCell>
                      <TableCell>{booking.venue}</TableCell>
                      <TableCell>{booking.musician}</TableCell>
                      <TableCell className="text-right">${booking.fee.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {renderStatusBadge(booking.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}