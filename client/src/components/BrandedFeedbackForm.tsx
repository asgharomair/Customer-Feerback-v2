import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MobileFeedbackForm from "./MobileFeedbackForm";

interface BrandedFeedbackFormProps {
  tenantId: string;
  locationId: string;
  qrCodeId?: string;
  surveyTemplateId?: string;
}

// Component that creates a branded feedback form based on company branding
export default function BrandedFeedbackForm({ 
  tenantId, 
  locationId, 
  qrCodeId, 
  surveyTemplateId 
}: BrandedFeedbackFormProps) {
  const { data: tenant } = useQuery({
    queryKey: [`/api/tenants/${tenantId}`],
  });

  const { data: location } = useQuery({
    queryKey: [`/api/locations/${locationId}`],
  });

  // Apply custom branding styles when tenant data loads
  useEffect(() => {
    if (tenant?.brandColors) {
      const root = document.documentElement;
      root.style.setProperty('--primary', tenant.brandColors.primary || '#3b82f6');
      root.style.setProperty('--secondary', tenant.brandColors.secondary || '#e5e7eb');
      root.style.setProperty('--background', tenant.brandColors.background1 || '#ffffff');
      root.style.setProperty('--card', tenant.brandColors.background2 || '#f8f9fa');
      root.style.setProperty('--foreground', tenant.brandColors.text1 || '#000000');
      root.style.setProperty('--muted-foreground', tenant.brandColors.text2 || '#6b7280');
    }
  }, [tenant]);

  if (!tenant || !location) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ 
          background: `linear-gradient(135deg, ${tenant?.brandColors?.background1 || '#f8f9fa'} 0%, ${tenant?.brandColors?.background2 || '#e5e7eb'} 100%)` 
        }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Loading feedback form...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(135deg, ${tenant.brandColors?.background1 || '#ffffff'} 0%, ${tenant.brandColors?.background2 || '#f8f9fa'} 100%)`
      }}
    >
      {/* Branded Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            {tenant.logoUrl && (
              <img
                src={tenant.logoUrl}
                alt={`${tenant.brandName} logo`}
                className="h-12 w-auto object-contain"
              />
            )}
            <div>
              <h1 
                className="text-2xl font-bold"
                style={{ color: tenant.brandColors?.text1 || '#000000' }}
              >
                {tenant.brandName}
              </h1>
              {tenant.slogan && (
                <p 
                  className="text-sm mt-1"
                  style={{ color: tenant.brandColors?.text2 || '#6b7280' }}
                >
                  {tenant.slogan}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4">
            <h2 
              className="text-lg font-medium"
              style={{ color: tenant.brandColors?.text1 || '#000000' }}
            >
              Share Your Experience at {location.name}
            </h2>
            <p 
              className="text-sm mt-1"
              style={{ color: tenant.brandColors?.text2 || '#6b7280' }}
            >
              Your feedback helps us improve our service
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Form */}
      <MobileFeedbackForm
        tenantId={tenantId}
        locationId={locationId}
        qrCodeId={qrCodeId}
        surveyTemplateId={surveyTemplateId}
      />

      {/* Branded Footer */}
      <div className="bg-white border-t py-4">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p 
            className="text-sm"
            style={{ color: tenant.brandColors?.text2 || '#6b7280' }}
          >
            Thank you for choosing {tenant.brandName}
          </p>
          {tenant.websiteUrl && (
            <a
              href={tenant.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline mt-1 inline-block"
              style={{ color: tenant.brandColors?.primary || '#3b82f6' }}
            >
              Visit our website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}