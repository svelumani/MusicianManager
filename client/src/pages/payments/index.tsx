import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Search, DollarSign, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import type { Booking, Musician, Payment, Event } from "@shared/schema";

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentNotes, setPaymentNotes] = useState("");
  const { toast } = useToast();
  
  const { data: bookings, isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: musicians } = useQuery<Musician[]>({
    queryKey: ["/api/musicians"],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: payments } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const getMusicianName = (musicianId: number) => {
    const musician = musicians?.find(m => m.id === musicianId);
    return musician ? musician.name : "Unknown";
  };

  const getEventName = (eventId: number) => {
    const event = events?.find(e => e.id === eventId);
    return event ? event.name : "Unknown";
  };

  const getBookingPaymentStatus = (bookingId: number) => {
    const booking = bookings?.find(b => b.id === bookingId);
    return booking ? booking.paymentStatus : "pending";
  };

  const filteredBookings = bookings?.filter(booking => {
    const musicianName = getMusicianName(booking.musicianId).toLowerCase();
    const eventName = getEventName(booking.eventId).toLowerCase();
    return (
      musicianName.includes(searchQuery.toLowerCase()) ||
      eventName.includes(searchQuery.toLowerCase()) ||
      booking.paymentStatus.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: { bookingId: number; amount: number; date: Date; method: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/payments", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "The payment has been recorded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setIsPaymentDialogOpen(false);
      resetPaymentForm();
    },
    onError: (error) => {
      toast({
        title: "Failed to record payment",
        description: error.message || "An error occurred while recording the payment",
        variant: "destructive",
      });
    },
  });

  const handleAddPayment = (booking: Booking) => {
    setSelectedBooking(booking);
    setPaymentAmount(booking.paymentAmount?.toString() || "");
    setIsPaymentDialogOpen(true);
  };

  const handleSubmitPayment = () => {
    if (!selectedBooking || !paymentAmount) return;

    createPaymentMutation.mutate({
      bookingId: selectedBooking.id,
      amount: parseFloat(paymentAmount),
      date: new Date(),
      method: paymentMethod,
      notes: paymentNotes || undefined
    });
  };

  const resetPaymentForm = () => {
    setSelectedBooking(null);
    setPaymentAmount("");
    setPaymentMethod("Bank Transfer");
    setPaymentNotes("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Payment Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by musician or event name..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoadingBookings ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredBookings && filteredBookings.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Musician</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings
                    .filter(booking => booking.isAccepted && booking.contractSigned)
                    .map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{getMusicianName(booking.musicianId)}</TableCell>
                        <TableCell>{getEventName(booking.eventId)}</TableCell>
                        <TableCell>{booking.contractSignedAt ? format(new Date(booking.contractSignedAt), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                        <TableCell>${booking.paymentAmount?.toFixed(2) || 'N/A'}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            booking.paymentStatus === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : booking.paymentStatus === 'partial' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {booking.paymentStatus === 'paid' ? (
                              <>
                                <Check className="mr-1 h-3 w-3" />
                                Paid
                              </>
                            ) : booking.paymentStatus === 'partial' ? (
                              'Partial'
                            ) : (
                              'Pending'
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddPayment(booking)}
                            disabled={booking.paymentStatus === 'paid'}
                          >
                            {booking.paymentStatus === 'paid' ? 'Paid' : 'Record Payment'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-center">
              <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No payments to manage</h3>
              <p className="text-gray-500">
                {searchQuery
                  ? `No bookings match "${searchQuery}"`
                  : "There are no confirmed bookings that require payment"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Enter the payment details for{' '}
              {selectedBooking && getMusicianName(selectedBooking.musicianId)}
              {' for '}
              {selectedBooking && getEventName(selectedBooking.eventId)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter payment amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Add any additional notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitPayment}
              disabled={!paymentAmount || createPaymentMutation.isPending}
            >
              {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
