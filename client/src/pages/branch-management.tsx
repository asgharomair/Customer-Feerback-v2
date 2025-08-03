import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, MapPin, QrCode, Edit, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import QRCode from "qrcode";

// Location form schema
const locationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface BranchManagementProps {
  tenantId?: string;
}

// Get tenant ID from URL params if not provided
function useTenantId(providedTenantId?: string): string {
  const urlParams = new URLSearchParams(window.location.search);
  return providedTenantId || urlParams.get('tenantId') || 'a550e8e0-d5e7-4f82-8b9a-123456789012';
}

export default function BranchManagement({ tenantId: providedTenantId }: BranchManagementProps) {
  const tenantId = useTenantId(providedTenantId);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch locations
  const { data: locations, isLoading } = useQuery({
    queryKey: [`/api/locations/${tenantId}`],
  });

  // Fetch tenant info for branding
  const { data: tenant } = useQuery({
    queryKey: [`/api/tenants/${tenantId}`],
  });

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      email: "",
    },
  });

  // Create location mutation
  const createLocation = useMutation({
    mutationFn: async (data: LocationFormData) => {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          tenantId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create location');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Location Added",
        description: "New location has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/locations/${tenantId}`] });
      setIsAddingLocation(false);
      form.reset();
    },
  });

  // Update location mutation
  const updateLocation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LocationFormData }) => {
      const response = await fetch(`/api/locations/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update location');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Location Updated",
        description: "Location details have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/locations/${tenantId}`] });
      setEditingLocation(null);
      form.reset();
    },
  });

  // Delete location mutation
  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/locations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error('Failed to delete location');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Location Deleted",
        description: "Location has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/locations/${tenantId}`] });
    },
  });

  // Generate QR Code for location
  const generateQRCode = async (location: any) => {
    setGeneratingQR(location.id);
    
    try {
      // Create QR code entry in database
      const response = await fetch("/api/qr-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId,
          locationId: location.id,
          identifier: `Location-${location.name}`,
          section: "Main",
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create QR code entry');
      }

      const qrCodeResponse = await response.json();

      // Generate QR code image
      const feedbackUrl = `${window.location.origin}/feedback?t=${tenantId}&l=${location.id}&q=${qrCodeResponse.id}`;
      const qrCodeDataUrl = await QRCode.toDataURL(feedbackUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: tenant?.brandColors?.primary || '#000000',
          light: tenant?.brandColors?.background1 || '#FFFFFF',
        },
      });

      // Create download link
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `${location.name}-QR-Code.png`;
      link.click();

      toast({
        title: "QR Code Generated",
        description: `QR code for ${location.name} has been downloaded.`,
      });

      queryClient.invalidateQueries({ queryKey: [`/api/qr-codes/${tenantId}`] });
    } catch (error) {
      console.error('QR generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate QR code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingQR(null);
    }
  };

  const onSubmit = async (data: LocationFormData) => {
    if (editingLocation) {
      await updateLocation.mutateAsync({ id: editingLocation.id, data });
    } else {
      await createLocation.mutateAsync(data);
    }
  };

  const handleEdit = (location: any) => {
    setEditingLocation(location);
    form.reset({
      name: location.name,
      address: location.address || "",
      city: location.city || "",
      state: location.state || "",
      zipCode: location.zipCode || "",
      phone: location.phone || "",
      email: location.email || "",
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      await deleteLocation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Branch Management</h1>
          <p className="text-gray-600">Manage your business locations and generate QR codes</p>
        </div>
        
        <Dialog open={isAddingLocation || !!editingLocation} onOpenChange={(open) => {
          if (!open) {
            setIsAddingLocation(false);
            setEditingLocation(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddingLocation(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? "Edit Location" : "Add New Location"}
              </DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Main Branch, Downtown Store..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="123 Main Street"
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
                        <FormLabel>State</FormLabel>
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
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input placeholder="10001" {...field} />
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
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="location@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingLocation(false);
                      setEditingLocation(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createLocation.isPending || updateLocation.isPending}
                  >
                    {editingLocation ? "Update" : "Create"} Location
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {locations && locations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No locations yet</h3>
            <p className="text-gray-500 mb-4">
              Add your first business location to start collecting feedback.
            </p>
            <Button onClick={() => setIsAddingLocation(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Location
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations?.map((location: any) => (
            <Card key={location.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-primary" />
                    {location.name}
                  </span>
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(location)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(location.id, location.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {location.address && (
                    <p>{location.address}</p>
                  )}
                  {(location.city || location.state) && (
                    <p>
                      {location.city}{location.city && location.state && ", "}{location.state} {location.zipCode}
                    </p>
                  )}
                  {location.phone && (
                    <p>📞 {location.phone}</p>
                  )}
                  {location.email && (
                    <p>✉️ {location.email}</p>
                  )}
                </div>

                <Button
                  onClick={() => generateQRCode(location)}
                  disabled={generatingQR === location.id}
                  className="w-full"
                  variant="outline"
                >
                  {generatingQR === location.id ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </div>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 mr-2" />
                      Generate QR Code
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}