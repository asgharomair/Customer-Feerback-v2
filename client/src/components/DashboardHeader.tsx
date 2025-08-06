import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Building, MapPin, QrCode, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function DashboardHeader() {
  const [selectedTenant] = useState("a550e8e0-d5e7-4f82-8b9a-123456789012"); // This would come from auth context

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['/api/tenants', selectedTenant],
    retry: false,
  });

  const { data: alerts } = useQuery({
    queryKey: ['/api/alerts', selectedTenant],
    retry: false,
  });

  const unreadAlerts = Array.isArray(alerts) ? alerts.filter((alert: any) => !alert.isRead)?.length || 0 : 0;

  if (isLoading) {
    return (
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
            </div>
            <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {tenant?.logoUrl && (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={tenant.logoUrl} alt={tenant.brandName || 'Logo'} />
                  <AvatarFallback>
                    {tenant.brandName?.charAt(0)?.toUpperCase() || 'B'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {tenant?.brandName || "Dashboard"}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Building className="h-4 w-4" />
                  <span>{tenant?.industry || "Business"}</span>
                  <Badge variant="outline" className="text-xs">
                    {tenant?.subscription || "Free"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <Link href="/branch-management">
                <Button variant="outline" size="sm" data-testid="button-locations">
                  <MapPin className="h-4 w-4 mr-2" />
                  Locations
                </Button>
              </Link>
              <Link href="/qr-management">
                <Button variant="outline" size="sm" data-testid="button-qr-codes">
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Codes
                </Button>
              </Link>
            </div>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="relative" data-testid="button-notifications">
                  <Bell className="h-4 w-4" />
                  {unreadAlerts > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                      {unreadAlerts}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Array.isArray(alerts) && alerts.slice(0, 5).map((alert: any) => (
                  <DropdownMenuItem key={alert.id} className="flex-col items-start p-4">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{alert.title}</span>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{alert.message}</p>
                    <span className="text-xs text-gray-400 mt-2">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </span>
                  </DropdownMenuItem>
                ))}
                {(!Array.isArray(alerts) || alerts.length === 0) && (
                  <DropdownMenuItem disabled>No new notifications</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full" data-testid="button-user-menu">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" alt="User" />
                    <AvatarFallback>
                      <Users className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}