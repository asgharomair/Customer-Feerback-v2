import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { 
  Type, 
  Star, 
  ChevronDown, 
  AlignLeft, 
  Hash, 
  Calendar,
  Save,
  Eye,
  Trash2,
  Edit,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const DEMO_TENANT_ID = "a550e8e0-d5e7-4f82-8b9a-123456789012";

const fieldTypes = [
  { id: 'text', icon: Type, label: 'Text Input', color: 'text-blue-500' },
  { id: 'rating', icon: Star, label: 'Rating Scale', color: 'text-yellow-500' },
  { id: 'dropdown', icon: ChevronDown, label: 'Dropdown', color: 'text-green-500' },
  { id: 'textarea', icon: AlignLeft, label: 'Text Area', color: 'text-purple-500' },
  { id: 'number', icon: Hash, label: 'Number', color: 'text-red-500' },
  { id: 'date', icon: Calendar, label: 'Date', color: 'text-indigo-500' },
];

interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  max?: number;
}

export default function SurveyBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [formFields, setFormFields] = useState<FormField[]>([
    {
      id: 'customer_name',
      type: 'text',
      label: 'Customer Name',
      placeholder: 'Enter your name',
      required: true,
    }
  ]);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/survey-templates', DEMO_TENANT_ID],
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      const response = await apiRequest('POST', '/api/survey-templates', templateData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template saved",
        description: "Your survey template has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/survey-templates'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination } = result;

    if (source.droppableId === "field-types" && destination.droppableId === "form-canvas") {
      // Add new field to form
      const fieldType = fieldTypes.find(f => f.id === result.draggableId);
      if (fieldType) {
        const newField: FormField = {
          id: `field_${Date.now()}`,
          type: fieldType.id,
          label: fieldType.label,
          placeholder: `Enter ${fieldType.label.toLowerCase()}`,
          required: false,
          ...(fieldType.id === 'rating' && { max: 5 }),
          ...(fieldType.id === 'dropdown' && { options: ['Option 1', 'Option 2'] }),
        };
        setFormFields(prev => [...prev, newField]);
      }
    } else if (source.droppableId === "form-canvas" && destination.droppableId === "form-canvas") {
      // Reorder fields in form
      const items = Array.from(formFields);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setFormFields(items);
    }
  };

  const handleFieldUpdate = (updatedField: FormField) => {
    setFormFields(prev => 
      prev.map(field => field.id === updatedField.id ? updatedField : field)
    );
    setSelectedField(updatedField);
  };

  const handleFieldDelete = (fieldId: string) => {
    setFormFields(prev => prev.filter(field => field.id !== fieldId));
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
  };

  const handleSaveTemplate = () => {
    const templateData = {
      tenantId: DEMO_TENANT_ID,
      name: "Custom Survey Template",
      description: "Custom survey created with form builder",
      industry: "General",
      fields: formFields,
      isDefault: false,
      isActive: true,
    };
    saveTemplateMutation.mutate(templateData);
  };

  const renderFieldPreview = (field: FormField) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            placeholder={field.placeholder}
            disabled
            className="w-full"
          />
        );
      case 'textarea':
        return (
          <textarea
            placeholder={field.placeholder}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
            rows={3}
          />
        );
      case 'rating':
        return (
          <div className="flex space-x-1">
            {[...Array(field.max || 5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 text-gray-300" />
            ))}
          </div>
        );
      case 'dropdown':
        return (
          <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-md">
            <option>Select an option</option>
            {field.options?.map((option, i) => (
              <option key={i}>{option}</option>
            ))}
          </select>
        );
      case 'number':
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            disabled
            className="w-full"
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            disabled
            className="w-full"
          />
        );
      default:
        return (
          <Input
            placeholder={field.placeholder}
            disabled
            className="w-full"
          />
        );
    }
  };

  if (templatesLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="lg:col-span-2 h-96 bg-gray-200 rounded"></div>
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Survey Builder</span>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleSaveTemplate} disabled={saveTemplateMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveTemplateMutation.isPending ? "Saving..." : "Save Draft"}
            </Button>
            <Button>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Field Types Sidebar */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">Field Types</h4>
              <Droppable droppableId="field-types" isDropDisabled={true}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {fieldTypes.map((fieldType, index) => (
                      <Draggable key={fieldType.id} draggableId={fieldType.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 border border-gray-200 rounded-lg cursor-move hover:bg-gray-50 transition-colors ${
                              snapshot.isDragging ? 'bg-blue-50 border-blue-300' : ''
                            }`}
                          >
                            <div className="flex items-center">
                              <fieldType.icon className={`${fieldType.color} mr-3 w-4 h-4`} />
                              <span className="text-sm font-medium">{fieldType.label}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
            
            {/* Form Builder Canvas */}
            <div className="lg:col-span-2">
              <Droppable droppableId="form-canvas">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`border-2 border-dashed rounded-lg min-h-96 p-6 transition-colors ${
                      snapshot.isDraggingOver 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-300'
                    }`}
                  >
                    {formFields.length === 0 ? (
                      <div className="text-center py-8">
                        <Plus className="text-4xl text-gray-300 mb-4 mx-auto" />
                        <p className="text-gray-500">Drag field types here to build your survey</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formFields.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white border border-gray-200 rounded-lg p-4 group hover:border-primary-300 transition-colors ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                } ${
                                  selectedField?.id === field.id ? 'border-primary-500 ring-1 ring-primary-200' : ''
                                }`}
                                onClick={() => setSelectedField(field)}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <Label className="text-sm font-medium text-gray-700">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                  </Label>
                                  <div className="opacity-0 group-hover:opacity-100 flex space-x-2 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedField(field);
                                      }}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFieldDelete(field.id);
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                                {renderFieldPreview(field)}
                                <div className="mt-2 flex items-center text-xs text-gray-500">
                                  <Checkbox checked={field.required} disabled className="mr-2" />
                                  <span>Required field</span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      </div>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
            
            {/* Field Properties */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">Field Properties</h4>
              {selectedField ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1">Field Label</Label>
                    <Input
                      value={selectedField.label}
                      onChange={(e) => handleFieldUpdate({ ...selectedField, label: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1">Placeholder</Label>
                    <Input
                      value={selectedField.placeholder || ""}
                      onChange={(e) => handleFieldUpdate({ ...selectedField, placeholder: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  
                  {selectedField.type === 'rating' && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1">Max Rating</Label>
                      <Input
                        type="number"
                        min="3"
                        max="10"
                        value={selectedField.max || 5}
                        onChange={(e) => handleFieldUpdate({ ...selectedField, max: parseInt(e.target.value) })}
                        className="text-sm"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedField.required}
                      onCheckedChange={(checked) => 
                        handleFieldUpdate({ ...selectedField, required: checked as boolean })
                      }
                    />
                    <Label className="text-sm text-gray-700">Required field</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <Label className="text-sm text-gray-700">Show in analytics</Label>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Edit className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select a field to edit its properties</p>
                </div>
              )}
            </div>
          </div>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}
