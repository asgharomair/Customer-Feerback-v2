import { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import MetricsOverview from "@/components/MetricsOverview";
import FeedbackChart from "@/components/FeedbackChart";
import RecentAlerts from "@/components/RecentAlerts";
import RecentFeedback from "@/components/RecentFeedback";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Dashboard() {
  const [selectedView, setSelectedView] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Tabs */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
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
                QR Code Management
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="pt-16">
        <DashboardHeader />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <MetricsOverview />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <FeedbackChart />
            </div>
            <div>
              <RecentAlerts />
            </div>
          </div>

          <div className="mt-8">
            <RecentFeedback />
          </div>
        </div>
      </div>
    </div>
  );
}
