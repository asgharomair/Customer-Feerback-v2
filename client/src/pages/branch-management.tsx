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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Plus, 
  MapPin, 
  Edit, 
  Trash2, 
  QrCode, 
  BarChart3,
  Users,
  Star,
  TrendingUp,
  Building
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const locationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  description: z.string().optional(),
  address: z.object({
    street: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    zipCode: z.string().min(1, "ZIP code is required"),
    country: z.string().min(1, "Country is required"),
  }),
  contactInfo: z.object({
    phone: z.string().optional(),
    email: z.string().email("Valid email required").optional().or(z.literal("")),
    website: z.string().url("Valid URL required").optional().or(z.literal("")),
  }),
  operatingHours: z.string().optional(),
  capacity: z.number().min(1, "Capacity must be at least 1").optional(),
  isActive: z.boolean().default(true),
});

type LocationData = z.infer<typeof locationSchema>;

export default function BranchManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any | null>(null);
  const tenantId = "a550e8e0-d5e7-4f82-8b9a-123456789012"; // This would come from auth context
  const queryClient = useQueryClient();

  const form = useForm<LocationData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: "",
      description: "",
      address: {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "United States",
      },
      contactInfo: {
        phone: "",
        email: "",
        website: "",
      },
      operatingHours: "",
      capacity: undefined,
      isActive: true,
    },
  });

  // Fetch locations
  const { data: locations, isLoading } = useQuery({
    queryKey: ['/api/locations', tenantId],
    retry: false,
  });

  // Fetch analytics for each location
  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/locations', tenantId],
    retry: false,
  });

  // Create location mutation
  const createLocation = useMutation({
    mutationFn: async (data: LocationData) => {
      return await apiRequest('POST', '/api/locations', {
        ...data,
        tenantId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations', tenantId] });
      setShowCreateDialog(false);
      form.reset();
    },
  });

  // Update location mutation
  const updateLocation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LocationData }) => {
      return await apiRequest('PUT', `/api/locations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations', tenantId] });
      setEditingLocation(null);
      form.reset();
    },
  });

  // Delete location mutation
  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations', tenantId] });
    },
  });

  const handleCreateLocation = () => {
    setEditingLocation(null);
    form.reset();
    setShowCreateDialog(true);
  };

  const handleEditLocation = (location: any) => {
    setEditingLocation(location);
    form.reset({
      name: location.name,
      description: location.description,
      address: location.address,
      contactInfo: location.contactInfo,
      operatingHours: location.operatingHours,
      capacity: location.capacity,
      isActive: location.isActive,
    });
    setShowCreateDialog(true);
  };

  const onSubmit = (data: LocationData) => {
    if (editingLocation) {
      updateLocation.mutate({ id: editingLocation.id, data });
    } else {
      createLocation.mutate(data);
    }
  };

  const getLocationAnalytics = (locationId: string) => {
    if (!Array.isArray(analytics)) return null;
    return analytics.find((a: any) => a.locationId === locationId);
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
              <h1 className="text-2xl font-bold text-gray-900">Location Management</h1>
              <p className="text-gray-600">Manage your business locations and track their performance</p>
            </div>
            <Button onClick={handleCreateLocation} data-testid="button-add-location">
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </div>
        </div>
      </div>

      {/* Locations Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!Array.isArray(locations) || locations.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Building className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No locations yet</h3>
              <p className="text-gray-600 mb-6">
                Start by adding your first business location to begin collecting feedback.
              </p>
              <Button onClick={handleCreateLocation}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Location
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location: any) => {
              const locationAnalytics = getLocationAnalytics(location.id);
              
              return (
                <Card key={location.id} className="hover:shadow-lg transition-shadow" data-testid={`location-card-${location.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 mb-2">
                          <MapPin className="h-5 w-5 text-blue-600" />
                          {location.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={location.isActive ? "default" : "secondary"}>
                            {location.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {locationAnalytics?.qrCodesCount && (
                            <Badge variant="outline" className="text-xs">
                              {locationAnalytics.qrCodesCount} QR Codes
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLocation(location)}
                          data-testid={`button-edit-${location.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteLocation.mutate(location.id)}
                          data-testid={`button-delete-${location.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Address */}
                      <div>
                        <div className="text-sm text-gray-600">
                          {location.address.street}
                        </div>
                        <div className="text-sm text-gray-600">
                          {location.address.city}, {location.address.state} {location.address.zipCode}
                        </div>
                      </div>

                      {/* Contact Info */}
                      {(location.contactInfo.phone || location.contactInfo.email) && (
                        <div className="space-y-1">
                          {location.contactInfo.phone && (
                            <div className="text-sm text-gray-600">📞 {location.contactInfo.phone}</div>
                          )}
                          {location.contactInfo.email && (
                            <div className="text-sm text-gray-600">✉️ {location.contactInfo.email}</div>
                          )}
                        </div>
                      )}

                      {/* Operating Hours */}
                      {location.operatingHours && (
                        <div className="text-sm text-gray-600">
                          🕒 {location.operatingHours}
                        </div>
                      )}

                      {/* Analytics Summary */}
                      {locationAnalytics && (
                        <div className="border-t pt-4 mt-4">
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                                <BarChart3 className="h-3 w-3" />
                                Responses
                              </div>
                              <div className="font-semibold">{locationAnalytics.totalResponses || 0}</div>
                            </div>
                            <div>
                              <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                                <Star className="h-3 w-3" />
                                Avg Rating
                              </div>
                              <div className="font-semibold">
                                {locationAnalytics.averageRating ? `${locationAnalytics.averageRating.toFixed(1)}/5` : "N/A"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" data-testid={`button-qr-codes-${location.id}`}>
                          <QrCode className="h-4 w-4 mr-1" />
                          QR Codes
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" data-testid={`button-analytics-${location.id}`}>
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Analytics
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

      {/* Create/Edit Location Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Edit Location" : "Add New Location"}
            </DialogTitle>
            <DialogDescription>
              {editingLocation 
                ? "Update the location information below."
                : "Add a new business location where customers can provide feedback."
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
                      <FormLabel>Location Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Downtown Store, Main Branch, etc." {...field} data-testid="input-location-name" />
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
                        <Textarea placeholder="Brief description of this location..." {...field} data-testid="textarea-location-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Address</h3>
                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street" {...field} data-testid="input-location-street" />
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
                          <Input placeholder="City" {...field} data-testid="input-location-city" />
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
                          <Input placeholder="State" {...field} data-testid="input-location-state" />
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
                          <Input placeholder="12345" {...field} data-testid="input-location-zip" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactInfo.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} data-testid="input-location-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactInfo.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="location@business.com" type="email" {...field} data-testid="input-location-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="contactInfo.website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://location.business.com" {...field} data-testid="input-location-website" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="operatingHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operating Hours (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Mon-Fri 9AM-6PM" {...field} data-testid="input-operating-hours" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="50" 
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            value={field.value || ''}
                            data-testid="input-location-capacity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                  disabled={createLocation.isPending || updateLocation.isPending}
                  data-testid="button-save-location"
                >
                  {editingLocation 
                    ? (updateLocation.isPending ? "Updating..." : "Update Location")
                    : (createLocation.isPending ? "Creating..." : "Create Location")
                  }
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}