import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import MobileFeedbackForm from "@/components/MobileFeedbackForm";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function FeedbackForm() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const tenantId = searchParams.get('t');
  const locationId = searchParams.get('l');
  const qrId = searchParams.get('q');

  // Track QR scan if qrId is present
  const { data: qrScanTracked } = useQuery({
    queryKey: ['/api/qr-codes', qrId, 'scan'],
    queryFn: async () => {
      if (qrId) {
        const response = await fetch(`/api/qr-codes/${qrId}/scan`, {
          method: 'POST',
        });
        return response.json();
      }
      return null;
    },
    enabled: !!qrId,
  });

  // Get tenant information
  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['/api/tenants', tenantId],
    enabled: !!tenantId,
  });

  if (!tenantId || !locationId) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="flex mb-4 gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <h1 className="text-2xl font-bold text-gray-900">Invalid Link</h1>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              This feedback link appears to be invalid. Please scan the QR code again or contact the business for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tenantLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileFeedbackForm 
        tenantId={tenantId}
        locationId={locationId}
        qrId={qrId}
        tenant={tenant}
      />
    </div>
  );
}
