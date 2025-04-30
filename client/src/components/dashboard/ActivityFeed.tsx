import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Activity } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Check, Plus, User } from "lucide-react";

// Helper function to get an icon based on the action type
const getActionIcon = (action: string) => {
  switch(action) {
    case 'Created':
      return <Plus className="text-white" />;
    case 'Accepted':
    case 'ContractSigned':
      return <Check className="text-white" />;
    case 'Invited':
    case 'Payment':
      return <User className="text-white" />;
    default:
      return <Plus className="text-white" />;
  }
};

// Helper function to get a background color based on the action type
const getActionBgColor = (action: string) => {
  switch(action) {
    case 'Created':
      return 'bg-primary-600';
    case 'Accepted':
    case 'ContractSigned':
      return 'bg-gray-400';
    case 'Invited':
      return 'bg-primary-600';
    case 'Payment':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-400';
  }
};

// Helper function to format the activity message
const formatActivityMessage = (activity: Activity) => {
  const { action, entityType, details } = activity;
  
  switch(action) {
    case 'Created':
      if (entityType === 'Event') {
        return <>created a new event <span className="font-medium text-gray-900">{details?.event}</span></>;
      } else if (entityType === 'Musician') {
        return <>onboarded a new musician <span className="font-medium text-gray-900">{details?.musician}</span></>;
      }
      return <>created a new {entityType.toLowerCase()}</>;
    
    case 'Invited':
      return <>invited a musician to event ID: <span className="font-medium text-gray-900">#{details?.eventId}</span></>;
    
    case 'Accepted':
      return <>accepted invitation for event ID: <span className="font-medium text-gray-900">#{details?.eventId}</span></>;
    
    case 'ContractSigned':
      return <>signed the contract for event ID: <span className="font-medium text-gray-900">#{details?.eventId}</span></>;
    
    case 'Payment':
      return <>recorded payment of <span className="font-medium text-gray-900">${details?.amount}</span> for booking</>;
    
    default:
      return <>performed action: {action}</>;
  }
};

interface ActivityFeedProps {
  activities: Activity[];
  isLoading: boolean;
}

export default function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  return (
    <Card className="bg-white shadow rounded-lg">
      <CardHeader className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Recent Activity
        </h3>
      </CardHeader>
      <CardContent className="px-4 pb-5 sm:px-6 sm:pb-6">
        <div className="mt-2 flow-root">
          {isLoading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <ul className="-mb-8">
              {activities.map((activity, idx) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {idx < activities.length - 1 && (
                      <span 
                        className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" 
                        aria-hidden="true"
                      ></span>
                    )}
                    <div className="relative flex items-start space-x-3">
                      <div className="relative">
                        <div className={`h-10 w-10 rounded-full ${getActionBgColor(activity.action)} flex items-center justify-center ring-8 ring-white`}>
                          {getActionIcon(activity.action)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">Admin</span>
                            {" "}{formatActivityMessage(activity)}
                          </div>
                          <p className="mt-0.5 text-sm text-gray-500">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No recent activities</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
