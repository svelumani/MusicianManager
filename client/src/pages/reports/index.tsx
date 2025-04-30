import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PieChart, LineChart, PieChartIcon, BarChart as BarChartIcon, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell,
  Pie
} from "recharts";
import type { Payment, Collection, Event, Booking, Musician, Venue } from "@shared/schema";

// Define colors for the charts
const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("financial");

  const { data: payments, isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const { data: collections, isLoading: isLoadingCollections } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
  });

  const { data: events, isLoading: isLoadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: bookings, isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: musicians } = useQuery<Musician[]>({
    queryKey: ["/api/musicians"],
  });

  const { data: venues } = useQuery<Venue[]>({
    queryKey: ["/api/venues"],
  });

  // Helper functions
  const getMusicianName = (musicianId: number) => {
    const musician = musicians?.find(m => m.id === musicianId);
    return musician ? musician.name : "Unknown";
  };

  const getEventName = (eventId: number) => {
    const event = events?.find(e => e.id === eventId);
    return event ? event.name : "Unknown";
  };

  const getVenueName = (venueId: number) => {
    const venue = venues?.find(v => v.id === venueId);
    return venue ? venue.name : "Unknown";
  };

  // Financial data
  const getTotalPayments = () => {
    return payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  };

  const getTotalCollections = () => {
    return collections?.reduce((sum, collection) => sum + collection.amount, 0) || 0;
  };

  const getProfit = () => {
    return getTotalCollections() - getTotalPayments();
  };

  // Chart data
  const getRevenueByMonth = () => {
    if (!collections) return [];

    const monthlyRevenue: Record<string, number> = {};
    
    collections.forEach(collection => {
      const date = new Date(collection.date);
      const monthKey = format(date, 'MMM yyyy');
      
      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = 0;
      }
      monthlyRevenue[monthKey] += collection.amount;
    });

    return Object.entries(monthlyRevenue).map(([month, amount]) => ({
      month,
      amount
    })).sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const getBookingsByStatus = () => {
    if (!bookings) return [];

    const statusCount: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      cancelled: 0
    };

    bookings.forEach(booking => {
      const status = booking.isAccepted ? 
        (booking.contractSigned ? "confirmed" : "pending") : 
        "cancelled";
      statusCount[status]++;
    });

    return Object.entries(statusCount).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count
    }));
  };

  // Event data
  const getUpcomingEvents = () => {
    if (!events) return [];

    const now = new Date();
    return events
      .filter(event => new Date(event.startDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);
  };

  // Mock export function (would be implemented with actual export functionality in a real app)
  const exportReport = (reportType: string) => {
    console.log(`Exporting ${reportType} report...`);
    // In a real app, this would generate and download a CSV/Excel file
  };

  const isLoading = isLoadingPayments || isLoadingCollections || isLoadingEvents || isLoadingBookings;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="musicians">Musicians</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Financial Reports Tab */}
            <TabsContent value="financial" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${getTotalCollections().toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${getTotalPayments().toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getProfit() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${getProfit().toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>Revenue by Month</span>
                      <Button variant="outline" size="sm" onClick={() => exportReport('revenue')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getRevenueByMonth()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                          <Legend />
                          <Bar dataKey="amount" name="Revenue" fill="hsl(var(--chart-1))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>Recent Payments</span>
                      <Button variant="outline" size="sm" onClick={() => exportReport('payments')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Musician</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments?.slice(0, 5).map((payment) => {
                          const booking = bookings?.find(b => b.id === payment.bookingId);
                          return (
                            <TableRow key={payment.id}>
                              <TableCell>{format(new Date(payment.date), 'MMM dd, yyyy')}</TableCell>
                              <TableCell>
                                {booking ? getMusicianName(booking.musicianId) : 'Unknown'}
                              </TableCell>
                              <TableCell>${payment.amount.toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Events Reports Tab */}
            <TabsContent value="events" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{events?.length || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getUpcomingEvents().length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Bookings Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {bookings?.filter(b => b.contractSigned).length || 0} Confirmed
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Bookings by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getBookingsByStatus()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {getBookingsByStatus().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [value, 'Bookings']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>Upcoming Events</span>
                      <Button variant="outline" size="sm" onClick={() => exportReport('events')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Event</TableHead>
                          <TableHead>Venue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getUpcomingEvents().map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>{format(new Date(event.startDate), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{event.name}</TableCell>
                            <TableCell>{getVenueName(event.venueId)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Musicians Reports Tab */}
            <TabsContent value="musicians" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Musicians</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{musicians?.length || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Active Musicians</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {musicians?.filter(m => {
                        const musicianBookings = bookings?.filter(b => b.musicianId === m.id) || [];
                        return musicianBookings.length > 0;
                      }).length || 0}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Pay Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${musicians && musicians.length > 0 
                        ? (musicians.reduce((sum, m) => sum + m.payRate, 0) / musicians.length).toFixed(2) 
                        : '0.00'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Musician Performance</span>
                    <Button variant="outline" size="sm" onClick={() => exportReport('musicians')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Musician</TableHead>
                        <TableHead>Bookings</TableHead>
                        <TableHead>Earnings</TableHead>
                        <TableHead>Rating</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {musicians?.slice(0, 10).map((musician) => {
                        const musicianBookings = bookings?.filter(b => b.musicianId === musician.id) || [];
                        const earnings = payments?.filter(p => {
                          const booking = bookings?.find(b => b.id === p.bookingId);
                          return booking?.musicianId === musician.id;
                        }).reduce((sum, p) => sum + p.amount, 0) || 0;
                        
                        return (
                          <TableRow key={musician.id}>
                            <TableCell className="font-medium">{musician.name}</TableCell>
                            <TableCell>{musicianBookings.length}</TableCell>
                            <TableCell>${earnings.toFixed(2)}</TableCell>
                            <TableCell>{musician.rating?.toFixed(1) || 'N/A'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
