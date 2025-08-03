import { useQuery } from "@tanstack/react-query";
import { Star, MessageSquare, AlertTriangle, QrCode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const DEMO_TENANT_ID = "a550e8e0-d5e7-4f82-8b9a-123456789012";

export default function MetricsOverview() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['/api/analytics/metrics', DEMO_TENANT_ID],
    refetchInterval: 60000, // Refresh every minute
  });

  const metricCards = [
    {
      title: "Average Rating",
      value: (metrics && typeof metrics === 'object' && 'averageRating' in metrics && typeof metrics.averageRating === 'number') ? metrics.averageRating.toFixed(1) : "0.0",
      icon: Star,
      bgColor: "bg-primary-100",
      iconColor: "text-primary-600",
      change: "+0.3",
      changeLabel: "vs last month",
      changeColor: "text-success-600"
    },
    {
      title: "Total Responses",
      value: (metrics && typeof metrics === 'object' && 'totalResponses' in metrics && typeof metrics.totalResponses === 'number') ? metrics.totalResponses.toLocaleString() : "0",
      icon: MessageSquare,
      bgColor: "bg-success-100",
      iconColor: "text-success-600",
      change: "+12%",
      changeLabel: "vs last month",
      changeColor: "text-success-600"
    },
    {
      title: "Critical Alerts",
      value: (metrics && typeof metrics === 'object' && 'criticalAlerts' in metrics) ? String(metrics.criticalAlerts) : "0",
      icon: AlertTriangle,
      bgColor: "bg-warning-100",
      iconColor: "text-warning-600",
      change: "Needs attention",
      changeLabel: "",
      changeColor: "text-destructive"
    },
    {
      title: "QR Scans Today",
      value: (metrics && typeof metrics === 'object' && 'qrScansToday' in metrics) ? String(metrics.qrScansToday) : "0",
      icon: QrCode,
      bgColor: "bg-primary-100",
      iconColor: "text-primary-600",
      change: "+8%",
      changeLabel: "vs yesterday",
      changeColor: "text-success-600"
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metricCards.map((metric, index) => (
        <Card key={index} className="shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-8 h-8 ${metric.bgColor} rounded-lg flex items-center justify-center`}>
                <metric.icon className={`${metric.iconColor} w-4 h-4`} />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">{metric.title}</div>
                <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm">
                <span className={`${metric.changeColor} font-medium`}>{metric.change}</span>
                {metric.changeLabel && <span className="text-gray-500 ml-1">{metric.changeLabel}</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
