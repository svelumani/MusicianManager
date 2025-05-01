import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Loader2, Star } from "lucide-react";
import RatingCard from "@/components/rating/RatingCard";
import SkillTagList from "@/components/rating/SkillTagList";
import PerformanceMetrics from "@/components/rating/PerformanceMetrics";
import ImprovementPlan from "@/components/rating/ImprovementPlan";

export default function MusicianPerformance() {
  const [, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const musicianId = parseInt(id);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: musician, isLoading } = useQuery({
    queryKey: ["/api/musicians", musicianId],
    queryFn: async () => {
      const res = await fetch(`/api/musicians/${musicianId}`);
      if (!res.ok) throw new Error("Failed to fetch musician");
      return res.json();
    },
  });

  const { data: ratings, isLoading: ratingsLoading } = useQuery({
    queryKey: ["/api/performance-ratings", { musicianId }],
    queryFn: async () => {
      const res = await fetch(`/api/performance-ratings?musicianId=${musicianId}`);
      if (!res.ok) throw new Error("Failed to fetch ratings");
      return res.json();
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
          <p className="text-muted-foreground">{musician.type}</p>
        </div>
        <div className="flex items-center gap-1">
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          <span className="text-2xl font-bold">{musician.rating?.toFixed(1) || "N/A"}</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="improvement">Improvement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <PerformanceMetrics musicianId={musicianId} />
            </div>
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Performance summary and stats</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">Total Performances</p>
                      <p className="text-2xl font-bold">{ratings?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Last Performance</p>
                      <p className="text-lg">
                        {ratings && ratings.length > 0 
                          ? new Date(ratings[0].ratedAt).toLocaleDateString() 
                          : "No performances yet"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Skills & Expertise</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <SkillTagList musicianId={musicianId} readOnly />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Latest Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  {ratingsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : ratings && ratings.length > 0 ? (
                    <RatingCard musicianId={musicianId} readOnly initialRating={ratings[0]} />
                  ) : (
                    <p className="text-muted-foreground italic">No ratings yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ratings" className="pt-4">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Performance Ratings</h3>
              <Button onClick={() => {
                document.getElementById("new-rating-section")?.scrollIntoView({ behavior: "smooth" });
              }}>
                Add New Rating
              </Button>
            </div>
            
            {ratingsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : ratings && ratings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ratings.map((rating: any) => (
                  <Card key={rating.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">
                          {rating.bookingId 
                            ? "Event Performance" 
                            : rating.plannerAssignmentId 
                              ? "Monthly Planner Assignment" 
                              : "General Rating"}
                        </CardTitle>
                        <span className="text-sm text-muted-foreground">
                          {new Date(rating.ratedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <RatingCard musicianId={musicianId} readOnly initialRating={rating} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-muted-foreground">No ratings have been provided yet.</p>
                </CardContent>
              </Card>
            )}
            
            <div id="new-rating-section" className="pt-6 space-y-4">
              <h3 className="text-lg font-medium">Add New Rating</h3>
              <Card>
                <CardContent className="pt-6">
                  <RatingCard musicianId={musicianId} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="pt-4">
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <SkillTagList musicianId={musicianId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="improvement" className="pt-4">
          <ImprovementPlan musicianId={musicianId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}