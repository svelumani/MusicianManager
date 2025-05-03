import React, { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { AvailabilityCalendar } from "@/components/availability/AvailabilityCalendar";
import { ShareLinkManager } from "@/components/availability/ShareLinkManager";
import type { Musician } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

const MusicianAvailabilityPage = () => {
  const { id } = useParams<{ id: string }>();
  const musicianId = id ? parseInt(id) : 0;
  const [musician, setMusician] = useState<Musician | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMusician = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/musicians/${musicianId}`, {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Error fetching musician data: ${response.statusText}`);
        }

        const data = await response.json();
        setMusician(data);
      } catch (err) {
        console.error("Error fetching musician data:", err);
        setError("Failed to load musician data");
      } finally {
        setLoading(false);
      }
    };

    if (musicianId) {
      fetchMusician();
    }
  }, [musicianId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (error || !musician) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-red-500">{error || "Musician not found"}</p>
          <Button asChild className="mt-4">
            <Link href="/musicians">Back to Musicians</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/musicians">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{musician.name}'s Availability</h1>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">Booking History</TabsTrigger>
          <TabsTrigger value="share">Share Links</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          <AvailabilityCalendar musicianId={musicianId} />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <BookingHistoryList musicianId={musicianId} />
        </TabsContent>
        
        <TabsContent value="share" className="mt-6">
          <ShareLinkManager musicianId={musicianId} musicianName={musician.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Secondary component to show booking history in list form
const BookingHistoryList = ({ musicianId }: { musicianId: number }) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'date' | 'eventId' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Get current month and year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/musicians/${musicianId}/bookings/${currentMonth}/${currentYear}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching bookings: ${response.statusText}`);
        }

        const data = await response.json();
        setBookings(data);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setError("Failed to load booking history");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [musicianId, currentMonth, currentYear]);

  const handleSort = (field: 'date' | 'eventId' | 'status') => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending for date, ascending for other fields
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const getSortedBookings = () => {
    if (!bookings.length) return [];
    
    return [...bookings].sort((a, b) => {
      if (sortField === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } 
      else if (sortField === 'eventId') {
        return sortDirection === 'asc' 
          ? a.eventId - b.eventId 
          : b.eventId - a.eventId;
      }
      else if (sortField === 'status') {
        // Create a numeric value for status sorting (higher = more confirmed)
        const getStatusWeight = (booking: any) => {
          if (booking.contractSigned) return 3;
          if (booking.isAccepted) return 2;
          return 1; // Pending
        };
        
        const statusA = getStatusWeight(a);
        const statusB = getStatusWeight(b);
        
        return sortDirection === 'asc' 
          ? statusA - statusB 
          : statusB - statusA;
      }
      return 0;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No booking history found for this month</p>
      </div>
    );
  }

  const getSortIcon = (field: 'date' | 'eventId' | 'status') => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent Bookings</h3>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                onClick={() => handleSort('date')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Date {getSortIcon('date')}
                </div>
              </th>
              <th 
                onClick={() => handleSort('eventId')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Event {getSortIcon('eventId')}
                </div>
              </th>
              <th 
                onClick={() => handleSort('status')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center gap-1">
                  Status {getSortIcon('status')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getSortedBookings().map((booking) => (
              <tr key={booking.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(booking.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Event #{booking.eventId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {booking.contractSigned ? "Confirmed" : booking.isAccepted ? "Accepted" : "Pending"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MusicianAvailabilityPage;