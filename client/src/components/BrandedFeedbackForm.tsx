import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Star, Send, Mic, Camera, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import VoiceRecorder from "@/components/VoiceRecorder";
import ImageUploader from "@/components/ui/ImageUploader";

const feedbackSchema = z.object({
  customerName: z.string().min(1, "Please enter your name"),
  customerEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  overallRating: z.number().min(1, "Please select a rating").max(5),
  feedbackText: z.string().min(10, "Please provide at least 10 characters of feedback"),
  customFields: z.record(z.any()).optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface BrandedFeedbackFormProps {
  tenantId: string;
  locationId: string;
  qrCodeId?: string;
  surveyTemplateId?: string;
}

export default function BrandedFeedbackForm({
  tenantId,
  locationId,
  qrCodeId,
  surveyTemplateId
}: BrandedFeedbackFormProps) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [voiceRecordingUrl, setVoiceRecordingUrl] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const queryClient = useQueryClient();
  const startTime = Date.now();

  // Fetch tenant branding
  const { data: tenant } = useQuery({
    queryKey: ['/api/tenants', tenantId],
    retry: false,
  });

  // Fetch location details
  const { data: location } = useQuery({
    queryKey: ['/api/locations', locationId],
    retry: false,
  });

  // Fetch survey template if specified
  const { data: surveyTemplate } = useQuery({
    queryKey: ['/api/survey-templates', surveyTemplateId],
    enabled: !!surveyTemplateId,
    retry: false,
  });

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      overallRating: 0,
      feedbackText: "",
      customFields: {},
    },
  });

  // Submit feedback mutation
  const submitFeedback = useMutation({
    mutationFn: async (data: FeedbackFormData & { voiceRecordingUrl?: string; imageUrls?: string[] }) => {
      return await apiRequest('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          tenantId,
          locationId,
          qrCodeId,
          ipAddress: '',
          userAgent: navigator.userAgent,
          responseTime: Math.floor((Date.now() - startTime) / 1000),
        }),
      });
    },
    onSuccess: () => {
      setSubmissionStatus('success');
      queryClient.invalidateQueries({ queryKey: ['/api/feedback', tenantId] });
    },
    onError: (error) => {
      console.error('Error submitting feedback:', error);
      setSubmissionStatus('error');
    },
  });

  const handleVoiceRecordingComplete = (audioBlob: Blob) => {
    // Voice recording is handled by the VoiceRecorder component
    console.log('Voice recording completed:', audioBlob);
  };

  const handleVoiceUploadComplete = (uploadUrl: string) => {
    setVoiceRecordingUrl(uploadUrl);
  };

  const handleImagesUploaded = (uploadedUrls: string[]) => {
    setImageUrls(uploadedUrls);
  };

  const onSubmit = async (data: FeedbackFormData) => {
    setSubmissionStatus('submitting');

    try {
      // Submit feedback with file URLs
      await submitFeedback.mutateAsync({
        ...data,
        voiceRecordingUrl: voiceRecordingUrl || undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });
    } catch (error) {
      setSubmissionStatus('error');
    }
  };

  // Apply tenant branding
  const brandColors = tenant?.brandColors || {
    primary: '#3b82f6',
    secondary: '#e5e7eb',
    background1: '#ffffff',
    background2: '#f8f9fa',
    text1: '#000000',
    text2: '#6b7280',
  };

  const customStyles = {
    '--primary': brandColors.primary,
    '--secondary': brandColors.secondary,
    '--background': brandColors.background1,
    '--background-secondary': brandColors.background2,
    '--text-primary': brandColors.text1,
    '--text-secondary': brandColors.text2,
  } as React.CSSProperties;

  if (submissionStatus === 'success') {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ 
          background: `linear-gradient(to bottom right, ${brandColors.background1}, ${brandColors.background2})`,
          ...customStyles 
        }}
      >
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: brandColors.text1 }}>
                  Thank You!
                </h2>
                <p className="text-gray-600" style={{ color: brandColors.text2 }}>
                  Your feedback has been submitted successfully. We appreciate your input!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen p-4"
      style={{ 
        background: `linear-gradient(to bottom right, ${brandColors.background1}, ${brandColors.background2})`,
        ...customStyles 
      }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {tenant?.logoUrl && (
            <img 
              src={tenant.logoUrl} 
              alt={tenant.brandName} 
              className="h-16 mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold mb-2" style={{ color: brandColors.text1 }}>
            {tenant?.brandName || 'Feedback Form'}
          </h1>
          {tenant?.slogan && (
            <p className="text-lg" style={{ color: brandColors.text2 }}>
              {tenant.slogan}
            </p>
          )}
          {location && (
            <p className="text-sm mt-2" style={{ color: brandColors.text2 }}>
              {location.name}
            </p>
          )}
        </div>

        {/* Feedback Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center" style={{ color: brandColors.text1 }}>
              Share Your Experience
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Customer Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your name" {...field} data-testid="input-customer-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter your email" 
                            {...field} 
                            data-testid="input-customer-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="tel" 
                          placeholder="Enter your phone number" 
                          {...field} 
                          data-testid="input-customer-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Overall Rating */}
                <div className="space-y-2">
                  <FormLabel>Overall Rating *</FormLabel>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setSelectedRating(rating)}
                        onMouseEnter={() => setHoverRating(rating)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="transition-all duration-200"
                        data-testid={`star-${rating}`}
                      >
                        <Star
                          className={`h-8 w-8 ${
                            rating <= (hoverRating || selectedRating)
                              ? 'fill-current'
                              : 'text-gray-300'
                          }`}
                          style={{
                            color: rating <= (hoverRating || selectedRating) ? brandColors.primary : undefined
                          }}
                        />
                      </button>
                    ))}
                    {selectedRating > 0 && (
                      <span className="ml-2 text-sm" style={{ color: brandColors.text2 }}>
                        {selectedRating}/5
                      </span>
                    )}
                  </div>
                  {form.formState.errors.overallRating && (
                    <p className="text-sm text-red-600">{form.formState.errors.overallRating.message}</p>
                  )}
                </div>

                {/* Feedback Text */}
                <FormField
                  control={form.control}
                  name="feedbackText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Feedback *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please share your experience with us..."
                          className="min-h-[120px]"
                          {...field}
                          data-testid="textarea-feedback"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Voice Recording */}
                <div className="space-y-2">
                  <FormLabel>Voice Recording (Optional)</FormLabel>
                  <VoiceRecorder
                    onRecordingComplete={handleVoiceRecordingComplete}
                    onUploadComplete={handleVoiceUploadComplete}
                    maxDuration={120}
                    autoUpload={true}
                    tenantId={tenantId}
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <FormLabel>Photos (Optional)</FormLabel>
                  <ImageUploader
                    onImagesUploaded={handleImagesUploaded}
                    maxFiles={5}
                    maxFileSize={10 * 1024 * 1024} // 10MB
                    acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                    tenantId={tenantId}
                    autoUpload={true}
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={submissionStatus === 'submitting'}
                    style={{ backgroundColor: brandColors.primary }}
                    data-testid="button-submit-feedback"
                  >
                    {submissionStatus === 'submitting' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Feedback
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs" style={{ color: brandColors.text2 }}>
            Your feedback helps us improve our service. Thank you for your time!
          </p>
        </div>
      </div>
    </div>
  );
}