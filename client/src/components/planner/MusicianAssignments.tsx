import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import GenerateContractButton from "./GenerateContractButton";
import { CalendarIcon } from "lucide-react";

interface MusicianAssignmentsProps {
  plannerId: number;
  plannerName: string;
  month: number;
  year: number;
}

const MusicianAssignments = ({ plannerId, plannerName, month, year }: MusicianAssignmentsProps) => {
  const [openMusicians, setOpenMusicians] = useState<string[]>([]);

  // Format month name
  const monthName = format(new Date(year, month - 1), "MMMM");

  // Query to get assignments grouped by musician
  const {
    data: musicianAssignments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/planner-assignments/by-musician', plannerId],
    queryFn: async () => {
      return await apiRequest(`/api/planner-assignments/by-musician?plannerId=${plannerId}`);
    },
    enabled: !!plannerId && plannerId > 0,
  });

  // Handle accordion toggling
  const handleAccordionChange = (value: string[]) => {
    setOpenMusicians(value);
  };

  // Check if we have real data or just the error placeholder
  const hasRealData = musicianAssignments && 
                     Object.entries(musicianAssignments)
                       .filter(([key]) => !key.startsWith('_') && key !== '999')
                       .length > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Musician Assignments</span>
        </CardTitle>
        <CardDescription>
          View and manage musicians assigned to this planner
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">
            Error loading musician assignments
          </div>
        ) : !hasRealData ? (
          <div className="text-center py-4 text-gray-500">
            No musician assignments for this month
          </div>
        ) : (
          <Accordion 
            type="multiple" 
            className="w-full" 
            value={openMusicians}
            onValueChange={handleAccordionChange}
          >
            {Object.entries(musicianAssignments)
              .filter(([key]) => !key.startsWith('_') && key !== '999')
              .map(([musicianId, data]: [string, any]) => (
                <AccordionItem key={musicianId} value={musicianId}>
                  <AccordionTrigger className="hover:bg-gray-50 px-4 rounded-lg">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        <span>{data.musicianName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {data.assignments?.length || 0} dates
                        </Badge>
                        <Badge variant="secondary">
                          ${(data.totalFee || 0).toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <div className="space-y-4">
                      <div className="pt-2 flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          {data.assignments?.length || 0} performances scheduled
                        </div>
                        <GenerateContractButton
                          plannerId={plannerId}
                          plannerName={plannerName}
                          plannerMonth={monthName}
                          plannerYear={year}
                          musicianId={parseInt(musicianId)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        {Array.isArray(data.assignments) && data.assignments.map((assignment: any) => (
                          <div 
                            key={assignment.id} 
                            className="border rounded-md p-3 flex justify-between items-center"
                          >
                            <div>
                              <div className="font-medium">
                                {format(new Date(assignment.date), "EEEE, MMMM d, yyyy")}
                              </div>
                              <div className="text-sm text-gray-500">
                                {assignment.venueName} • {assignment.time || "Time not specified"}
                              </div>
                            </div>
                            <div className="font-medium text-primary">
                              ${(assignment.actualFee || assignment.fee || 0).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default MusicianAssignments;