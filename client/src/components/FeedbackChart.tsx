import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { CalendarDays, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function FeedbackChart() {
  const [timeRange, setTimeRange] = useState(7);
  const tenantId = "a550e8e0-d5e7-4f82-8b9a-123456789012"; // This would come from auth context

  const { data: trends, isLoading } = useQuery({
    queryKey: ['/api/analytics/trends', tenantId, { days: timeRange }],
    retry: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart
  const chartData = trends?.map(trend => ({
    date: new Date(trend.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    rating: Number(trend.averageRating) || 0,
    responses: trend.responseCount || 0,
  })) || [];

  const averageRating = chartData.length > 0 
    ? (chartData.reduce((sum, item) => sum + item.rating, 0) / chartData.length).toFixed(1)
    : "0.0";

  const totalResponses = chartData.reduce((sum, item) => sum + item.responses, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Feedback Trends
            </CardTitle>
            <CardDescription>
              Average rating and response volume over time
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={timeRange === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(7)}
              data-testid="button-7-days"
            >
              7D
            </Button>
            <Button
              variant={timeRange === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(30)}
              data-testid="button-30-days"
            >
              30D
            </Button>
            <Button
              variant={timeRange === 90 ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(90)}
              data-testid="button-90-days"
            >
              90D
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Period Average</p>
              <p className="text-lg font-semibold" data-testid="text-average-rating">
                {averageRating}/5.0
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-500">Total Responses</p>
              <p className="text-lg font-semibold" data-testid="text-total-responses">
                {totalResponses.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No data available</p>
              <p className="text-sm">Feedback trends will appear here once you start collecting responses</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Rating Trend Line Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Average Rating Trend</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    stroke="#e5e7eb"
                  />
                  <YAxis 
                    domain={[0, 5]}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    stroke="#e5e7eb"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}/5`, 'Rating']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rating" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Response Volume Bar Chart */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Response Volume</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    stroke="#e5e7eb"
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    stroke="#e5e7eb"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number) => [value, 'Responses']}
                  />
                  <Bar 
                    dataKey="responses" 
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}