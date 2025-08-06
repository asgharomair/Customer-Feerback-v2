import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, Check, Clock, Eye } from "lucide-react";
import { connectWebSocket, sendWebSocketMessage } from "@/lib/websocket";
import { apiRequest } from "@/lib/queryClient";

export default function RecentAlerts() {
  const [realTimeAlerts, setRealTimeAlerts] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const tenantId = "a550e8e0-d5e7-4f82-8b9a-123456789012"; // This would come from auth context

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['/api/alerts', tenantId],
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false,
  });

  // Setup WebSocket connection for real-time alerts
  useEffect(() => {
    const ws = connectWebSocket();
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'alert') {
          setRealTimeAlerts(prev => [message.data, ...prev.slice(0, 4)]);
          // Invalidate alerts query to refresh data
          queryClient.invalidateQueries({ queryKey: ['/api/alerts', tenantId] });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    // Authenticate WebSocket connection
    ws.onopen = () => {
      sendWebSocketMessage({ type: 'auth', tenantId });
    };

    return () => {
      ws.close();
    };
  }, [tenantId, queryClient]);

  const markAsRead = async (alertId: string) => {
    try {
      await apiRequest(`/api/alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isRead: true }),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', tenantId] });
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const acknowledge = async (alertId: string) => {
    try {
      await apiRequest(`/api/alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          isAcknowledged: true,
          acknowledgedAt: new Date().toISOString() 
        }),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts', tenantId] });
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse border rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Combine real-time alerts with existing alerts
  const combinedAlerts = [...realTimeAlerts, ...(Array.isArray(alerts) ? alerts : [])].slice(0, 10);
  const unreadCount = combinedAlerts.filter((alert: any) => !alert.isRead).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return AlertTriangle;
      case 'warning':
        return Clock;
      default:
        return Bell;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-600" />
            Recent Alerts
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {combinedAlerts.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No alerts</p>
            <p className="text-sm text-gray-400">All systems running smoothly</p>
          </div>
        ) : (
          <div className="space-y-4">
            {combinedAlerts.map((alert, index) => {
              const SeverityIcon = getSeverityIcon(alert.severity);
              return (
                <div
                  key={alert.id || index}
                  className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                    !alert.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white'
                  }`}
                  data-testid={`alert-${index}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-1 rounded-full ${
                        alert.severity === 'critical' ? 'bg-red-100' :
                        alert.severity === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        <SeverityIcon className={`h-4 w-4 ${
                          alert.severity === 'critical' ? 'text-red-600' :
                          alert.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 truncate">
                            {alert.title}
                          </h4>
                          <Badge variant={getSeverityColor(alert.severity)} className="text-xs">
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {new Date(alert.createdAt).toLocaleString()}
                          </span>
                          {alert.isAcknowledged && (
                            <Badge variant="outline" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Acknowledged
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {!alert.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(alert.id)}
                          data-testid={`button-mark-read-${index}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {!alert.isAcknowledged && alert.severity === 'critical' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => acknowledge(alert.id)}
                          data-testid={`button-acknowledge-${index}`}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Ack
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {combinedAlerts.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="outline" size="sm" data-testid="button-view-all-alerts">
              View All Alerts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}