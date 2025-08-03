import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star, Send, Camera, Mic, Image as ImageIcon, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import VoiceRecorder from "./VoiceRecorder";
import { ObjectUploader } from "./ui/ObjectUploader";

// FR-007: Voice & multimedia feedback support
const feedbackSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  overallRating: z.number().min(1).max(5),
  feedbackText: z.string().optional(),
  voiceRecording: z.any().optional(),
  images: z.array(z.any()).optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface MobileFeedbackFormProps {
  tenantId: string;
  locationId?: string;
  qrCodeId?: string;
  surveyTemplateId?: string;
}

export default function MobileFeedbackForm({ 
  tenantId, 
  locationId, 
  qrCodeId, 
  surveyTemplateId 
}: MobileFeedbackFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadedVoiceUrl, setUploadedVoiceUrl] = useState<string | null>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch survey template if specified
  const { data: surveyTemplate } = useQuery({
    queryKey: [`/api/survey-templates/${surveyTemplateId}`],
    enabled: !!surveyTemplateId,
  });

  // Fetch location info
  const { data: location } = useQuery({
    queryKey: [`/api/locations/${tenantId}`],
    enabled: !!tenantId,
    select: (data: any[]) => data.find((loc: any) => loc.id === locationId),
  });

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      overallRating: 5,
      feedbackText: "",
    },
  });

  // Submit feedback mutation
  const submitFeedback = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      const feedbackData = {
        tenantId,
        locationId,
        qrCodeId,
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        overallRating: data.overallRating,
        feedbackText: data.feedbackText || null,
        voiceRecordingUrl: uploadedVoiceUrl,
        imageUrls: uploadedImageUrls,
        surveyData: surveyTemplate ? JSON.stringify({
          templateId: surveyTemplate.id,
          templateName: surveyTemplate.name,
          responses: data
        }) : null,
      };

      return await apiRequest("/api/feedback", {
        method: "POST",
        body: JSON.stringify(feedbackData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Thank you for your feedback!",
        description: "Your feedback has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      form.reset();
      setCurrentStep(1);
      setVoiceBlob(null);
      setImageFiles([]);
      setUploadedVoiceUrl(null);
      setUploadedImageUrls([]);
    },
    onError: (error) => {
      console.error('Feedback submission error:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Upload voice recording
  const uploadVoice = async () => {
    if (!voiceBlob) return;

    try {
      // Get upload URL
      const uploadResponse = await apiRequest("/api/objects/upload", {
        method: "POST",
      });
      
      // Upload the audio file
      const uploadResult = await fetch(uploadResponse.uploadURL, {
        method: "PUT",
        body: voiceBlob,
        headers: {
          'Content-Type': 'audio/webm;codecs=opus',
        },
      });

      if (uploadResult.ok) {
        setUploadedVoiceUrl(uploadResponse.uploadURL);
        toast({
          title: "Voice recording uploaded",
          description: "Your voice feedback has been saved.",
        });
      }
    } catch (error) {
      console.error('Voice upload error:', error);
      toast({
        title: "Upload failed",
        description: "Could not upload voice recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Upload images
  const uploadImages = async () => {
    if (imageFiles.length === 0) return;

    const uploadedUrls: string[] = [];

    for (const file of imageFiles) {
      try {
        // Get upload URL
        const uploadResponse = await apiRequest("/api/objects/upload", {
          method: "POST",
        });
        
        // Upload the image file
        const uploadResult = await fetch(uploadResponse.uploadURL, {
          method: "PUT",
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        if (uploadResult.ok) {
          uploadedUrls.push(uploadResponse.uploadURL);
        }
      } catch (error) {
        console.error('Image upload error:', error);
      }
    }

    setUploadedImageUrls(uploadedUrls);
    if (uploadedUrls.length > 0) {
      toast({
        title: "Images uploaded",
        description: `${uploadedUrls.length} image(s) have been uploaded.`,
      });
    }
  };

  // Handle form submission
  const onSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true);
    
    try {
      // Upload files if any
      if (voiceBlob && !uploadedVoiceUrl) {
        await uploadVoice();
      }
      if (imageFiles.length > 0 && uploadedImageUrls.length === 0) {
        await uploadImages();
      }

      // Submit feedback
      await submitFeedback.mutateAsync(data);
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rating component
  const RatingInput = ({ value, onChange }: { value: number; onChange: (rating: number) => void }) => (
    <div className="flex justify-center space-x-2 py-4">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          className="transform transition-transform hover:scale-110"
        >
          <Star
            className={`w-10 h-10 ${
              rating <= value 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );

  // Step 1: Basic Info & Rating
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          How was your experience?
        </h2>
        {location && (
          <p className="text-gray-600 flex items-center justify-center">
            <MapPin className="w-4 h-4 mr-1" />
            {location.name}
          </p>
        )}
      </div>

      <FormField
        control={form.control}
        name="overallRating"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-center block text-lg">Rate Your Experience</FormLabel>
            <FormControl>
              <RatingInput
                value={field.value}
                onChange={field.onChange}
              />
            </FormControl>
            <div className="text-center text-sm text-gray-500">
              {field.value === 1 && "Very Poor"}
              {field.value === 2 && "Poor"}
              {field.value === 3 && "Average"}
              {field.value === 4 && "Good"}
              {field.value === 5 && "Excellent"}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

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
              <Input 
                type="email" 
                placeholder="your.email@example.com" 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Button
        type="button"
        onClick={() => setCurrentStep(2)}
        className="w-full"
        size="lg"
      >
        Continue
      </Button>
    </div>
  );

  // Step 2: Additional Feedback
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Tell us more
        </h2>
        <p className="text-gray-600">
          Share additional details about your experience
        </p>
      </div>

      <FormField
        control={form.control}
        name="feedbackText"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Comments</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Tell us more about your experience..."
                className="min-h-[120px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Voice Recording Section (FR-007: Voice feedback) */}
      <div className="space-y-4">
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <Mic className="w-5 h-5 mr-2" />
            Voice Feedback (Optional)
          </h3>
          <VoiceRecorder
            onRecordingComplete={(blob: Blob) => setVoiceBlob(blob)}
            maxDuration={120} // 2 minutes
          />
        </div>

        {/* Image Upload Section (FR-007: Image feedback) */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <Camera className="w-5 h-5 mr-2" />
            Add Photos (Optional)
          </h3>
          
          <ObjectUploader
            maxNumberOfFiles={3}
            maxFileSize={5242880} // 5MB
            onGetUploadParameters={async () => {
              const response = await apiRequest("/api/objects/upload", {
                method: "POST",
              });
              return {
                method: "PUT" as const,
                url: response.uploadURL,
              };
            }}
            onComplete={(result) => {
              const urls = result.successful.map(file => file.uploadURL);
              setUploadedImageUrls(prev => [...prev, ...urls]);
              toast({
                title: "Images uploaded",
                description: `${result.successful.length} image(s) uploaded successfully.`,
              });
            }}
          >
            <div className="flex items-center justify-center space-x-2">
              <ImageIcon className="w-5 h-5" />
              <span>Upload Photos</span>
            </div>
          </ObjectUploader>

          {uploadedImageUrls.length > 0 && (
            <div className="mt-3 text-sm text-green-600">
              ✓ {uploadedImageUrls.length} photo(s) uploaded
            </div>
          )}
        </div>
      </div>

      <div className="flex space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep(1)}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-primary hover:bg-primary/90"
          size="lg"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Submitting...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4" />
              <span>Submit Feedback</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-primary">
              Customer Feedback
            </CardTitle>
            <div className="flex justify-center space-x-2 mt-4">
              {[1, 2].map((step) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full ${
                    currentStep >= step ? "bg-primary" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}