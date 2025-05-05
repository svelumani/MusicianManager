import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Loader2, Mail, Phone } from "lucide-react";
import type { Musician, Category, MusicianType, MusicianPayRate } from "@shared/schema";

export default function ViewMusicianPage() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const musicianId = parseInt(id);

  const { data: musician, isLoading } = useQuery<Musician>({
    queryKey: ["/api/musicians", musicianId],
    queryFn: async () => {
      const res = await fetch(`/api/musicians/${musicianId}`);
      if (!res.ok) throw new Error("Failed to fetch musician");
      return res.json();
    },
  });

  const { data: musicianCategories } = useQuery<Category[]>({
    queryKey: ["/api/musician-categories"],
  });
  
  const { data: musicianTypes } = useQuery<MusicianType[]>({
    queryKey: ["/api/musician-types"],
  });
  
  const { data: eventCategories } = useQuery<Category[]>({
    queryKey: ["/api/event-categories"],
  });
  
  const { data: payRates, isError: payRatesError } = useQuery<MusicianPayRate[]>({
    queryKey: ["/api/musician-pay-rates", musicianId],
    queryFn: async () => {
      console.log("Fetching pay rates for musician:", musicianId);
      const res = await fetch(`/api/musician-pay-rates?musicianId=${musicianId}`);
      console.log("Pay rates response status:", res.status);
      if (!res.ok) throw new Error("Failed to fetch pay rates");
      const data = await res.json();
      console.log("Pay rates data:", data);
      return data;
    },
  });

  useEffect(() => {
    if (!isLoading && !musician) {
      navigate("/musicians");
    }
  }, [isLoading, musician, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!musician) {
    return null;
  }

  const getMusicianCategoryName = (categoryId: number) => {
    const category = musicianCategories?.find(c => c.id === categoryId);
    return category ? category.title : "Unknown";
  };
  
  const getMusicianTypeName = (typeId: number) => {
    const type = musicianTypes?.find(t => t.id === typeId);
    return type ? type.title : "Unknown";
  };
  
  const getEventCategoryName = (categoryId: number) => {
    const category = eventCategories?.find(c => c.id === categoryId);
    return category ? category.title : "Unknown";
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => navigate("/musicians")}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Musicians
          </Button>
          <h1 className="text-3xl font-bold">{musician.name}</h1>
          <p className="text-muted-foreground">{getMusicianTypeName(musician.typeId)}</p>
        </div>
        {/* Rating display removed */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Musician Info Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Musician Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={musician.profileImage || undefined} alt={musician.name} />
                <AvatarFallback>{musician.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{musician.name}</h3>
                <p className="text-sm text-muted-foreground">{getMusicianTypeName(musician.typeId)}</p>
                <Badge className="mt-2">{getMusicianCategoryName(musician.categoryId)}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Contact Information</h4>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{musician.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{musician.phone}</span>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Financial Information</h4>
                <div>
                  <p className="font-medium mb-2 mt-1">Pay Rates:</p>
                  {payRates && payRates.length > 0 ? (
                    <div className="mt-2 border rounded-md overflow-x-auto">
                      <table className="w-full text-sm min-w-[600px]">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-3 py-2 text-left whitespace-nowrap">Category</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap">Hourly Rate</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap">Daily Rate</th>
                            <th className="px-3 py-2 text-center whitespace-nowrap">Event Rate</th>
                            <th className="px-3 py-2 text-left">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {payRates.map(rate => (
                            <tr key={rate.id} className="hover:bg-muted/30">
                              <td className="px-3 py-3 font-medium whitespace-nowrap">
                                {rate.eventCategoryId ? getEventCategoryName(rate.eventCategoryId) : "Default"}
                              </td>
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                {rate.hourlyRate !== null && rate.hourlyRate !== undefined && rate.hourlyRate !== 0
                                  ? `$${parseFloat(rate.hourlyRate.toString()).toFixed(2)}/hr` 
                                  : "—"}
                              </td>
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                {rate.dayRate !== null && rate.dayRate !== undefined && rate.dayRate !== 0
                                  ? `$${parseFloat(rate.dayRate.toString()).toFixed(2)}/day` 
                                  : "—"}
                              </td>
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                {rate.eventRate !== null && rate.eventRate !== undefined && rate.eventRate !== 0
                                  ? `$${parseFloat(rate.eventRate.toString()).toFixed(2)}/event` 
                                  : "—"}
                              </td>
                              <td className="px-3 py-3 text-gray-500 italic">
                                {rate.notes || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 border rounded-md text-muted-foreground bg-muted/20">
                      No pay rates set up yet
                    </div>
                  )}
                </div>
                <p><span className="font-medium">Instruments:</span> {musician.instruments?.join(", ") || getMusicianTypeName(musician.typeId)}</p>
              </div>
            </div>

            {musician.bio && (
              <div className="space-y-2">
                <h4 className="font-medium">Biography</h4>
                <p className="text-sm">{musician.bio}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Performance metrics button removed */}
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              onClick={() => navigate(`/musicians/${musician.id}/availability`)}
            >
              View Availability Calendar
            </Button>
            <Button 
              className="w-full bg-green-600 hover:bg-green-700" 
              onClick={() => navigate(`/musicians/${musician.id}/edit`)}
            >
              Edit Musician
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/musicians")}
            >
              Back to Musicians
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}