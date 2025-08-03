import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useEffect } from "react";
import { connectWebSocket } from "@/lib/websocket";

const DEMO_TENANT_ID = "a550e8e0-d5e7-4f82-8b9a-123456789012";

export default function RecentAlerts() {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['/api/alerts', DEMO_TENANT_ID, { limit: 10 }],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return await apiRequest('PATCH', `/api/alerts/${alertId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
    },
  });

  // Connect to WebSocket for real-time alerts
  useEffect(() => {
    const ws = connectWebSocket();
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'alert') {
        // Add new alert to the cache
        queryClient.setQueryData(
          ['/api/alerts', DEMO_TENANT_ID, { limit: 10 }],
          (oldAlerts: any) => [data.data, ...(oldAlerts || [])].slice(0, 10)
        );
      }
    };

    // Send authentication
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', tenantId: DEMO_TENANT_ID }));
    };

    return () => ws.close();
  }, [queryClient]);

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="text-destructive w-4 h-4" />;
      case 'warning':
        return <Clock className="text-warning w-4 h-4" />;
      default:
        return <Info className="text-primary w-4 h-4" />;
    }
  };

  const getAlertBgColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive/10 border-destructive/20';
      case 'warning':
        return 'bg-warning/10 border-warning/20';
      default:
        return 'bg-primary/10 border-primary/20';
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Alerts</span>
            <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-48 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Alerts</span>
          <Button variant="link" size="sm">
            View All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!Array.isArray(alerts) || alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No recent alerts</p>
            </div>
          ) : (
            Array.isArray(alerts) ? alerts.map((alert: any) => (
              <div
                key={alert.id}
                className={`flex items-start space-x-3 p-3 rounded-lg border ${getAlertBgColor(alert.severity)}`}
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/50">
                    {getAlertIcon(alert.severity)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                  <p className="text-sm text-gray-500">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                  {!alert.isRead && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs mt-1"
                      onClick={() => markAsReadMutation.mutate(alert.id)}
                      disabled={markAsReadMutation.isPending}
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </div>
            )) : null
          )}
        </div>
      </CardContent>
    </Card>
  );
}
