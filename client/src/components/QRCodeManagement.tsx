import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, QrCode, BarChart3, Trash2, Edit, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const DEMO_TENANT_ID = "a550e8e0-d5e7-4f82-8b9a-123456789012";

const qrCodeSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  identifier: z.string().min(1, "Table/Bed number is required"),
  section: z.string().optional(),
});

type QRCodeFormData = z.infer<typeof qrCodeSchema>;

export default function QRCodeManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<QRCodeFormData>({
    resolver: zodResolver(qrCodeSchema),
    defaultValues: {
      locationId: "",
      identifier: "",
      section: "",
    },
  });

  // Fetch locations for the tenant
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['/api/locations', DEMO_TENANT_ID],
  });

  // Fetch QR codes
  const { data: qrCodes, isLoading: qrCodesLoading } = useQuery({
    queryKey: ['/api/qr-codes', DEMO_TENANT_ID],
    refetchInterval: 60000, // Refresh every minute for updated analytics
  });

  // Create QR code mutation
  const createQrCodeMutation = useMutation({
    mutationFn: async (data: QRCodeFormData) => {
      const response = await apiRequest('POST', '/api/qr-codes', {
        ...data,
        tenantId: DEMO_TENANT_ID,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "QR Code Generated",
        description: "Your QR code has been generated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/qr-codes'] });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate QR code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: QRCodeFormData) => {
    createQrCodeMutation.mutate(data);
  };

  const handleDownloadQR = (qrCode: any) => {
    // Create download link for QR code image
    const link = document.createElement('a');
    link.href = qrCode.qrImageUrl;
    link.download = `QR_${qrCode.identifier}_${qrCode.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Download Started",
      description: `QR code for ${qrCode.identifier} is being downloaded.`,
    });
  };

  const handleBulkDownload = () => {
    toast({
      title: "Bulk Download",
      description: "Preparing bulk download of all QR codes...",
    });
    // In a real implementation, this would create a ZIP file with all QR codes
  };

  const getLocationName = (locationId: string) => {
    const location = locations?.find((loc: any) => loc.id === locationId);
    return location?.name || "Unknown Location";
  };

  const filteredQrCodes = selectedLocation 
    ? qrCodes?.filter((qr: any) => qr.locationId === selectedLocation)
    : qrCodes;

  if (qrCodesLoading || locationsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
            </div>
            <div className="flex space-x-3">
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-100 rounded-lg p-6 border">
                  <div className="w-32 h-32 bg-gray-200 rounded-lg mx-auto mb-4"></div>
                  <div className="h-5 bg-gray-200 rounded w-20 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 mx-auto mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">QR Code Management</h3>
            <p className="text-sm text-gray-500">Generate and manage QR codes for your locations</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleBulkDownload}>
              <Download className="mr-2 h-4 w-4" />
              Bulk Download
            </Button>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate QR Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate New QR Code</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="locationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locations?.map((location: any) => (
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
                      name="identifier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Table/Room Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Table 12, Room 205" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="section"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Patio, VIP, ICU" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setIsCreateModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={createQrCodeMutation.isPending}
                      >
                        {createQrCodeMutation.isPending ? "Generating..." : "Generate QR Code"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Location Filter */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="location-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Location
            </Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger id="location-filter">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Locations</SelectItem>
                {locations?.map((location: any) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* QR Codes Grid */}
        {filteredQrCodes?.length === 0 ? (
          <div className="text-center py-12">
            <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No QR Codes Yet</h3>
            <p className="text-gray-500 mb-4">
              Generate your first QR code to start collecting customer feedback.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Generate First QR Code
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredQrCodes?.map((qrCode: any) => (
              <Card key={qrCode.id} className="bg-gray-50 hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  {/* QR Code Image */}
                  <div className="w-32 h-32 bg-white rounded-lg mx-auto mb-4 p-2 border border-gray-300">
                    {qrCode.qrImageUrl ? (
                      <img
                        src={qrCode.qrImageUrl}
                        alt={`QR Code for ${qrCode.identifier}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded flex items-center justify-center">
                        <QrCode className="w-16 h-16 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* QR Code Info */}
                  <h4 className="font-semibold text-gray-900 mb-2">{qrCode.identifier}</h4>
                  <p className="text-sm text-gray-500 mb-2">{getLocationName(qrCode.locationId)}</p>
                  {qrCode.section && (
                    <Badge variant="outline" className="mb-4">
                      {qrCode.section}
                    </Badge>
                  )}
                  
                  {/* Analytics */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Scans Today:</span>
                      <span className="font-medium">{qrCode.scansToday || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Scans:</span>
                      <span className="font-medium">{qrCode.totalScans || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Completion Rate:</span>
                      <span className="font-medium text-success">
                        {qrCode.completionRate || 0}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownloadQR(qrCode)}
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <BarChart3 className="mr-1 h-3 w-3" />
                      Analytics
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
