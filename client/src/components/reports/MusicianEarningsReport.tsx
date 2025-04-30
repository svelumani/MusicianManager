import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface MusicianEarningsReportProps {
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

export default function MusicianEarningsReport({ filters, metricsData, dateRangeDisplay }: MusicianEarningsReportProps) {
  // Sample data for musician earnings
  const musicianEarningsData = [
    { name: "John Smith", performances: 32, earnings: 12800, attendanceRate: 98, category: "Piano" },
    { name: "Maria Garcia", performances: 28, earnings: 11200, attendanceRate: 96, category: "Vocals" },
    { name: "David Chen", performances: 35, earnings: 14000, attendanceRate: 100, category: "Violin" },
    { name: "Sarah Johnson", performances: 24, earnings: 9600, attendanceRate: 92, category: "Cello" },
    { name: "Michael Brown", performances: 30, earnings: 12000, attendanceRate: 95, category: "Guitar" },
    { name: "Lisa Wong", performances: 22, earnings: 8800, attendanceRate: 90, category: "Drums" },
    { name: "James Wilson", performances: 26, earnings: 10400, attendanceRate: 94, category: "Saxophone" },
    { name: "Emily Davis", performances: 20, earnings: 8000, attendanceRate: 88, category: "Bass" },
  ];

  const monthlyPerformanceData = [
    { month: "Jan", performances: 40, earnings: 16000 },
    { month: "Feb", performances: 45, earnings: 18000 },
    { month: "Mar", performances: 50, earnings: 20000 },
    { month: "Apr", performances: 55, earnings: 22000 },
    { month: "May", performances: 60, earnings: 24000 },
    { month: "Jun", performances: 65, earnings: 26000 },
  ];

  const categoryEarningsData = [
    { name: "Piano", value: 35000 },
    { name: "Vocals", value: 32000 },
    { name: "Violin", value: 28000 },
    { name: "Guitar", value: 25000 },
    { name: "Saxophone", value: 22000 },
    { name: "Drums", value: 20000 },
    { name: "Cello", value: 18000 },
    { name: "Bass", value: 15000 },
  ];

  const topEarningMusicians = [
    { name: "David Chen", venue: "Blue Note Jazz Club", earnings: 14000, performances: 35 },
    { name: "John Smith", venue: "The Harmony Hall", earnings: 12800, performances: 32 },
    { name: "Michael Brown", venue: "Vineyard Stage", earnings: 12000, performances: 30 },
    { name: "Maria Garcia", venue: "The Grand Ballroom", earnings: 11200, performances: 28 },
    { name: "James Wilson", venue: "Rhythm & Brews", earnings: 10400, performances: 26 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#a4de6c'];

  // Render the chart based on the selected chart type
  const renderChart = () => {
    switch (filters.chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={musicianEarningsData.sort((a, b) => b.earnings - a.earnings).slice(0, 10)}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={70} 
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip formatter={(value, name) => {
                return name === "earnings" ? [`$${value}`, "Earnings"] : [value, name === "performances" ? "Performances" : "Attendance Rate (%)"];
              }} />
              <Legend />
              <Bar dataKey="earnings" name="Earnings ($)" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={monthlyPerformanceData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip formatter={(value, name) => {
                return name === "earnings" ? [`$${value}`, "Earnings"] : [value, "Performances"];
              }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="performances" name="Performances" stroke="#8884d8" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="earnings" name="Earnings ($)" stroke="#82ca9d" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={categoryEarningsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {categoryEarningsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${value}`, 'Earnings']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  const renderAttendanceBadge = (rate: number) => {
    if (rate >= 95) return <Badge className="bg-green-500">Excellent</Badge>;
    if (rate >= 85) return <Badge className="bg-yellow-500">Good</Badge>;
    return <Badge className="bg-red-500">Needs Improvement</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center justify-between">
            <span>Musician Earnings - {dateRangeDisplay}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            {renderChart()}
          </div>

          {filters.showTables && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Top Earning Musicians</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Musician</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Performances</TableHead>
                      <TableHead className="text-right">Earnings</TableHead>
                      <TableHead className="text-right">Attendance</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {musicianEarningsData.sort((a, b) => b.earnings - a.earnings).slice(0, 8).map((musician, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{musician.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <span>{musician.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{musician.category}</TableCell>
                        <TableCell className="text-right">{musician.performances}</TableCell>
                        <TableCell className="text-right">${musician.earnings.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{musician.attendanceRate}%</TableCell>
                        <TableCell className="text-right">
                          {renderAttendanceBadge(musician.attendanceRate)}
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
            <CardTitle className="text-lg">Monthly Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={monthlyPerformanceData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => {
                  return name === "earnings" ? [`$${value}`, "Earnings"] : [value, "Performances"];
                }} />
                <Legend />
                <Bar dataKey="performances" name="Performances" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Earnings by Musician Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryEarningsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {categoryEarningsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value}`, 'Earnings']} />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {filters.showTables && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Musician Performance by Venue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Musician</TableHead>
                    <TableHead>Primary Venue</TableHead>
                    <TableHead className="text-right">Performances</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                    <TableHead className="text-right">Avg. Per Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topEarningMusicians.map((musician, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{musician.name}</TableCell>
                      <TableCell>{musician.venue}</TableCell>
                      <TableCell className="text-right">{musician.performances}</TableCell>
                      <TableCell className="text-right">${musician.earnings.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        ${(musician.earnings / musician.performances).toFixed(2)}
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