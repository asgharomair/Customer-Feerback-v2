import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ArrowLeft, Building, Users, Palette, QrCode, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ui/ObjectUploader";
import { Progress } from "@/components/ui/progress";

// Company onboarding form schema
const companyOnboardingSchema = z.object({
  // Step 1: Legal and Business Details
  legalName: z.string().min(1, "Legal name is required"),
  brandName: z.string().min(1, "Brand name is required"),
  slogan: z.string().optional(),
  industry: z.string().min(1, "Please select an industry"),
  businessNature: z.string().optional(),
  
  // Step 2: Contact Information
  primaryContactName: z.string().min(1, "Primary contact name is required"),
  primaryContactEmail: z.string().email("Valid email is required"),
  primaryContactPhone: z.string().optional(),
  primaryContactPosition: z.string().optional(),
  
  // Step 3: Business Address
  businessAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  
  // Step 4: Digital Presence
  websiteUrl: z.string().url().optional().or(z.literal("")),
  socialMediaLinks: z.object({
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    linkedin: z.string().optional(),
    youtube: z.string().optional(),
    tiktok: z.string().optional(),
  }).optional(),
  
  // Step 5: Branding
  logoUrl: z.string().optional(),
  brandColors: z.object({
    background1: z.string().default("#ffffff"),
    background2: z.string().default("#f8f9fa"),
    text1: z.string().default("#000000"),
    text2: z.string().default("#6b7280"),
    primary: z.string().default("#3b82f6"),
    secondary: z.string().default("#e5e7eb"),
  }),
  
  // Step 6: Access Management
  authorizedEmails: z.array(z.string().email()).min(1, "At least one authorized email is required"),
});

type CompanyOnboardingData = z.infer<typeof companyOnboardingSchema>;

// Industry options for dropdown
const INDUSTRIES = [
  "Restaurant & Food Service",
  "Healthcare & Medical",
  "Retail & Shopping",
  "Hospitality & Tourism",
  "Education",
  "Automotive",
  "Real Estate",
  "Professional Services",
  "Technology",
  "Manufacturing",
  "Non-Profit",
  "Government",
  "Entertainment",
  "Fitness & Wellness",
  "Beauty & Personal Care",
  "Other"
];

export default function CompanyOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string>("");
  const [emailList, setEmailList] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CompanyOnboardingData>({
    resolver: zodResolver(companyOnboardingSchema),
    defaultValues: {
      brandColors: {
        background1: "#ffffff",
        background2: "#f8f9fa",
        text1: "#000000",
        text2: "#6b7280",
        primary: "#3b82f6",
        secondary: "#e5e7eb",
      },
      socialMediaLinks: {},
      authorizedEmails: [""],
    },
  });

  const totalSteps = 6;
  const progressPercentage = (currentStep / totalSteps) * 100;

  // Create company mutation
  const createCompany = useMutation({
    mutationFn: async (data: CompanyOnboardingData) => {
      const companyData = {
        ...data,
        logoUrl: uploadedLogoUrl,
        authorizedEmails: emailList.filter(email => email.trim() !== ""),
        onboardingCompleted: true,
      };

      return await apiRequest("/api/tenants", {
        method: "POST",
        body: JSON.stringify(companyData),
      });
    },
    onSuccess: (newCompany) => {
      toast({
        title: "Company Setup Complete!",
        description: `${newCompany.brandName} has been successfully onboarded.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      // Redirect to dashboard or QR generation
      window.location.href = `/dashboard?tenantId=${newCompany.id}`;
    },
    onError: (error) => {
      console.error('Company creation error:', error);
      toast({
        title: "Setup Failed",
        description: "There was an error creating your company profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = async (data: CompanyOnboardingData) => {
    setIsSubmitting(true);
    
    try {
      // Upload logo if provided
      if (logoFile && !uploadedLogoUrl) {
        await uploadLogo();
      }

      // Submit company data
      await createCompany.mutateAsync({
        ...data,
        authorizedEmails: emailList.filter(email => email.trim() !== ""),
      });
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload logo
  const uploadLogo = async () => {
    if (!logoFile) return;

    try {
      // Get upload URL
      const uploadResponse = await apiRequest("/api/objects/upload", {
        method: "POST",
      });
      
      // Upload the logo file
      const uploadResult = await fetch(uploadResponse.uploadURL, {
        method: "PUT",
        body: logoFile,
        headers: {
          'Content-Type': logoFile.type,
        },
      });

      if (uploadResult.ok) {
        setUploadedLogoUrl(uploadResponse.uploadURL);
        toast({
          title: "Logo uploaded",
          description: "Your company logo has been saved.",
        });
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({
        title: "Upload failed",
        description: "Could not upload logo. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle email list management
  const addEmailField = () => {
    setEmailList([...emailList, ""]);
  };

  const removeEmailField = (index: number) => {
    setEmailList(emailList.filter((_, i) => i !== index));
  };

  const updateEmailField = (index: number, value: string) => {
    const newEmailList = [...emailList];
    newEmailList[index] = value;
    setEmailList(newEmailList);
    form.setValue("authorizedEmails", newEmailList.filter(email => email.trim() !== ""));
  };

  // Color picker component
  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) => (
    <div className="flex items-center space-x-3">
      <div 
        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
        style={{ backgroundColor: value }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'color';
          input.value = value;
          input.onchange = (e) => onChange((e.target as HTMLInputElement).value);
          input.click();
        }}
      />
      <span className="text-sm font-medium">{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 text-xs"
        placeholder="#000000"
      />
    </div>
  );

  // Navigation functions
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step components
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Building className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Company Information</h2>
        <p className="text-gray-600">Tell us about your business</p>
      </div>

      <FormField
        control={form.control}
        name="legalName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Legal Company Name *</FormLabel>
            <FormControl>
              <Input placeholder="ABC Corporation Ltd." {...field} />
            </FormControl>
            <FormDescription>The official registered name of your company</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="brandName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Brand Name *</FormLabel>
            <FormControl>
              <Input placeholder="ABC Restaurant" {...field} />
            </FormControl>
            <FormDescription>The name customers know you by</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="slogan"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Company Slogan / Tagline</FormLabel>
            <FormControl>
              <Input placeholder="Your tagline here..." {...field} />
            </FormControl>
            <FormDescription>A memorable phrase that represents your brand</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="industry"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Industry *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="businessNature"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Business Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Describe what your business does..."
                className="min-h-[100px]"
                {...field} 
              />
            </FormControl>
            <FormDescription>Brief description of your business activities</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Users className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Primary Contact Details</h2>
        <p className="text-gray-600">Who should we contact for support and updates?</p>
      </div>

      <FormField
        control={form.control}
        name="primaryContactName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Full Name *</FormLabel>
            <FormControl>
              <Input placeholder="John Smith" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="primaryContactEmail"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email Address *</FormLabel>
            <FormControl>
              <Input type="email" placeholder="john@company.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="primaryContactPhone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone Number</FormLabel>
            <FormControl>
              <Input placeholder="+1 (555) 123-4567" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="primaryContactPosition"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Position / Title</FormLabel>
            <FormControl>
              <Input placeholder="Manager, Owner, CEO..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Building className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Business Address</h2>
        <p className="text-gray-600">Where is your business located?</p>
      </div>

      <FormField
        control={form.control}
        name="businessAddress"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Street Address</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="123 Main Street, Suite 100"
                className="min-h-[80px]"
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input placeholder="New York" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State/Province</FormLabel>
              <FormControl>
                <Input placeholder="NY" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <Input placeholder="United States" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="postalCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Postal Code</FormLabel>
              <FormControl>
                <Input placeholder="10001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">Digital Presence</h2>
        <p className="text-gray-600">Connect your online presence</p>
      </div>

      <FormField
        control={form.control}
        name="websiteUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Website URL</FormLabel>
            <FormControl>
              <Input placeholder="https://www.yourwebsite.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="socialMediaLinks.facebook"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Facebook</FormLabel>
              <FormControl>
                <Input placeholder="https://facebook.com/yourpage" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="socialMediaLinks.twitter"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Twitter</FormLabel>
              <FormControl>
                <Input placeholder="https://twitter.com/yourhandle" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="socialMediaLinks.instagram"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instagram</FormLabel>
              <FormControl>
                <Input placeholder="https://instagram.com/yourhandle" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="socialMediaLinks.linkedin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LinkedIn</FormLabel>
              <FormControl>
                <Input placeholder="https://linkedin.com/company/yourcompany" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Palette className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Brand Customization</h2>
        <p className="text-gray-600">Make it yours with custom branding</p>
      </div>

      {/* Logo Upload */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Company Logo</h3>
        <ObjectUploader
          maxNumberOfFiles={1}
          maxFileSize={2097152} // 2MB
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
            if (result.successful.length > 0) {
              setUploadedLogoUrl(result.successful[0].uploadURL);
              toast({
                title: "Logo uploaded",
                description: "Your company logo has been saved.",
              });
            }
          }}
        >
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5" />
            <span>Upload Logo</span>
          </div>
        </ObjectUploader>
        {uploadedLogoUrl && (
          <div className="text-sm text-green-600">✓ Logo uploaded successfully</div>
        )}
      </div>

      {/* Brand Colors */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Brand Colors</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brandColors.background1"
            render={({ field }) => (
              <FormItem>
                <ColorPicker
                  label="Background 1"
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brandColors.background2"
            render={({ field }) => (
              <FormItem>
                <ColorPicker
                  label="Background 2"
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brandColors.text1"
            render={({ field }) => (
              <FormItem>
                <ColorPicker
                  label="Text Color 1"
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brandColors.text2"
            render={({ field }) => (
              <FormItem>
                <ColorPicker
                  label="Text Color 2"
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brandColors.primary"
            render={({ field }) => (
              <FormItem>
                <ColorPicker
                  label="Primary Color"
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brandColors.secondary"
            render={({ field }) => (
              <FormItem>
                <ColorPicker
                  label="Secondary Color"
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Users className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Access Management</h2>
        <p className="text-gray-600">Who can access the dashboard and reports?</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Authorized Email Addresses *</h3>
        <p className="text-sm text-gray-600">
          These email addresses will have access to the dashboard, reports, and notifications.
        </p>
        
        {emailList.map((email, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Input
              type="email"
              placeholder="user@company.com"
              value={email}
              onChange={(e) => updateEmailField(index, e.target.value)}
              className="flex-1"
            />
            {emailList.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeEmailField(index)}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
        
        <Button
          type="button"
          variant="outline"
          onClick={addEmailField}
          className="w-full"
        >
          Add Another Email
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">
              Company Onboarding
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Step {currentStep} of {totalSteps}
            </p>
            <Progress value={progressPercentage} className="mt-4" />
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
                {currentStep === 5 && renderStep5()}
                {currentStep === 6 && renderStep6()}

                <div className="flex justify-between pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  {currentStep < totalSteps ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Setting up...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Complete Setup</span>
                        </div>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}