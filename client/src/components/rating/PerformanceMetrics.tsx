import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { PerformanceMetric } from "@shared/schema";

interface PerformanceMetricsProps {
  musicianId: number;
}

export default function PerformanceMetrics({ musicianId }: PerformanceMetricsProps) {
  const queryClient = useQueryClient();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/performance-metrics", musicianId],
    queryFn: async () => {
      const res = await fetch(`/api/performance-metrics/${musicianId}`);
      if (!res.ok) {
        if (res.status === 404) {
          return null;
        }
        throw new Error("Failed to fetch performance metrics");
      }
      return res.json();
    },
  });

  const recalculateMetricsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/performance-metrics/${musicianId}/recalculate`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/performance-metrics", musicianId] });
      toast({
        title: "Metrics updated",
        description: "Performance metrics have been recalculated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to recalculate metrics",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardHeader>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>No performance metrics available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This musician doesn't have any performance ratings yet. Metrics will be calculated automatically after receiving ratings.
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => recalculateMetricsMutation.mutate()}
            disabled={recalculateMetricsMutation.isPending}
          >
            {recalculateMetricsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Calculate Metrics
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getColorClass = (value: number): string => {
    if (value >= 4.5) return "bg-green-500";
    if (value >= 4.0) return "bg-emerald-500";
    if (value >= 3.5) return "bg-blue-500";
    if (value >= 3.0) return "bg-yellow-500";
    if (value >= 2.5) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Based on {metrics.totalRatings} performance {metrics.totalRatings === 1 ? "rating" : "ratings"}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => recalculateMetricsMutation.mutate()}
            disabled={recalculateMetricsMutation.isPending}
            title="Recalculate Metrics"
          >
            {recalculateMetricsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Rating</span>
              <span className="font-medium">{metrics.overallRating ? metrics.overallRating.toFixed(1) : "N/A"}</span>
            </div>
            <Progress
              value={metrics.overallRating ? (metrics.overallRating / 5) * 100 : 0}
              className="h-2"
              indicatorClassName={metrics.overallRating ? getColorClass(metrics.overallRating) : "bg-gray-300"}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Reliability Score</span>
              <span className="font-medium">{metrics.reliabilityScore ? metrics.reliabilityScore.toFixed(1) : "N/A"}</span>
            </div>
            <Progress
              value={metrics.reliabilityScore ? (metrics.reliabilityScore / 5) * 100 : 0}
              className="h-2"
              indicatorClassName={metrics.reliabilityScore ? getColorClass(metrics.reliabilityScore) : "bg-gray-300"}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Technical Skill</span>
              <span className="font-medium">{metrics.technicalScore ? metrics.technicalScore.toFixed(1) : "N/A"}</span>
            </div>
            <Progress
              value={metrics.technicalScore ? (metrics.technicalScore / 5) * 100 : 0}
              className="h-2"
              indicatorClassName={metrics.technicalScore ? getColorClass(metrics.technicalScore) : "bg-gray-300"}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Audience Engagement</span>
              <span className="font-medium">{metrics.engagementScore ? metrics.engagementScore.toFixed(1) : "N/A"}</span>
            </div>
            <Progress
              value={metrics.engagementScore ? (metrics.engagementScore / 5) * 100 : 0}
              className="h-2"
              indicatorClassName={metrics.engagementScore ? getColorClass(metrics.engagementScore) : "bg-gray-300"}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Professionalism</span>
              <span className="font-medium">{metrics.professionalismScore ? metrics.professionalismScore.toFixed(1) : "N/A"}</span>
            </div>
            <Progress
              value={metrics.professionalismScore ? (metrics.professionalismScore / 5) * 100 : 0}
              className="h-2"
              indicatorClassName={metrics.professionalismScore ? getColorClass(metrics.professionalismScore) : "bg-gray-300"}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Last Updated</span>
              <span className="font-medium">
                {metrics.updatedAt ? new Date(metrics.updatedAt).toLocaleDateString() : "Never"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}