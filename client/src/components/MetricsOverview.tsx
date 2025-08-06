import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, MessageSquare, QrCode, Star, TrendingUp, Users, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RealTimeStats {
  totalFeedback: number;
  averageRating: number;
  criticalAlerts: number;
  unreadNotifications: number;
}

interface MetricsOverviewProps {
  realTimeStats?: RealTimeStats;
}

export default function MetricsOverview({ realTimeStats }: MetricsOverviewProps) {
  const tenantId = "a550e8e0-d5e7-4f82-8b9a-123456789012"; // This would come from auth context

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['/api/analytics/metrics', tenantId],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Use real-time stats if available, otherwise fall back to API data
  const displayMetrics = {
    averageRating: realTimeStats?.averageRating || metrics?.averageRating || 0,
    totalResponses: realTimeStats?.totalFeedback || metrics?.totalResponses || 0,
    qrScansToday: metrics?.qrScansToday || 0,
    criticalAlerts: realTimeStats?.criticalAlerts || metrics?.criticalAlerts || 0
  };

  const metricCards = [
    {
      title: "Average Rating",
      value: displayMetrics.averageRating.toFixed(1),
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      suffix: "/5",
      trend: "+0.2 from last week",
      isRealTime: !!realTimeStats?.averageRating
    },
    {
      title: "Total Responses",
      value: displayMetrics.totalResponses.toLocaleString(),
      icon: MessageSquare,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: "+12% from last week",
      isRealTime: !!realTimeStats?.totalFeedback
    },
    {
      title: "QR Scans Today",
      value: displayMetrics.qrScansToday.toLocaleString(),
      icon: QrCode,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: "+8% from yesterday",
      isRealTime: false
    },
    {
      title: "Critical Alerts",
      value: displayMetrics.criticalAlerts.toLocaleString(),
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      trend: displayMetrics.criticalAlerts > 0 ? "Needs attention" : "All good",
      isRealTime: !!realTimeStats?.criticalAlerts
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="transition-all hover:shadow-md" data-testid={`card-metric-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                {metric.title}
                {metric.isRealTime && (
                  <div className="flex items-center gap-1">
                    <Wifi className="h-3 w-3 text-green-500" />
                    <Badge variant="outline" className="text-xs">Live</Badge>
                  </div>
                )}
              </CardTitle>
              <div className={`p-2 rounded-full ${metric.bgColor}`}>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-1">
                <div className="text-2xl font-bold text-gray-900" data-testid={`text-metric-value-${index}`}>
                  {metric.value}
                </div>
                {metric.suffix && (
                  <span className="text-sm text-gray-500">{metric.suffix}</span>
                )}
              </div>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-xs text-gray-500">{metric.trend}</span>
              </div>
              {index === 3 && displayMetrics.criticalAlerts > 0 && (
                <Badge variant="destructive" className="mt-2 text-xs">
                  Action Required
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}