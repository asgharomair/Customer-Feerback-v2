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
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const queryClient = useQueryClient();

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
      console.error('Failed to submit feedback:', error);
      setSubmissionStatus('error');
    },
  });

  // Track form start time for response time calculation
  const [startTime] = useState(Date.now());

  useEffect(() => {
    form.setValue('overallRating', selectedRating);
  }, [selectedRating, form]);

  // Handle voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/mpeg' });
        setVoiceBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setImages(prev => [...prev, ...files].slice(0, 5)); // Limit to 5 images
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Upload files and get URLs
  const uploadFiles = async (): Promise<{ voiceUrl?: string; imageUrls?: string[] }> => {
    const uploadPromises: Promise<string>[] = [];

    // Upload voice recording
    if (voiceBlob) {
      uploadPromises.push(uploadFile(voiceBlob, 'voice'));
    }

    // Upload images
    images.forEach(image => {
      uploadPromises.push(uploadFile(image, 'image'));
    });

    try {
      const urls = await Promise.all(uploadPromises);
      const result: { voiceUrl?: string; imageUrls?: string[] } = {};

      if (voiceBlob) {
        result.voiceUrl = urls[0];
        result.imageUrls = urls.slice(1);
      } else {
        result.imageUrls = urls;
      }

      return result;
    } catch (error) {
      console.error('Failed to upload files:', error);
      return {};
    }
  };

  const uploadFile = async (file: Blob | File, type: 'voice' | 'image'): Promise<string> => {
    // Get upload URL from backend
    const uploadResponse = await apiRequest('/api/objects/upload', {
      method: 'POST',
    });

    const { uploadURL } = uploadResponse;

    // Upload file directly to object storage
    await fetch(uploadURL, {
      method: 'PUT',
      body: file,
    });

    return uploadURL.split('?')[0]; // Return URL without query parameters
  };

  const onSubmit = async (data: FeedbackFormData) => {
    setSubmissionStatus('submitting');

    try {
      // Upload files first
      const { voiceUrl, imageUrls } = await uploadFiles();

      // Submit feedback with file URLs
      await submitFeedback.mutateAsync({
        ...data,
        voiceRecordingUrl: voiceUrl,
        imageUrls: imageUrls,
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
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: brandColors.primary }} />
              <h2 className="text-2xl font-bold mb-2" style={{ color: brandColors.text1 }}>
                Thank You!
              </h2>
              <p className="text-gray-600 mb-4">
                Your feedback has been submitted successfully. We appreciate you taking the time to share your experience.
              </p>
              {tenant?.brandName && (
                <p className="text-sm" style={{ color: brandColors.text2 }}>
                  - {tenant.brandName}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submissionStatus === 'error') {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ 
          background: `linear-gradient(to bottom right, ${brandColors.background1}, ${brandColors.background2})`,
          ...customStyles 
        }}
      >
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <h2 className="text-2xl font-bold mb-2" style={{ color: brandColors.text1 }}>
                Submission Failed
              </h2>
              <p className="text-gray-600 mb-4">
                We're sorry, but there was an error submitting your feedback. Please try again.
              </p>
              <Button
                onClick={() => setSubmissionStatus('idle')}
                style={{ backgroundColor: brandColors.primary }}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen py-8 px-4"
      style={{ 
        background: `linear-gradient(to bottom right, ${brandColors.background1}, ${brandColors.background2})`,
        ...customStyles 
      }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header with branding */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-4">
              {tenant?.logoUrl && (
                <Avatar className="h-16 w-16">
                  <AvatarImage src={tenant.logoUrl} alt={tenant.brandName} />
                  <AvatarFallback style={{ backgroundColor: brandColors.primary, color: 'white' }}>
                    {tenant.brandName?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <CardTitle className="text-2xl" style={{ color: brandColors.text1 }}>
                  {tenant?.brandName || 'Feedback Form'}
                </CardTitle>
                {tenant?.slogan && (
                  <p className="text-sm mt-1" style={{ color: brandColors.text2 }}>
                    {tenant.slogan}
                  </p>
                )}
              </div>
            </div>
            {location && (
              <Badge variant="outline" className="mb-2">
                {location.name}
              </Badge>
            )}
            <p className="text-sm" style={{ color: brandColors.text2 }}>
              We value your feedback! Please share your experience with us.
            </p>
          </CardHeader>
        </Card>

        {/* Main feedback form */}
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Contact Information */}
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
                          <Input placeholder="your@email.com" type="email" {...field} data-testid="input-customer-email" />
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
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-customer-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Rating */}
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
                  <div className="flex items-center space-x-4">
                    <Button
                      type="button"
                      variant={isRecording ? "destructive" : "outline"}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={submissionStatus === 'submitting'}
                      data-testid="button-voice-recording"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Button>
                    {voiceBlob && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-green-600">✓ Voice recorded</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setVoiceBlob(null)}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <FormLabel>Photos (Optional - Max 5)</FormLabel>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                        disabled={images.length >= 5 || submissionStatus === 'submitting'}
                      />
                      <label htmlFor="image-upload">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={images.length >= 5 || submissionStatus === 'submitting'}
                          data-testid="button-image-upload"
                          asChild
                        >
                          <span>
                            <Camera className="h-4 w-4 mr-2" />
                            Add Photos ({images.length}/5)
                          </span>
                        </Button>
                      </label>
                    </div>
                    
                    {images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {images.map((image, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-24 object-cover rounded border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => removeImage(index)}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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