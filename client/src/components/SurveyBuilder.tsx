import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Trash2, GripVertical, Save, Eye } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const DEMO_TENANT_ID = "a550e8e0-d5e7-4f82-8b9a-123456789012";

const fieldTypes = [
  { value: "text", label: "Text Input" },
  { value: "textarea", label: "Text Area" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "date", label: "Date" },
  { value: "rating", label: "Rating Scale" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio Buttons" },
  { value: "checkbox", label: "Checkboxes" },
  { value: "file", label: "File Upload" },
];

const industryTemplates = {
  restaurant: {
    name: "Restaurant Feedback",
    description: "Template for restaurant customer feedback",
    fields: [
      { id: "customer_name", type: "text", label: "Customer Name", required: true },
      { id: "contact", type: "email", label: "Email (Optional)", required: false },
      { id: "table_number", type: "text", label: "Table Number", required: false },
      { id: "server_name", type: "text", label: "Server Name", required: false },
      { id: "overall_rating", type: "rating", label: "Overall Experience", required: true, scale: 5 },
      { id: "food_quality", type: "rating", label: "Food Quality", required: true, scale: 5 },
      { id: "service_rating", type: "rating", label: "Service Quality", required: true, scale: 5 },
      { id: "cleanliness", type: "rating", label: "Cleanliness", required: false, scale: 5 },
      { id: "feedback_text", type: "textarea", label: "Additional Comments", required: false },
      { id: "recommend", type: "radio", label: "Would you recommend us?", required: false, options: ["Yes", "No"] }
    ]
  },
  hospital: {
    name: "Hospital Patient Feedback",
    description: "Template for hospital patient satisfaction",
    fields: [
      { id: "patient_name", type: "text", label: "Patient Name", required: true },
      { id: "contact", type: "phone", label: "Contact Number", required: false },
      { id: "ward_number", type: "text", label: "Ward/Room Number", required: false },
      { id: "doctor_name", type: "text", label: "Doctor Name", required: false },
      { id: "overall_rating", type: "rating", label: "Overall Care Experience", required: true, scale: 5 },
      { id: "staff_courtesy", type: "rating", label: "Staff Courtesy", required: true, scale: 5 },
      { id: "cleanliness", type: "rating", label: "Facility Cleanliness", required: true, scale: 5 },
      { id: "wait_time", type: "rating", label: "Wait Time Satisfaction", required: false, scale: 5 },
      { id: "feedback_text", type: "textarea", label: "Additional Comments", required: false },
      { id: "recommend", type: "radio", label: "Would you recommend our facility?", required: false, options: ["Yes", "No"] }
    ]
  },
  retail: {
    name: "Retail Store Feedback",
    description: "Template for retail customer experience",
    fields: [
      { id: "customer_name", type: "text", label: "Customer Name", required: true },
      { id: "contact", type: "email", label: "Email", required: false },
      { id: "product_code", type: "text", label: "Product Code", required: false },
      { id: "store_location", type: "text", label: "Store Location", required: false },
      { id: "overall_rating", type: "rating", label: "Overall Shopping Experience", required: true, scale: 5 },
      { id: "product_quality", type: "rating", label: "Product Quality", required: true, scale: 5 },
      { id: "staff_helpfulness", type: "rating", label: "Staff Helpfulness", required: true, scale: 5 },
      { id: "store_cleanliness", type: "rating", label: "Store Cleanliness", required: false, scale: 5 },
      { id: "feedback_text", type: "textarea", label: "Additional Comments", required: false },
      { id: "return_customer", type: "radio", label: "Will you shop with us again?", required: false, options: ["Yes", "No", "Maybe"] }
    ]
  }
};

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  industry: z.string().min(1, "Industry is required"),
  isDefault: z.boolean().default(false),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface SurveyField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  scale?: number;
  validation?: any;
}

export default function SurveyBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [fields, setFields] = useState<SurveyField[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      description: "",
      industry: "",
      isDefault: false,
    },
  });

  // Fetch existing survey templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/survey-templates', DEMO_TENANT_ID],
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormData & { fields: SurveyField[] }) => {
      const response = await apiRequest('POST', '/api/survey-templates', {
        ...data,
        tenantId: DEMO_TENANT_ID,
        fields: JSON.stringify(data.fields),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Survey template has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/survey-templates'] });
      form.reset();
      setFields([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const loadTemplate = (templateKey: string) => {
    const template = industryTemplates[templateKey as keyof typeof industryTemplates];
    if (template) {
      form.setValue("name", template.name);
      form.setValue("description", template.description);
      form.setValue("industry", templateKey);
      setFields(template.fields.map((field, index) => ({
        ...field,
        id: field.id || `field_${index}`,
      })));
      setSelectedTemplate(templateKey);
    }
  };

  const addField = () => {
    const newField: SurveyField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "New Field",
      required: false,
      placeholder: "",
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<SurveyField>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setFields(updatedFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFields(items);
  };

  const onSubmit = (data: TemplateFormData) => {
    if (fields.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one field to the survey.",
        variant: "destructive",
      });
      return;
    }

    createTemplateMutation.mutate({ ...data, fields });
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Survey Builder</h1>
          <p className="text-gray-600 mt-2">Create and customize feedback forms for your business</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            <Eye className="mr-2 h-4 w-4" />
            {isPreviewMode ? "Edit Mode" : "Preview"}
          </Button>
        </div>
      </div>

      {!isPreviewMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Template Configuration */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Template Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Industry Template Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start with Industry Template
                  </label>
                  <Select value={selectedTemplate} onValueChange={loadTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an industry template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="hospital">Hospital</SelectItem>
                      <SelectItem value="retail">Retail Store</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Restaurant Feedback Form" {...field} />
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
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Brief description of this template"
                              {...field} 
                            />
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
                          <FormLabel>Industry</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select industry" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="restaurant">Restaurant</SelectItem>
                              <SelectItem value="hospital">Hospital</SelectItem>
                              <SelectItem value="retail">Retail</SelectItem>
                              <SelectItem value="hotel">Hotel</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between pt-4 border-t">
                      <Button type="submit" disabled={createTemplateMutation.isPending}>
                        <Save className="mr-2 h-4 w-4" />
                        {createTemplateMutation.isPending ? "Saving..." : "Save Template"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Field Builder */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Survey Fields
                  <Button onClick={addField} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Field
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="fields">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {fields.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="p-4 border rounded-lg bg-gray-50"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div {...provided.dragHandleProps} className="cursor-move">
                                    <GripVertical className="h-4 w-4 text-gray-400" />
                                  </div>
                                  <Button
                                    onClick={() => removeField(index)}
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Field Type
                                      </label>
                                      <Select
                                        value={field.type}
                                        onValueChange={(value) => updateField(index, { type: value })}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {fieldTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                              {type.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex items-end">
                                      <label className="flex items-center space-x-2 text-xs">
                                        <Switch
                                          checked={field.required}
                                          onCheckedChange={(checked) =>
                                            updateField(index, { required: checked })
                                          }
                                        />
                                        <span>Required</span>
                                      </label>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Field Label
                                    </label>
                                    <Input
                                      value={field.label}
                                      onChange={(e) => updateField(index, { label: e.target.value })}
                                      className="h-8"
                                      placeholder="Enter field label"
                                    />
                                  </div>

                                  {(field.type === "text" || field.type === "textarea") && (
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Placeholder
                                      </label>
                                      <Input
                                        value={field.placeholder || ""}
                                        onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                        className="h-8"
                                        placeholder="Enter placeholder text"
                                      />
                                    </div>
                                  )}

                                  {field.type === "rating" && (
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Rating Scale (1 to X)
                                      </label>
                                      <Select
                                        value={field.scale?.toString() || "5"}
                                        onValueChange={(value) => updateField(index, { scale: parseInt(value) })}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="3">3 Point Scale</SelectItem>
                                          <SelectItem value="5">5 Point Scale</SelectItem>
                                          <SelectItem value="10">10 Point Scale</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  {(field.type === "select" || field.type === "radio" || field.type === "checkbox") && (
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Options (one per line)
                                      </label>
                                      <Textarea
                                        value={field.options?.join('\n') || ""}
                                        onChange={(e) => updateField(index, { 
                                          options: e.target.value.split('\n').filter(opt => opt.trim())
                                        })}
                                        className="h-20 text-sm"
                                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>

                {fields.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No fields added yet.</p>
                    <p className="text-sm">Click "Add Field" to get started or choose an industry template.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        // Preview Mode
        <Card>
          <CardHeader>
            <CardTitle>Survey Preview</CardTitle>
            <p className="text-gray-600">This is how your survey will appear to customers</p>
          </CardHeader>
          <CardContent>
            <div className="max-w-md mx-auto space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.type === "text" && (
                    <Input placeholder={field.placeholder} disabled />
                  )}
                  
                  {field.type === "textarea" && (
                    <Textarea placeholder={field.placeholder} disabled />
                  )}
                  
                  {field.type === "rating" && (
                    <div className="flex space-x-1">
                      {[...Array(field.scale || 5)].map((_, i) => (
                        <Button key={i} size="sm" variant="outline" disabled>
                          {i + 1}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {field.type === "select" && (
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option, optIndex) => (
                          <SelectItem key={optIndex} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {field.type === "radio" && (
                    <div className="space-y-2">
                      {field.options?.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-2">
                          <input type="radio" disabled />
                          <span className="text-sm">{option}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {fields.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No fields to preview. Add some fields first.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}