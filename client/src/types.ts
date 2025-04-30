// User types
export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  profileImage: string | null;
}

// Venue types
export interface Venue {
  id: number;
  name: string;
  location: string;
  paxCount: number;
  address: string;
  venuePictures: string[] | null;
  openingHours: string | null;
  capacity: number | null;
  hourlyRate: number | null;
  description: string | null;
  rating: number | null;
}

// Category types
export interface Category {
  id: number;
  title: string;
  description: string | null;
}

// Musician types
export interface Musician {
  id: number;
  name: string;
  email: string;
  profileImage: string | null;
  type: string;
  rating: number | null;
  phone: string;
  payRate: number;
  categoryId: number;
  instruments: string[] | null;
  bio: string | null;
}

// Availability types
export interface Availability {
  id: number;
  musicianId: number;
  date: Date;
  month: string;
  year: number;
  isAvailable: boolean;
}

// Event types
export interface Event {
  id: number;
  name: string;
  venueId: number;
  paxCount: number;
  eventType: string;
  startDate: Date;
  endDate: Date | null;
  status: string;
  categoryIds: number[] | null;
}

// Booking types
export interface Booking {
  id: number;
  musicianId: number;
  eventId: number;
  invitedAt: Date;
  respondedAt: Date | null;
  isAccepted: boolean | null;
  contractSent: boolean | null;
  contractSentAt: Date | null;
  paymentAmount: number | null;
  paymentStatus: string | null;
  contractSigned: boolean | null;
  contractSignedAt: Date | null;
  contractDetails: any;
}

// Payment types
export interface Payment {
  id: number;
  bookingId: number;
  date: Date;
  amount: number;
  method: string | null;
  notes: string | null;
}

// Collection types
export interface Collection {
  id: number;
  eventId: number;
  date: Date;
  amount: number;
  method: string | null;
  notes: string | null;
}

// Expense types
export interface Expense {
  id: number;
  eventId: number;
  date: Date;
  description: string;
  amount: number;
  category: string | null;
  notes: string | null;
}

// Activity types
export interface Activity {
  id: number;
  userId: number | null;
  action: string;
  entityType: string;
  entityId: number;
  timestamp: Date;
  details: any;
}

// Monthly Planner types
export interface MonthlyPlanner {
  id: number;
  month: number;
  year: number;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date | null;
}

// Planner Slot types
export interface PlannerSlot {
  id: number;
  plannerId: number;
  date: Date;
  venueId: number;
  categoryId: number;
  startTime: string;
  endTime: string;
  description: string | null;
  status: string;
  fee: number | null;
}

// Planner Assignment types
export interface PlannerAssignment {
  id: number;
  slotId: number;
  musicianId: number;
  assignedAt: Date;
  status: string;
  attendanceMarkedAt: Date | null;
  attendanceMarkedBy: number | null;
  notes: string | null;
  actualFee: number | null;
}

// Monthly Invoice types
export interface MonthlyInvoice {
  id: number;
  plannerId: number;
  musicianId: number;
  month: number;
  year: number;
  totalSlots: number;
  attendedSlots: number;
  totalAmount: number;
  status: string;
  generatedAt: Date;
  paidAt: Date | null;
  notes: string | null;
}