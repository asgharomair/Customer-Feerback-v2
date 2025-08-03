import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import SurveyBuilder from "@/components/SurveyBuilder";

export default function SurveyBuilderPage() {
  const [selectedView, setSelectedView] = useState('survey-builder');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Tabs */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            <Link href="/">
              <Button
                variant="ghost"
                className="px-4 py-3 text-sm font-medium rounded-none"
              >
                Business Dashboard
              </Button>
            </Link>
            <Link href="/feedback">
              <Button
                variant="ghost"
                className="px-4 py-3 text-sm font-medium rounded-none"
              >
                Customer Feedback (Mobile)
              </Button>
            </Link>
            <Button
              variant={selectedView === 'survey-builder' ? "default" : "ghost"}
              className="px-4 py-3 text-sm font-medium rounded-none border-b-2 border-transparent"
              onClick={() => setSelectedView('survey-builder')}
            >
              Survey Builder
            </Button>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SurveyBuilder />
        </div>
      </div>
    </div>
  );
}
