import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Star, Mic, Camera, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

const feedbackSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  overallRating: z.number().min(1, "Please provide a rating").max(5),
  feedbackText: z.string().optional(),
  customFields: z.record(z.any()).optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface MobileFeedbackFormProps {
  tenantId: string;
  locationId: string;
  qrId?: string | null;
  tenant?: any;
}

export default function MobileFeedbackForm({ 
  tenantId, 
  locationId, 
  qrId, 
  tenant 
}: MobileFeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [voiceRecordingUrl, setVoiceRecordingUrl] = useState<string>();
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      overallRating: 0,
      feedbackText: "",
      customFields: {},
    },
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      const response = await apiRequest('POST', '/api/feedback', {
        ...data,
        tenantId,
        locationId,
        qrCodeId: qrId,
        voiceRecordingUrl,
        imageUrls,
      });
      return response.json();
    },
    onSuccess: (feedback) => {
      setIsSubmitted(true);
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
      });

      // Update with uploaded files if any
      if (voiceRecordingUrl || imageUrls.length > 0) {
        apiRequest('PUT', `/api/feedback/${feedback.id}/files`, {
          voiceRecordingURL: voiceRecordingUrl,
          imageURLs: imageUrls,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVoiceUpload = async () => {
    try {
      const response = await apiRequest('POST', '/api/objects/upload');
      const { uploadURL } = await response.json();
      return { method: 'PUT' as const, url: uploadURL };
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get upload URL for voice recording",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleVoiceComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful.length > 0) {
      setVoiceRecordingUrl(result.successful[0].uploadURL as string);
      toast({
        title: "Voice recorded",
        description: "Your voice feedback has been recorded successfully.",
      });
    }
  };

  const handleImageUpload = async () => {
    try {
      const response = await apiRequest('POST', '/api/objects/upload');
      const { uploadURL } = await response.json();
      return { method: 'PUT' as const, url: uploadURL };
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get upload URL for image",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleImageComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful.length > 0) {
      const newImageUrls = result.successful.map(file => file.uploadURL as string);
      setImageUrls(prev => [...prev, ...newImageUrls]);
      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully.",
      });
    }
  };

  const onSubmit = (data: FeedbackFormData) => {
    const formData = {
      ...data,
      overallRating: rating,
    };
    submitFeedbackMutation.mutate(formData);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex items-center justify-center">
        <Card className="w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-success-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-6">
              Your feedback has been submitted successfully. We appreciate your time and will use your input to improve our service.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Submit Another Review
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* Mobile Header */}
      <div className="bg-gradient-to-r from-primary to-primary/90 px-6 py-8 text-white">
        <div className="text-center">
          <img 
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&h=120" 
            alt="Business" 
            className="w-16 h-16 rounded-full mx-auto mb-4 object-cover border-2 border-white/20"
          />
          <h1 className="text-xl font-bold">
            {tenant?.companyName || "Business Name"}
          </h1>
          <p className="text-primary-100">
            Main Location
          </p>
        </div>
      </div>

      {/* Feedback Form */}
      <div className="px-6 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Tell us about your experience
              </h2>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" {...field} />
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
                        <Input type="email" placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Rating Section */}
            <div>
              <FormLabel className="block text-sm font-medium text-gray-700 mb-3">
                Overall Rating
              </FormLabel>
              <div className="flex justify-center space-x-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="w-12 h-12 text-2xl transition-colors"
                    onClick={() => {
                      setRating(star);
                      form.setValue("overallRating", star);
                    }}
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-gray-500">
                Tap to rate your experience
              </p>
              {form.formState.errors.overallRating && (
                <p className="text-center text-sm text-destructive mt-2">
                  {form.formState.errors.overallRating.message}
                </p>
              )}
            </div>

            {/* Feedback Text */}
            <FormField
              control={form.control}
              name="feedbackText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Feedback</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Tell us about your experience..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Multimedia Upload */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Add Voice or Photos
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Voice Recording */}
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={10485760} // 10MB
                  onGetUploadParameters={handleVoiceUpload}
                  onComplete={handleVoiceComplete}
                  buttonClassName="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 transition-colors w-full"
                >
                  <Mic className="text-2xl text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Record Voice</span>
                  <span className="text-xs text-gray-500">Up to 2 min</span>
                </ObjectUploader>
                
                {/* Photo Upload */}
                <ObjectUploader
                  maxNumberOfFiles={3}
                  maxFileSize={20971520} // 20MB
                  onGetUploadParameters={handleImageUpload}
                  onComplete={handleImageComplete}
                  buttonClassName="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 transition-colors w-full"
                >
                  <Camera className="text-2xl text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Take Photo</span>
                  <span className="text-xs text-gray-500">Up to 20MB</span>
                </ObjectUploader>
              </div>

              {/* Show uploaded files */}
              {(voiceRecordingUrl || imageUrls.length > 0) && (
                <div className="mt-3 space-y-2">
                  {voiceRecordingUrl && (
                    <Badge variant="secondary">
                      <Mic className="w-3 h-3 mr-1" />
                      Voice recording added
                    </Badge>
                  )}
                  {imageUrls.map((_, index) => (
                    <Badge key={index} variant="secondary">
                      <Camera className="w-3 h-3 mr-1" />
                      Image {index + 1} added
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full py-4"
              disabled={submitFeedbackMutation.isPending}
            >
              {submitFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
