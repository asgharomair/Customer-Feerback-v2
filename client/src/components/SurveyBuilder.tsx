import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Type, 
  Mail, 
  Phone, 
  Star, 
  Calendar,
  ToggleLeft,
  List,
  Save,
  Eye,
  Copy,
  Settings
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const surveyTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  industry: z.string().min(1, "Industry is required"),
  fields: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
    placeholder: z.string().optional(),
    scale: z.number().optional(),
  })),
});

type SurveyTemplateData = z.infer<typeof surveyTemplateSchema>;

interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'rating' | 'select' | 'radio' | 'checkbox' | 'date' | 'number';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  scale?: number;
}

const fieldTypes = [
  { value: 'text', label: 'Text Input', icon: Type },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'textarea', label: 'Long Text', icon: Type },
  { value: 'rating', label: 'Star Rating', icon: Star },
  { value: 'select', label: 'Dropdown', icon: List },
  { value: 'radio', label: 'Radio Buttons', icon: ToggleLeft },
  { value: 'checkbox', label: 'Checkboxes', icon: ToggleLeft },
  { value: 'date', label: 'Date Picker', icon: Calendar },
  { value: 'number', label: 'Number Input', icon: Type },
];

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

export default function SurveyBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>([
    {
      id: 'customer_name',
      type: 'text',
      label: 'Your Name',
      required: true,
      placeholder: 'Enter your name'
    },
    {
      id: 'overall_rating',
      type: 'rating',
      label: 'Overall Experience',
      required: true,
      scale: 5
    },
    {
      id: 'feedback_text',
      type: 'textarea',
      label: 'Your Feedback',
      required: false,
      placeholder: 'Please share your experience...'
    }
  ]);

  const queryClient = useQueryClient();
  const tenantId = "a550e8e0-d5e7-4f82-8b9a-123456789012"; // This would come from auth context

  // Fetch existing survey templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/survey-templates', tenantId],
    retry: false,
  });

  const form = useForm<SurveyTemplateData>({
    resolver: zodResolver(surveyTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      industry: "",
      fields: formFields,
    },
  });

  // Create/Update survey template mutation
  const saveTemplate = useMutation({
    mutationFn: async (data: SurveyTemplateData) => {
      const templateData = {
        ...data,
        tenantId,
        fields: JSON.stringify(formFields),
      };

      if (selectedTemplate) {
        return await apiRequest(`/api/survey-templates/${selectedTemplate}`, {
          method: 'PUT',
          body: JSON.stringify(templateData),
        });
      } else {
        return await apiRequest('/api/survey-templates', {
          method: 'POST',
          body: JSON.stringify(templateData),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/survey-templates', tenantId] });
      setSelectedTemplate(null);
      form.reset();
      setFormFields([]);
    },
  });

  // Load template for editing
  const loadTemplate = (template: any) => {
    setSelectedTemplate(template.id);
    form.setValue('name', template.name);
    form.setValue('description', template.description || '');
    form.setValue('industry', template.industry);
    
    try {
      const fields = typeof template.fields === 'string' 
        ? JSON.parse(template.fields) 
        : template.fields;
      setFormFields(fields || []);
    } catch (error) {
      console.error('Failed to parse template fields:', error);
      setFormFields([]);
    }
  };

  // Add new field
  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: `New ${fieldTypes.find(ft => ft.value === type)?.label || type}`,
      required: false,
      placeholder: type === 'textarea' ? 'Enter your response...' : 'Enter value...',
      scale: type === 'rating' ? 5 : undefined,
      options: ['select', 'radio', 'checkbox'].includes(type) ? ['Option 1', 'Option 2'] : undefined,
    };
    setFormFields([...formFields, newField]);
  };

  // Update field
  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = [...formFields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setFormFields(updatedFields);
  };

  // Remove field
  const removeField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  // Move field
  const moveField = (fromIndex: number, toIndex: number) => {
    const updatedFields = [...formFields];
    const [movedField] = updatedFields.splice(fromIndex, 1);
    updatedFields.splice(toIndex, 0, movedField);
    setFormFields(updatedFields);
  };

  const onSubmit = (data: SurveyTemplateData) => {
    saveTemplate.mutate({
      ...data,
      fields: formFields,
    });
  };

  // Render field preview
  const renderFieldPreview = (field: FormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <Input 
            placeholder={field.placeholder}
            type={field.type}
            disabled
            className="pointer-events-none"
          />
        );
      case 'textarea':
        return (
          <Textarea 
            placeholder={field.placeholder}
            disabled
            className="pointer-events-none min-h-[80px]"
          />
        );
      case 'rating':
        return (
          <div className="flex items-center space-x-1">
            {[...Array(field.scale || 5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 text-gray-300" />
            ))}
          </div>
        );
      case 'select':
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
          </Select>
        );
      case 'radio':
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, i) => (
              <div key={i} className="flex items-center space-x-2">
                <input 
                  type={field.type} 
                  disabled 
                  className="pointer-events-none" 
                />
                <label className="text-sm">{option}</label>
              </div>
            ))}
          </div>
        );
      case 'date':
        return (
          <Input 
            type="date"
            disabled
            className="pointer-events-none"
          />
        );
      default:
        return <Input disabled className="pointer-events-none" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Survey Builder</h1>
              <p className="text-gray-600">Create and customize feedback forms for your business</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => setPreviewMode(!previewMode)}
                data-testid="button-preview-mode"
              >
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? 'Edit Mode' : 'Preview'}
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={saveTemplate.isPending}
                data-testid="button-save-template"
              >
                <Save className="h-4 w-4 mr-2" />
                {selectedTemplate ? 'Update' : 'Save'} Template
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Template Library */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Template Library</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedTemplate(null);
                      form.reset();
                      setFormFields([]);
                    }}
                    data-testid="button-new-template"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Your Templates</h4>
                    {isLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse bg-gray-200 h-10 rounded"></div>
                        ))}
                      </div>
                    ) : templates?.length === 0 ? (
                      <p className="text-sm text-gray-500">No templates yet</p>
                    ) : (
                      templates?.map((template: any) => (
                        <div
                          key={template.id}
                          className={`p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedTemplate === template.id ? 'border-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => loadTemplate(template)}
                          data-testid={`template-${template.id}`}
                        >
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{template.industry}</div>
                          <Badge variant="outline" className="mt-2 text-xs">
                            {JSON.parse(template.fields || '[]').length} fields
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Builder */}
          <div className="lg:col-span-3">
            {previewMode ? (
              /* Preview Mode */
              <Card>
                <CardHeader>
                  <CardTitle>Form Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {formFields.map((field, index) => (
                      <div key={field.id} className="space-y-2">
                        <label className="text-sm font-medium">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderFieldPreview(field)}
                      </div>
                    ))}
                    {formFields.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No fields added yet. Switch to edit mode to add fields.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Edit Mode */
              <div className="space-y-6">
                {/* Template Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Template Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Template Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Restaurant Feedback Form" {...field} data-testid="input-template-name" />
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
                                    <SelectValue placeholder="Select industry" />
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
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="mt-4">
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe what this template is for..." 
                                {...field} 
                                data-testid="textarea-template-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </Form>
                  </CardContent>
                </Card>

                {/* Field Builder */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Form Fields</CardTitle>
                      <div className="flex items-center space-x-2">
                        {fieldTypes.slice(0, 5).map((fieldType) => {
                          const Icon = fieldType.icon;
                          return (
                            <Button
                              key={fieldType.value}
                              variant="outline"
                              size="sm"
                              onClick={() => addField(fieldType.value as FormField['type'])}
                              data-testid={`button-add-${fieldType.value}`}
                            >
                              <Icon className="h-4 w-4 mr-1" />
                              {fieldType.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {formFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="border rounded-lg p-4 bg-white"
                          data-testid={`field-${index}`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-2">
                              <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                              <Badge variant="outline">
                                {fieldTypes.find(ft => ft.value === field.type)?.label}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeField(index)}
                              data-testid={`button-remove-field-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium mb-1 block">Field Label</label>
                              <Input
                                value={field.label}
                                onChange={(e) => updateField(index, { label: e.target.value })}
                                placeholder="Enter field label"
                                data-testid={`input-field-label-${index}`}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium mb-1 block">Placeholder</label>
                              <Input
                                value={field.placeholder || ''}
                                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                placeholder="Enter placeholder text"
                                data-testid={`input-field-placeholder-${index}`}
                              />
                            </div>
                          </div>
                          
                          {field.type === 'rating' && (
                            <div className="mt-4">
                              <label className="text-sm font-medium mb-1 block">Rating Scale</label>
                              <Select
                                value={String(field.scale || 5)}
                                onValueChange={(value) => updateField(index, { scale: parseInt(value) })}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3">1-3</SelectItem>
                                  <SelectItem value="5">1-5</SelectItem>
                                  <SelectItem value="10">1-10</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          {['select', 'radio', 'checkbox'].includes(field.type) && (
                            <div className="mt-4">
                              <label className="text-sm font-medium mb-2 block">Options</label>
                              <div className="space-y-2">
                                {field.options?.map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex items-center space-x-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => {
                                        const newOptions = [...(field.options || [])];
                                        newOptions[optionIndex] = e.target.value;
                                        updateField(index, { options: newOptions });
                                      }}
                                      placeholder={`Option ${optionIndex + 1}`}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newOptions = field.options?.filter((_, i) => i !== optionIndex);
                                        updateField(index, { options: newOptions });
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const newOptions = [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`];
                                    updateField(index, { options: newOptions });
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Option
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-4 flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(index, { required: e.target.checked })}
                              data-testid={`checkbox-field-required-${index}`}
                            />
                            <label className="text-sm">Required field</label>
                          </div>
                        </div>
                      ))}
                      
                      {formFields.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Plus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No fields added yet. Click the buttons above to add form fields.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}