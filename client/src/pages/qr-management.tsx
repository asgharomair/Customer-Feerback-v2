import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus, 
  QrCode, 
  Edit, 
  Trash2, 
  Download, 
  BarChart3,
  Eye,
  Copy,
  MapPin,
  Zap,
  Calendar,
  ExternalLink,
  Share2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import QRCodeLib from "qrcode";

const qrCodeSchema = z.object({
  name: z.string().min(1, "QR code name is required"),
  description: z.string().optional(),
  locationId: z.string().min(1, "Location is required"),
  surveyTemplateId: z.string().optional(),
  isActive: z.boolean().default(true),
  customMessage: z.string().optional(),
  redirectUrl: z.string().optional(),
});

type QRCodeData = z.infer<typeof qrCodeSchema>;

export default function QRManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingQRCode, setEditingQRCode] = useState<any | null>(null);
  const [previewQRCode, setPreviewQRCode] = useState<string | null>(null);
  const [generatedQRData, setGeneratedQRData] = useState<string | null>(null);
  const tenantId = "a550e8e0-d5e7-4f82-8b9a-123456789012"; // This would come from auth context
  const queryClient = useQueryClient();

  const form = useForm<QRCodeData>({
    resolver: zodResolver(qrCodeSchema),
    defaultValues: {
      name: "",
      description: "",
      locationId: "",
      surveyTemplateId: "",
      isActive: true,
      customMessage: "",
      redirectUrl: "",
    },
  });

  // Fetch QR codes
  const { data: qrCodes, isLoading } = useQuery({
    queryKey: ['/api/qr-codes', tenantId],
    retry: false,
  });

  // Fetch locations for dropdown
  const { data: locations } = useQuery({
    queryKey: ['/api/locations', tenantId],
    retry: false,
  });

  // Fetch survey templates for dropdown
  const { data: templates } = useQuery({
    queryKey: ['/api/survey-templates', tenantId],
    retry: false,
  });

  // Fetch analytics for QR codes
  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/qr-codes', tenantId],
    retry: false,
  });

  // Create QR code mutation
  const createQRCode = useMutation({
    mutationFn: async (data: QRCodeData) => {
      return await apiRequest('POST', '/api/qr-codes', {
        ...data,
        tenantId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/qr-codes', tenantId] });
      setShowCreateDialog(false);
      form.reset();
    },
  });

  // Update QR code mutation
  const updateQRCode = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: QRCodeData }) => {
      return await apiRequest('PUT', `/api/qr-codes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/qr-codes', tenantId] });
      setEditingQRCode(null);
      form.reset();
      setShowCreateDialog(false);
    },
  });

  // Delete QR code mutation
  const deleteQRCode = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/qr-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/qr-codes', tenantId] });
    },
  });

  const handleCreateQRCode = () => {
    setEditingQRCode(null);
    form.reset();
    setShowCreateDialog(true);
  };

  const handleEditQRCode = (qrCode: any) => {
    setEditingQRCode(qrCode);
    form.reset({
      name: qrCode.name,
      description: qrCode.description,
      locationId: qrCode.locationId,
      surveyTemplateId: qrCode.surveyTemplateId,
      isActive: qrCode.isActive,
      customMessage: qrCode.customMessage,
      redirectUrl: qrCode.redirectUrl,
    });
    setShowCreateDialog(true);
  };

  const generateQRCodePreview = async (qrCodeData: any) => {
    try {
      const qrUrl = `${window.location.origin}/feedback?t=${tenantId}&l=${qrCodeData.locationId}&q=${qrCodeData.id}&template=${qrCodeData.surveyTemplateId || ''}`;
      const qrCodeDataUrl = await QRCodeLib.toDataURL(qrUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setPreviewQRCode(qrCodeDataUrl);
      setGeneratedQRData(qrUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const downloadQRCode = async (qrCode: any) => {
    try {
      const qrUrl = `${window.location.origin}/feedback?t=${tenantId}&l=${qrCode.locationId}&q=${qrCode.id}&template=${qrCode.surveyTemplateId || ''}`;
      const qrCodeDataUrl = await QRCodeLib.toDataURL(qrUrl, {
        width: 400,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Create download link
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `qr-code-${qrCode.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download QR code:', error);
    }
  };

  const copyQRUrl = async (qrCode: any) => {
    const qrUrl = `${window.location.origin}/feedback?t=${tenantId}&l=${qrCode.locationId}&q=${qrCode.id}&template=${qrCode.surveyTemplateId || ''}`;
    try {
      await navigator.clipboard.writeText(qrUrl);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const onSubmit = (data: QRCodeData) => {
    if (editingQRCode) {
      updateQRCode.mutate({ id: editingQRCode.id, data });
    } else {
      createQRCode.mutate(data);
    }
  };

  const getQRCodeAnalytics = (qrCodeId: string) => {
    if (!Array.isArray(analytics)) return null;
    return analytics.find((a: any) => a.qrCodeId === qrCodeId);
  };

  const getLocationName = (locationId: string) => {
    if (!Array.isArray(locations)) return "Unknown Location";
    const location = locations.find((l: any) => l.id === locationId);
    return location?.name || "Unknown Location";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 h-64">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">QR Code Management</h1>
              <p className="text-gray-600">Create and manage QR codes for feedback collection</p>
            </div>
            <Button onClick={handleCreateQRCode} data-testid="button-add-qr-code">
              <Plus className="h-4 w-4 mr-2" />
              Create QR Code
            </Button>
          </div>
        </div>
      </div>

      {/* QR Codes Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!Array.isArray(qrCodes) || qrCodes.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <QrCode className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No QR codes yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first QR code to start collecting customer feedback at your locations.
              </p>
              <Button onClick={handleCreateQRCode}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First QR Code
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {qrCodes.map((qrCode: any) => {
              const qrAnalytics = getQRCodeAnalytics(qrCode.id);
              
              return (
                <Card key={qrCode.id} className="hover:shadow-lg transition-shadow" data-testid={`qr-card-${qrCode.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 mb-2">
                          <QrCode className="h-5 w-5 text-purple-600" />
                          {qrCode.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={qrCode.isActive ? "default" : "secondary"}>
                            {qrCode.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            {getLocationName(qrCode.locationId)}
                          </Badge>
                        </div>
                        {qrCode.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {qrCode.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateQRCodePreview(qrCode)}
                          data-testid={`button-preview-${qrCode.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditQRCode(qrCode)}
                          data-testid={`button-edit-${qrCode.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteQRCode.mutate(qrCode.id)}
                          data-testid={`button-delete-${qrCode.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Custom Message */}
                      {qrCode.customMessage && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">Custom Message</div>
                          <div className="text-sm">{qrCode.customMessage}</div>
                        </div>
                      )}

                      {/* Analytics Summary */}
                      {qrAnalytics && (
                        <div className="border-t pt-4">
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                                <Zap className="h-3 w-3" />
                                Scans
                              </div>
                              <div className="font-semibold">{qrAnalytics.totalScans || 0}</div>
                            </div>
                            <div>
                              <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                                <BarChart3 className="h-3 w-3" />
                                Responses
                              </div>
                              <div className="font-semibold">{qrAnalytics.totalResponses || 0}</div>
                            </div>
                          </div>
                          {qrAnalytics.lastScannedAt && (
                            <div className="text-center mt-2">
                              <div className="text-xs text-gray-500">
                                Last scanned: {new Date(qrAnalytics.lastScannedAt).toLocaleDateString()}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => downloadQRCode(qrCode)}
                          data-testid={`button-download-${qrCode.id}`}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => copyQRUrl(qrCode)}
                          data-testid={`button-copy-${qrCode.id}`}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy URL
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit QR Code Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQRCode ? "Edit QR Code" : "Create New QR Code"}
            </DialogTitle>
            <DialogDescription>
              {editingQRCode 
                ? "Update the QR code settings below."
                : "Create a new QR code for customers to scan and provide feedback."
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>QR Code Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Entrance, Table QR, etc." {...field} data-testid="input-qr-name" />
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
                        <Textarea placeholder="Brief description of where this QR code will be placed..." {...field} data-testid="textarea-qr-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Location and Template */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-location">
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(locations) && locations.map((location: any) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
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
                    name="surveyTemplateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Survey Template (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-template">
                              <SelectValue placeholder="Use default form" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Default Feedback Form</SelectItem>
                            {Array.isArray(templates) && templates.map((template: any) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Customization */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Customization</h3>
                <FormField
                  control={form.control}
                  name="customMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="We'd love to hear about your experience! Scan to share your feedback."
                          {...field}
                          data-testid="textarea-custom-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="redirectUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Redirect URL (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://yourwebsite.com/thank-you"
                          {...field}
                          data-testid="input-redirect-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-2 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createQRCode.isPending || updateQRCode.isPending}
                  data-testid="button-save-qr-code"
                >
                  {editingQRCode 
                    ? (updateQRCode.isPending ? "Updating..." : "Update QR Code")
                    : (createQRCode.isPending ? "Creating..." : "Create QR Code")
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* QR Code Preview Dialog */}
      <Dialog open={!!previewQRCode} onOpenChange={() => setPreviewQRCode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code Preview</DialogTitle>
            <DialogDescription>
              Scan this QR code to test the feedback experience
            </DialogDescription>
          </DialogHeader>
          <div className="text-center space-y-4">
            {previewQRCode && (
              <div className="flex justify-center">
                <img src={previewQRCode} alt="QR Code Preview" className="border rounded-lg" />
              </div>
            )}
            {generatedQRData && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Feedback URL:</div>
                <div className="text-sm font-mono break-all">{generatedQRData}</div>
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(generatedQRData || '')}
                data-testid="button-copy-preview-url"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy URL
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(generatedQRData || '', '_blank')}
                data-testid="button-test-preview"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Test Form
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}