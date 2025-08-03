import { useState } from "react";
import { useLocation } from "wouter";
import { Building, Users, MapPin, QrCode, Palette, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingLanding() {
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Building,
      title: "Company Information",
      description: "Legal name, brand details, industry selection, and business description",
      items: ["Legal company name", "Brand name & slogan", "Industry selection", "Business nature"]
    },
    {
      icon: Users,
      title: "Contact Details",
      description: "Primary contact information and authorized users",
      items: ["Primary contact info", "Contact position", "Authorized emails", "Access management"]
    },
    {
      icon: MapPin,
      title: "Location Management",
      description: "Business addresses and branch locations",
      items: ["Main business address", "Multiple branch locations", "Contact details per location", "Geographic coverage"]
    },
    {
      icon: Palette,
      title: "Brand Customization",
      description: "Logo, colors, and visual identity",
      items: ["Company logo upload", "Brand color palette", "Custom styling", "Personalized frontend"]
    },
    {
      icon: QrCode,
      title: "QR Code Generation",
      description: "Instant QR codes for feedback collection",
      items: ["Location-specific QR codes", "Customized feedback links", "Download & print ready", "Real-time analytics"]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/10">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6">
              Welcome to Your Feedback Platform
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Set up your complete customer feedback management system in minutes. 
              Capture every detail about your business and start collecting valuable feedback immediately.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => setLocation("/company-onboarding")}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg"
              >
                Start Company Setup
                <Building className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => setLocation("/dashboard")}
                className="px-8 py-4 text-lg"
              >
                View Demo Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Comprehensive Company Onboarding
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Our onboarding process captures every detail needed to create a customized feedback management system for your business.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <feature.icon className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </div>
                <p className="text-gray-600">{feature.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Setup Process */}
      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple 6-Step Setup Process
            </h2>
            <p className="text-lg text-gray-600">
              Get your feedback system up and running in under 10 minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { step: 1, title: "Company Details", desc: "Legal name, brand info, industry" },
              { step: 2, title: "Contact Information", desc: "Primary contact and team details" },
              { step: 3, title: "Business Address", desc: "Main location and addresses" },
              { step: 4, title: "Digital Presence", desc: "Website and social media links" },
              { step: 5, title: "Brand Customization", desc: "Logo, colors, and styling" },
              { step: 6, title: "Access Management", desc: "Team emails and permissions" }
            ].map((step, index) => (
              <div key={index} className="relative">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-600">{step.desc}</p>
                  </div>
                </div>
                {index < 5 && (
                  <div className="hidden lg:block absolute top-5 left-full w-full">
                    <div className="w-full h-0.5 bg-primary/20"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Why Complete Onboarding?
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Customized Frontend</h3>
                    <p className="text-gray-600">Each company gets a personalized feedback interface matching your brand</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Instant QR Codes</h3>
                    <p className="text-gray-600">Generate QR codes for each location immediately after setup</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Team Access Control</h3>
                    <p className="text-gray-600">Manage who can access reports and dashboard features</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Industry-Specific Templates</h3>
                    <p className="text-gray-600">Pre-built survey templates tailored to your industry</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Ready to Get Started?</h3>
              <p className="text-gray-600 mb-6">
                Join thousands of businesses already collecting valuable customer feedback with our platform.
              </p>
              <Button 
                onClick={() => setLocation("/company-onboarding")}
                className="w-full bg-primary hover:bg-primary/90 text-white py-3"
                size="lg"
              >
                Begin Company Setup
                <Building className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-sm text-gray-500 mt-4 text-center">
                Setup takes less than 10 minutes • No credit card required
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}