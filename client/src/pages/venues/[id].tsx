import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash, Edit, ArrowLeft, Star } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Venue } from "@shared/schema";

export default function VenueDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch venue details
  const { data: venue, isLoading } = useQuery<Venue>({
    queryKey: [`/api/venues/${id}`],
  });

  // Delete venue mutation
  const deleteVenueMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/venues/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Venue deleted",
        description: "The venue has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      navigate("/venues");
    },
    onError: (error) => {
      toast({
        title: "Failed to delete venue",
        description: error.message || "An error occurred while deleting the venue",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    setIsDeleteDialogOpen(false);
    deleteVenueMutation.mutate();
  };

  const handleEdit = () => {
    navigate(`/venues/edit/${id}`);
  };

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">Venue not found</h2>
        <p className="mt-2 text-gray-600">The venue you're looking for doesn't exist or has been removed.</p>
        <Button className="mt-4" onClick={() => navigate("/venues")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Venues
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => navigate("/venues")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{venue.name}</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Venue Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-gray-500">Location</h3>
                <p>{venue.location}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-500">Address</h3>
                <p>{venue.address}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-500">Description</h3>
                <p>{venue.description || "No description available"}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-500">Opening Hours</h3>
                <p>{venue.openingHours || "Not specified"}</p>
              </div>
              {venue.venuePictures && venue.venuePictures.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-sm text-gray-500 mb-2">Photos</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {venue.venuePictures.map((pic, index) => (
                      <div key={index} className="rounded-md overflow-hidden h-40">
                        <img
                          src={pic}
                          alt={`${venue.name} - ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Pax Count:</span>
                <span className="font-medium">{venue.paxCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Capacity:</span>
                <span className="font-medium">{venue.capacity || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hourly Rate:</span>
                <span className="font-medium">
                  {venue.hourlyRate ? `$${venue.hourlyRate.toFixed(2)}` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Rating:</span>
                <span className="font-medium flex items-center">
                  {venue.rating ? (
                    <>
                      {venue.rating.toFixed(1)}
                      <Star className="h-4 w-4 ml-1 text-yellow-500" />
                    </>
                  ) : (
                    "N/A"
                  )}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-gray-500 py-4">No upcoming events</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the venue <strong>{venue.name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}