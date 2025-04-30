import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Musician, Category } from "@shared/schema";

interface MusicianInvitationProps {
  eventId: number;
  categoryIds: number[];
}

export default function MusicianInvitation({ eventId, categoryIds }: MusicianInvitationProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMusicians, setSelectedMusicians] = useState<number[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const { toast } = useToast();

  const today = new Date().toISOString().split('T')[0];

  const { data: musicians, isLoading: isLoadingMusicians } = useQuery<Musician[]>({
    queryKey: ["/api/musicians"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: availableMusicians, isLoading: isLoadingAvailable } = useQuery({
    queryKey: [`/api/available-musicians?date=${today}&categoryIds=${categoryIds.join(',')}`],
    enabled: onlyAvailable && categoryIds.length > 0,
  });

  const inviteMusicianMutation = useMutation({
    mutationFn: async (musicianId: number) => {
      const booking = {
        eventId,
        musicianId,
        invitedAt: new Date().toISOString(),
        isAccepted: null,
        contractSent: false,
        paymentAmount: 
          musicians?.find(m => m.id === musicianId)?.payRate || 0,
      };
      
      const res = await apiRequest("POST", "/api/bookings", booking);
      return res.json();
    },
    onSuccess: (_, musicianId) => {
      const musicianName = musicians?.find(m => m.id === musicianId)?.name || "Musician";
      toast({
        title: "Invitation sent",
        description: `${musicianName} has been invited to the event`
      });
      
      // Update bookings query
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      
      // Mock WhatsApp notification
      const mockWhatsAppNotification = {
        to: musicians?.find(m => m.id === musicianId)?.phone || "",
        message: `You have been invited to perform at ${eventId}. Please respond within 24 hours.`
      };
      
      apiRequest("POST", "/api/notify/whatsapp", mockWhatsAppNotification);
    },
    onError: (error) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "An error occurred while sending the invitation",
        variant: "destructive",
      });
    },
  });

  const sendAllInvitationsMutation = useMutation({
    mutationFn: async () => {
      const promises = selectedMusicians.map(musicianId => 
        inviteMusicianMutation.mutateAsync(musicianId)
      );
      
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "All invitations sent",
        description: `Invitations have been sent to ${selectedMusicians.length} musicians`
      });
      setSelectedMusicians([]);
    },
    onError: (error) => {
      toast({
        title: "Failed to send all invitations",
        description: error.message || "An error occurred while sending invitations",
        variant: "destructive",
      });
    },
  });

  const getCategoryName = (categoryId: number) => {
    const category = categories?.find(c => c.id === categoryId);
    return category ? category.title : "Unknown";
  };

  const handleToggleMusician = (musicianId: number) => {
    setSelectedMusicians(prev => 
      prev.includes(musicianId)
        ? prev.filter(id => id !== musicianId)
        : [...prev, musicianId]
    );
  };

  const handleInviteMusician = (musicianId: number) => {
    inviteMusicianMutation.mutate(musicianId);
  };

  const handleSendAllInvitations = () => {
    if (selectedMusicians.length === 0) {
      toast({
        title: "No musicians selected",
        description: "Please select at least one musician to invite",
        variant: "destructive",
      });
      return;
    }
    
    sendAllInvitationsMutation.mutate();
  };

  // Filter musicians based on search query and availability if onlyAvailable is true
  const filteredMusicians = musicians?.filter(musician => {
    const matchesSearch = 
      musician.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      musician.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCategoryName(musician.categoryId).toLowerCase().includes(searchQuery.toLowerCase());
    
    // If onlyAvailable is true, only show musicians in availableMusicians
    if (onlyAvailable) {
      return matchesSearch && availableMusicians?.some(m => m.id === musician.id);
    }
    
    return matchesSearch;
  });

  const isLoading = isLoadingMusicians || (onlyAvailable && isLoadingAvailable);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search musicians by name, type or category..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="available-only"
            checked={onlyAvailable}
            onCheckedChange={setOnlyAvailable}
          />
          <Label htmlFor="available-only">Show only available musicians</Label>
        </div>
      </div>

      {categoryIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categoryIds.map(categoryId => (
            <Badge key={categoryId} variant="secondary">
              {getCategoryName(categoryId)}
            </Badge>
          ))}
          <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Available on {new Date().toLocaleDateString()}
          </Badge>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-9 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredMusicians && filteredMusicians.length > 0 ? (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {filteredMusicians.map((musician) => (
            <div 
              key={musician.id} 
              className="flex items-center p-4 border border-gray-200 rounded-md hover:bg-gray-50"
            >
              <div className="flex-shrink-0">
                <Avatar className="h-12 w-12">
                  {musician.profileImage ? (
                    <AvatarImage src={musician.profileImage} alt={musician.name} />
                  ) : (
                    <AvatarFallback>{musician.name.charAt(0).toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{musician.name}</h4>
                    <div className="text-sm text-gray-500">
                      {musician.type} • {getCategoryName(musician.categoryId)}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-400 mr-1" />
                        <span>{musician.rating?.toFixed(1) || 'N/A'}/5</span>
                      </div>
                      <span className="mx-2">•</span>
                      <span>${musician.payRate.toFixed(2)}/hour</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleMusician(musician.id)}
                    >
                      {selectedMusicians.includes(musician.id) ? 'Selected' : 'Select'}
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleInviteMusician(musician.id)}
                      disabled={inviteMusicianMutation.isPending}
                    >
                      Invite
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-md">
          <p className="text-gray-500">
            No musicians found. {onlyAvailable && "Try turning off 'Show only available musicians'."}
          </p>
        </div>
      )}

      {selectedMusicians.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
          <div className="text-sm">
            <span className="font-medium">{selectedMusicians.length}</span> musicians selected
          </div>
          <Button 
            onClick={handleSendAllInvitations}
            disabled={sendAllInvitationsMutation.isPending}
          >
            {sendAllInvitationsMutation.isPending ? 'Sending...' : 'Send All Invitations'}
          </Button>
        </div>
      )}
    </div>
  );
}
