import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PerformanceRating } from "@shared/schema";

interface RatingCardProps {
  musicianId: number;
  bookingId?: number;
  plannerAssignmentId?: number;
  onSave?: () => void;
  onCancel?: () => void;
  readOnly?: boolean;
  initialRating?: PerformanceRating;
}

export default function RatingCard({
  musicianId,
  bookingId,
  plannerAssignmentId,
  onSave,
  onCancel,
  readOnly = false,
  initialRating,
}: RatingCardProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(initialRating?.rating || 5);
  const [comment, setComment] = useState<string>(initialRating?.comment || "");

  useEffect(() => {
    if (initialRating) {
      setRating(initialRating.rating);
      setComment(initialRating.comment || "");
    }
  }, [initialRating]);

  const { data: musician, isLoading: musicianLoading } = useQuery({
    queryKey: ["/api/musicians", musicianId],
    queryFn: async () => {
      const res = await fetch(`/api/musicians/${musicianId}`);
      if (!res.ok) throw new Error("Failed to fetch musician");
      return res.json();
    },
  });

  const createRatingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/performance-ratings", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Rating submitted",
        description: "The musician performance has been rated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/performance-ratings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/performance-metrics", musicianId] });
      if (onSave) onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit rating",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRatingMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/performance-ratings/${initialRating?.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Rating updated",
        description: "The performance rating has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/performance-ratings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/performance-metrics", musicianId] });
      if (onSave) onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update rating",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const ratingData = {
      musicianId,
      bookingId,
      plannerAssignmentId,
      rating,
      comment: comment.trim(),
      ratedAt: new Date().toISOString(),
    };

    if (initialRating?.id) {
      updateRatingMutation.mutate(ratingData);
    } else {
      createRatingMutation.mutate(ratingData);
    }
  };

  if (musicianLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardHeader>
      </Card>
    );
  }

  const renderStars = (value: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= value ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
            } ${!readOnly && "cursor-pointer"}`}
            onClick={() => !readOnly && setRating(star)}
          />
        ))}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={musician?.profileImage || ""} alt={musician?.name} />
            <AvatarFallback>{musician?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{musician?.name}</CardTitle>
            <CardDescription>{musician?.type}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Performance Rating</Label>
            {readOnly ? (
              renderStars(rating)
            ) : (
              <>
                <div className="flex items-center justify-between">
                  {renderStars(rating)}
                  <span className="text-2xl font-bold">{rating}</span>
                </div>
                <Slider
                  value={[rating]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={(value) => setRating(value[0])}
                  className="my-2"
                />
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comments</Label>
            {readOnly ? (
              <p className="text-sm text-gray-500 mt-1">{comment || "No comments provided."}</p>
            ) : (
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts on the musician's performance..."
                className="min-h-[100px]"
              />
            )}
          </div>

          {!readOnly && (
            <div className="flex justify-end gap-2 mt-4">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={createRatingMutation.isPending || updateRatingMutation.isPending}
              >
                {(createRatingMutation.isPending || updateRatingMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {initialRating?.id ? "Update Rating" : "Submit Rating"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}