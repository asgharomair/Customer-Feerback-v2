import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const DEMO_TENANT_ID = "a550e8e0-d5e7-4f82-8b9a-123456789012";

export default function FeedbackChart() {
  const [timeRange, setTimeRange] = useState(7);

  const { data: trends, isLoading } = useQuery({
    queryKey: ['/api/analytics/trends', DEMO_TENANT_ID, { days: timeRange }],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const chartData = Array.isArray(trends) ? trends.map((trend: any) => ({
    date: new Date(trend.date).toLocaleDateString('en-US', { weekday: 'short' }),
    rating: trend.averageRating,
    responses: trend.responseCount,
  })) : [];

  if (isLoading) {
    return (
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="flex space-x-2">
              {[7, 30, 90].map((days) => (
                <div key={days} className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              ))}
            </div>
          </div>
          <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Feedback Trends</h3>
          <div className="flex space-x-2">
            {[
              { days: 7, label: "7 Days" },
              { days: 30, label: "30 Days" },
              { days: 90, label: "90 Days" },
            ].map(({ days, label }) => (
              <Button
                key={days}
                variant={timeRange === days ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(days)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" domain={[0, 5]} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="rating"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="Average Rating"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="responses"
                stroke="hsl(142.1 70.6% 45.3%)"
                strokeWidth={2}
                name="Response Count"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
