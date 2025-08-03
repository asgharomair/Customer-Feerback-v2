import { useQuery } from "@tanstack/react-query";
import { Bell, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DEMO_TENANT_ID = "a550e8e0-d5e7-4f82-8b9a-123456789012";

export default function DashboardHeader() {
  const { data: tenant } = useQuery({
    queryKey: ['/api/tenants', DEMO_TENANT_ID],
  });

  const { data: alerts } = useQuery({
    queryKey: ['/api/alerts', DEMO_TENANT_ID],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadAlerts = Array.isArray(alerts) ? alerts.filter((alert: any) => !alert.isRead) : [];

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <MessageSquare className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FeedbackPlatform</h1>
              <p className="text-sm text-gray-500">
                {tenant && typeof tenant === 'object' && 'companyName' in tenant ? tenant.companyName : "Demo Restaurant"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Real-time Alert Badge */}
            <div className="relative">
              <Button variant="ghost" size="sm" className="p-2">
                <Bell size={20} />
                {unreadAlerts.length > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadAlerts.length}
                  </Badge>
                )}
              </Button>
            </div>
            
            <div className="flex items-center space-x-3">
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&h=100" 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-sm font-medium text-gray-700">John Doe</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
