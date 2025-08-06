import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";
import MetricsOverview from "@/components/MetricsOverview";
import FeedbackChart from "@/components/FeedbackChart";
import RecentAlerts from "@/components/RecentAlerts";
import RecentFeedback from "@/components/RecentFeedback";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useWebSocket, WebSocketEvent } from "@/hooks/useWebSocket";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Bell, Wifi, WifiOff } from "lucide-react";

export default function Dashboard() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { toast } = useToast();
  const [selectedView, setSelectedView] = useState('dashboard');
  const [realTimeStats, setRealTimeStats] = useState({
    totalFeedback: 0,
    averageRating: 0,
    criticalAlerts: 0,
    unreadNotifications: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // WebSocket connection for real-time updates
  const { isConnected: wsConnected, connectionError } = useWebSocket({
    tenantId,
    userId: 'current-user', // This would come from auth context
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Real-time updates are temporarily unavailable",
        variant: "destructive",
      });
    }
  });

  // Initialize audio for notification sounds
  useEffect(() => {
    audioRef.current = new Audio('/notification-sound.mp3'); // You'll need to add this audio file
    audioRef.current.volume = 0.5;
  }, []);

  function handleWebSocketMessage(event: WebSocketEvent) {
    console.log('Received WebSocket message:', event);

    switch (event.type) {
      case 'feedback':
        handleNewFeedback(event.data);
        break;
      case 'alert':
        handleNewAlert(event.data);
        break;
      case 'analytics':
        handleAnalyticsUpdate(event.data);
        break;
      case 'system':
        handleSystemMessage(event.data);
        break;
    }
  }

  function handleNewFeedback(feedback: any) {
    // Update real-time stats
    setRealTimeStats(prev => ({
      ...prev,
      totalFeedback: prev.totalFeedback + 1,
      averageRating: calculateNewAverage(prev.averageRating, prev.totalFeedback, feedback.overallRating)
    }));

    // Show toast notification
    const severity = feedback.overallRating <= 2 ? 'critical' : feedback.overallRating <= 3 ? 'warning' : 'info';
    toast({
      title: "New Feedback Received",
      description: `${feedback.customerName} gave ${feedback.overallRating}/5 stars`,
      variant: severity === 'critical' ? 'destructive' : severity === 'warning' ? 'default' : 'secondary',
    });

    // Play sound for critical feedback
    if (severity === 'critical' && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  }

  function handleNewAlert(alert: any) {
    // Update alert count
    setRealTimeStats(prev => ({
      ...prev,
      criticalAlerts: prev.criticalAlerts + (alert.severity === 'critical' ? 1 : 0),
      unreadNotifications: prev.unreadNotifications + 1
    }));

    // Show toast notification
    toast({
      title: alert.title || "New Alert",
      description: alert.message,
      variant: alert.severity === 'critical' ? 'destructive' : 'default',
    });

    // Play sound for critical alerts
    if (alert.severity === 'critical' && audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  }

  function handleAnalyticsUpdate(analytics: any) {
    // Update real-time analytics
    setRealTimeStats(prev => ({
      ...prev,
      totalFeedback: analytics.totalFeedback || prev.totalFeedback,
      averageRating: analytics.averageRating || prev.averageRating
    }));
  }

  function handleSystemMessage(message: any) {
    console.log('System message:', message);
    // Handle system messages like maintenance notifications, etc.
  }

  function calculateNewAverage(currentAvg: number, currentCount: number, newRating: number): number {
    const totalRating = currentAvg * currentCount + newRating;
    const newCount = currentCount + 1;
    return Math.round((totalRating / newCount) * 10) / 10; // Round to 1 decimal place
  }

  // Poll for real-time stats when WebSocket is not available
  useEffect(() => {
    if (!wsConnected) {
      const interval = setInterval(async () => {
        try {
          // Fetch latest stats from API
          const response = await fetch(`/api/analytics/realtime/${tenantId}`);
          if (response.ok) {
            const data = await response.json();
            setRealTimeStats(data);
          }
        } catch (error) {
          console.error('Error fetching real-time stats:', error);
        }
      }, 30000); // Poll every 30 seconds

      return () => clearInterval(interval);
    }
  }, [wsConnected, tenantId]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Real-time Status Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {wsConnected ? (
                  <Wifi className="w-4 h-4 text-green-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm text-muted-foreground">
                  {wsConnected ? 'Real-time Connected' : 'Real-time Disconnected'}
                </span>
              </div>
              
              {/* Real-time Stats */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <span className="text-muted-foreground">Feedback:</span>
                  <Badge variant="outline">{realTimeStats.totalFeedback}</Badge>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-muted-foreground">Avg Rating:</span>
                  <Badge variant="outline">{realTimeStats.averageRating}/5</Badge>
                </div>
                {realTimeStats.criticalAlerts > 0 && (
                  <div className="flex items-center space-x-1">
                    <Bell className="w-4 h-4 text-red-500" />
                    <Badge variant="destructive">{realTimeStats.criticalAlerts}</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Connection Error Display */}
            {connectionError && (
              <div className="text-sm text-red-600">
                Connection Error: {connectionError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="fixed top-12 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            <Button
              variant={selectedView === 'dashboard' ? "default" : "ghost"}
              className="px-4 py-3 text-sm font-medium rounded-none border-b-2 border-transparent"
              onClick={() => setSelectedView('dashboard')}
            >
              Business Dashboard
            </Button>
            <Link href="/feedback">
              <Button
                variant="ghost"
                className="px-4 py-3 text-sm font-medium rounded-none"
              >
                Customer Feedback (Mobile)
              </Button>
            </Link>
            <Link href="/survey-builder">
              <Button
                variant="ghost"
                className="px-4 py-3 text-sm font-medium rounded-none"
              >
                Survey Builder
              </Button>
            </Link>
            <Link href="/qr-management">
              <Button
                variant="ghost"
                className="px-4 py-3 text-sm font-medium rounded-none"
              >
                QR Management
              </Button>
            </Link>
            <Link href="/alert-management">
              <Button
                variant="ghost"
                className="px-4 py-3 text-sm font-medium rounded-none"
              >
                Alert Management
              </Button>
            </Link>
            <Link href="/notification-preferences">
              <Button
                variant="ghost"
                className="px-4 py-3 text-sm font-medium rounded-none"
              >
                Notifications
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="pt-28">
        <DashboardHeader />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <MetricsOverview realTimeStats={realTimeStats} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <FeedbackChart realTimeData={wsConnected} />
            </div>
            <div>
              <RecentAlerts realTimeUpdates={wsConnected} />
            </div>
          </div>

          <div className="mt-8">
            <RecentFeedback realTimeUpdates={wsConnected} />
          </div>
        </div>
      </div>
    </div>
  );
}
