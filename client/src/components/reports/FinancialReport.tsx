import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

interface FinancialReportProps {
  filters: {
    dateRange: string;
    startDate: Date | null;
    endDate: Date | null;
    groupBy: string;
    chartType: "bar" | "line" | "pie";
    showTables: boolean;
  };
  metricsData: any;
  dateRangeDisplay: string;
}

export default function FinancialReport({ filters, metricsData, dateRangeDisplay }: FinancialReportProps) {
  // These would normally come from the API based on the filters
  const revenueData = metricsData.revenueData || [
    { month: "Jan", amount: 5000 },
    { month: "Feb", amount: 7500 },
    { month: "Mar", amount: 6800 },
    { month: "Apr", amount: 9200 },
    { month: "May", amount: 8100 },
    { month: "Jun", amount: 11500 }
  ];

  const expenseData = [
    { category: "Musician Payments", value: 38000 },
    { category: "Venue Fees", value: 15000 },
    { category: "Marketing", value: 5000 },
    { category: "Equipment", value: 8000 },
    { category: "Admin", value: 4000 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const financialSummary = [
    { metric: "Total Revenue", value: "$70,100" },
    { metric: "Total Expenses", value: "$50,000" },
    { metric: "Net Profit", value: "$20,100" },
    { metric: "Profit Margin", value: "28.7%" },
    { metric: "Outstanding Payments", value: "$12,350" }
  ];

  const cashflowData = [
    { month: "Jan", income: 12000, expenses: 8000, profit: 4000 },
    { month: "Feb", income: 15000, expenses: 10000, profit: 5000 },
    { month: "Mar", income: 18000, expenses: 12000, profit: 6000 },
    { month: "Apr", income: 20000, expenses: 13000, profit: 7000 },
    { month: "May", income: 22000, expenses: 15000, profit: 7000 },
    { month: "Jun", income: 25000, expenses: 17000, profit: 8000 }
  ];

  // Render the chart based on the selected chart type
  const renderChart = () => {
    switch (filters.chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={revenueData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
              <Legend />
              <Bar dataKey="amount" name="Revenue" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={revenueData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
              <Legend />
              <Line type="monotone" dataKey="amount" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={expenseData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                nameKey="category"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {expenseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center justify-between">
            <span>Financial Overview - {dateRangeDisplay}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            {renderChart()}
          </div>

          {filters.showTables && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Financial Summary</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialSummary.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.metric}</TableCell>
                        <TableCell className="text-right font-medium">{item.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={cashflowData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, '']} />
                <Legend />
                <Bar dataKey="income" name="Revenue" fill="#4ade80" />
                <Bar dataKey="expenses" name="Expenses" fill="#f87171" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="category"
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {filters.showTables && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashflowData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.month}</TableCell>
                      <TableCell className="text-right">${item.income.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${item.expenses.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">${item.profit.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {((item.profit / item.income) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}