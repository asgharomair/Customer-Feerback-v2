import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Building, 
  MapPin, 
  Palette, 
  CheckCircle, 
  ArrowRight,
  Star,
  Upload,
  Globe,
  Mail,
  Phone,
  Users,
  CreditCard
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

const tenantSchema = z.object({
  brandName: z.string().min(1, "Business name is required"),
  industry: z.string().min(1, "Industry is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  website: z.string().url("Valid website URL is required").optional().or(z.literal("")),
  description: z.string().optional(),
  address: z.object({
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(1, "ZIP code is required"),
    country: z.string().min(1, "Country is required"),
  }),
  brandColors: z.object({
    primary: z.string().min(1, "Primary color is required"),
    secondary: z.string().min(1, "Secondary color is required"),
    background1: z.string().min(1, "Background color is required"),
    background2: z.string().min(1, "Secondary background color is required"),
    text1: z.string().min(1, "Primary text color is required"),
    text2: z.string().min(1, "Secondary text color is required"),
  }),
  slogan: z.string().optional(),
  logoUrl: z.string().optional(),
  subscription: z.enum(["free", "basic", "professional", "enterprise"]),
});

type TenantData = z.infer<typeof tenantSchema>;

const industries = [
  'Restaurant & Food Service',
  'Healthcare & Medical',
  'Retail & Shopping',
  'Hospitality & Tourism',
  'Automotive & Transportation',
  'Education & Training',
  'Beauty & Personal Care',
  'Financial Services',
  'Real Estate',
  'Technology & Software',
  'Manufacturing',
  'Non-profit & Government',
  'Entertainment & Events',
  'Professional Services',
  'Construction & Home Services',
  'Other'
];

const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/month',
    features: ['Up to 100 responses/month', '1 location', 'Basic analytics', 'Email support'],
    recommended: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '$29',
    period: '/month',
    features: ['Up to 1,000 responses/month', '5 locations', 'Advanced analytics', 'Custom branding'],
    recommended: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$99',
    period: '/month',
    features: ['Up to 10,000 responses/month', 'Unlimited locations', 'Real-time alerts', 'API access'],
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$299',
    period: '/month',
    features: ['Unlimited responses', 'White-label solution', 'Dedicated support', 'Custom integrations'],
    recommended: false,
  }
];

export default function CompanyOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const form = useForm<TenantData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      brandName: "",
      industry: "",
      email: "",
      phone: "",
      website: "",
      description: "",
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "United States",
      },
      brandColors: {
        primary: "#3b82f6",
        secondary: "#e5e7eb",
        background1: "#ffffff",
        background2: "#f8f9fa",
        text1: "#000000",
        text2: "#6b7280",
      },
      slogan: "",
      logoUrl: "",
      subscription: "basic",
    },
  });

  const createTenant = useMutation({
    mutationFn: async (data: TenantData) => {
      return await apiRequest('POST', '/api/tenants', data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      setLocation('/dashboard');
    },
    onError: (error) => {
      console.error('Failed to create tenant:', error);
    },
  });

  const steps = [
    { number: 1, title: "Business Information", icon: Building },
    { number: 2, title: "Branding & Appearance", icon: Palette },
    { number: 3, title: "Subscription Plan", icon: CreditCard },
    { number: 4, title: "Review & Complete", icon: CheckCircle },
  ];

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: TenantData) => {
    if (currentStep < 4) {
      nextStep();
    } else {
      createTenant.mutate({
        ...data,
        subscription: selectedPlan as any,
      });
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        
        return (
          <div key={step.number} className="flex items-center">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
              isActive 
                ? 'border-blue-600 bg-blue-600 text-white' 
                : isCompleted 
                ? 'border-green-600 bg-green-600 text-white'
                : 'border-gray-300 bg-white text-gray-400'
            }`}>
              {isCompleted ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <Icon className="h-6 w-6" />
              )}
            </div>
            <div className="ml-3 hidden sm:block">
              <div className={`text-sm font-medium ${
                isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
              }`}>
                Step {step.number}
              </div>
              <div className={`text-sm ${
                isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
              }`}>
                {step.title}
              </div>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="h-5 w-5 text-gray-400 mx-4" />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="brandName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Business Name" {...field} data-testid="input-brand-name" />
                    </FormControl>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-industry">
                          <SelectValue placeholder="Select your industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {industries.map((industry) => (
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Email *</FormLabel>
                    <FormControl>
                      <Input placeholder="contact@yourbusiness.com" type="email" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://yourbusiness.com" {...field} data-testid="input-website" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell us about your business..." 
                      className="min-h-[100px]"
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Business Address</h3>
              <FormField
                control={form.control}
                name="address.street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} data-testid="input-street" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      <FormControl>
                        <Input placeholder="State" {...field} data-testid="input-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code *</FormLabel>
                      <FormControl>
                        <Input placeholder="12345" {...field} data-testid="input-zip" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="slogan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Slogan (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Your business motto..." {...field} data-testid="input-slogan" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/logo.png" {...field} data-testid="input-logo-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Brand Colors</h3>
              <p className="text-sm text-gray-600">
                Customize the colors for your feedback forms and dashboard
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brandColors.primary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input type="color" {...field} className="w-16 h-10" data-testid="input-primary-color" />
                          <Input {...field} placeholder="#3b82f6" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brandColors.secondary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input type="color" {...field} className="w-16 h-10" data-testid="input-secondary-color" />
                          <Input {...field} placeholder="#e5e7eb" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Brand Preview */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preview</h3>
              <Card className="p-6" style={{ 
                backgroundColor: form.watch('brandColors.background1'),
                color: form.watch('brandColors.text1'),
                borderColor: form.watch('brandColors.primary')
              }}>
                <div className="text-center">
                  <h4 className="text-xl font-bold mb-2" style={{ color: form.watch('brandColors.primary') }}>
                    {form.watch('brandName') || 'Your Business Name'}
                  </h4>
                  {form.watch('slogan') && (
                    <p className="text-sm mb-4" style={{ color: form.watch('brandColors.text2') }}>
                      {form.watch('slogan')}
                    </p>
                  )}
                  <Button style={{ backgroundColor: form.watch('brandColors.primary') }}>
                    Sample Feedback Form
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Choose Your Plan</h3>
              <p className="text-gray-600">
                Select the plan that best fits your business needs. You can upgrade or downgrade at any time.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {subscriptionPlans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`relative cursor-pointer transition-all hover:shadow-lg ${
                    selectedPlan === plan.id ? 'ring-2 ring-blue-600' : ''
                  } ${plan.recommended ? 'border-blue-600' : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                  data-testid={`plan-${plan.id}`}
                >
                  {plan.recommended && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-600">
                      Recommended
                    </Badge>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="flex items-baseline justify-center">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-gray-500 ml-1">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Review Your Information</h3>
              <p className="text-gray-600">
                Please review your details before completing the setup.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Name:</strong> {form.watch('brandName')}</div>
                  <div><strong>Industry:</strong> {form.watch('industry')}</div>
                  <div><strong>Email:</strong> {form.watch('email')}</div>
                  <div><strong>Phone:</strong> {form.watch('phone')}</div>
                  {form.watch('website') && (
                    <div><strong>Website:</strong> {form.watch('website')}</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>{form.watch('address.street')}</div>
                  <div>
                    {form.watch('address.city')}, {form.watch('address.state')} {form.watch('address.zipCode')}
                  </div>
                  <div>{form.watch('address.country')}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Branding
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {form.watch('slogan') && (
                    <div><strong>Slogan:</strong> {form.watch('slogan')}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <strong>Primary Color:</strong>
                    <div 
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: form.watch('brandColors.primary') }}
                    />
                    {form.watch('brandColors.primary')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Subscription
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">
                        {subscriptionPlans.find(p => p.id === selectedPlan)?.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {subscriptionPlans.find(p => p.id === selectedPlan)?.price}
                        {subscriptionPlans.find(p => p.id === selectedPlan)?.period}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to FeedbackFlow
          </h1>
          <p className="text-xl text-gray-600">
            Let's get your business set up to start collecting valuable customer feedback
          </p>
        </div>

        <StepIndicator />

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">
              {steps[currentStep - 1].title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {renderStep()}

                <Separator />

                <div className="flex justify-between pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    data-testid="button-previous"
                  >
                    Previous
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTenant.isPending}
                    data-testid="button-next"
                  >
                    {currentStep === 4 ? (
                      createTenant.isPending ? 'Creating Account...' : 'Complete Setup'
                    ) : (
                      'Next Step'
                    )}
                    {currentStep < 4 && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}