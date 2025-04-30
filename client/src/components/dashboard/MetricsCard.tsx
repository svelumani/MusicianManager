import { ReactNode } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricsCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  iconBgColor: string;
  iconColor: string;
  link: string;
  isLoading?: boolean;
}

export default function MetricsCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  link,
  isLoading = false,
}: MetricsCardProps) {
  return (
    <Card className="bg-white overflow-hidden shadow rounded-lg">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${iconBgColor} rounded-md p-3`}>
            <div className={iconColor}>{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <div className="text-lg font-semibold text-gray-900">
                    {value.toLocaleString()}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      <div className="bg-gray-50 px-5 py-3">
        <div className="text-sm">
          <Link href={link}>
            <a className="font-medium text-primary-600 hover:text-primary-500">
              View all
            </a>
          </Link>
        </div>
      </div>
    </Card>
  );
}
