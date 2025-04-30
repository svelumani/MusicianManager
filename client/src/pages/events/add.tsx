import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import EventForm from "@/components/events/EventForm";

export default function AddEventPage() {
  const [, navigate] = useLocation();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Create New Event</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Event Information</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm 
            onSuccess={() => navigate("/events")} 
            onCancel={() => navigate("/events")} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
