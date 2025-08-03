import { useEffect } from "react";
import MobileFeedbackForm from "@/components/MobileFeedbackForm";
import { apiRequest } from "@/lib/queryClient";

// FR-010: Public feedback form accessible via QR codes
export default function FeedbackPage() {
  // Parse URL parameters for QR code data
  const urlParams = new URLSearchParams(window.location.search);
  const tenantId = urlParams.get('t');
  const locationId = urlParams.get('l');
  const qrCodeId = urlParams.get('q');
  const templateId = urlParams.get('template');

  useEffect(() => {
    // Track QR code scan when page loads (FR-060: QR code analytics)
    if (qrCodeId) {
      trackQrScan(qrCodeId);
    }
  }, [qrCodeId]);

  const trackQrScan = async (qrCodeId: string) => {
    try {
      await apiRequest(`/api/qr-codes/${qrCodeId}/scan`, {
        method: "POST",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.error('Failed to track QR scan:', error);
    }
  };

  // Handle invalid or missing parameters
  if (!tenantId || !locationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Invalid Feedback Link</h1>
          <p className="text-red-600">
            This feedback link appears to be invalid or expired. Please scan the QR code again or contact the business directly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <MobileFeedbackForm 
        tenantId={tenantId}
        locationId={locationId}
        qrCodeId={qrCodeId || undefined}
        surveyTemplateId={templateId || undefined}
      />
    </div>
  );
}