import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RevenueDateItem {
  month: string;
  amount: number;
}

interface FinancialSummaryProps {
  data: RevenueDateItem[];
  isLoading: boolean;
}

export default function FinancialSummary({ data, isLoading }: FinancialSummaryProps) {
  const financialData = [
    { label: "Total Revenue (YTD)", value: "$58,450" },
    { label: "Total Payments to Musicians", value: "$38,200" },
    { label: "Pending Collections", value: "$12,350" },
    { label: "Net Profit", value: "$20,250", isProfit: true },
  ];

  return (
    <Card className="bg-white shadow rounded-lg">
      <CardHeader className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Financial Summary
        </h3>
      </CardHeader>
      <CardContent className="px-4 pb-5 sm:px-6 sm:pb-6">
        <div className="space-y-4">
          {/* Revenue Chart */}
          <div className="h-60 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
            {isLoading ? (
              <Skeleton className="w-full h-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, 'Revenue']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar dataKey="amount" name="Revenue" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {/* Payment Summary */}
          <div className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="space-y-3 py-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="py-2 flex justify-between">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : (
              financialData.map((item, index) => (
                <div key={index} className="py-3 flex justify-between">
                  <span className={`text-sm ${index === financialData.length - 1 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                    {item.label}
                  </span>
                  <span className={`text-sm font-medium ${item.isProfit ? 'text-green-600' : 'text-gray-900'}`}>
                    {item.value}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
