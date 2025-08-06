import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Mail, MessageSquare, Bell, Settings, Save, CheckCircle, XCircle } from 'lucide-react';

interface NotificationPreferences {
  email: {
    enabled: boolean;
    address: string;
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    alertTypes: {
      critical: boolean;
      warning: boolean;
      info: boolean;
    };
  };
  sms: {
    enabled: boolean;
    phoneNumber: string;
    frequency: 'immediate' | 'hourly' | 'daily';
    alertTypes: {
      critical: boolean;
      warning: boolean;
    };
  };
  inApp: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    alertTypes: {
      critical: boolean;
      warning: boolean;
      info: boolean;
    };
  };
}

interface NotificationStats {
  email: {
    totalSent: number;
    delivered: number;
    failed: number;
    lastSent?: string;
  };
  sms: {
    totalSent: number;
    delivered: number;
    failed: number;
    lastSent?: string;
    optInStatus: 'opted-in' | 'opted-out' | 'not-registered';
  };
}

export default function NotificationPreferences() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { toast } = useToast();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: {
      enabled: true,
      address: '',
      frequency: 'immediate',
      alertTypes: {
        critical: true,
        warning: true,
        info: false
      }
    },
    sms: {
      enabled: false,
      phoneNumber: '',
      frequency: 'immediate',
      alertTypes: {
        critical: true,
        warning: false
      }
    },
    inApp: {
      enabled: true,
      sound: true,
      desktop: true,
      alertTypes: {
        critical: true,
        warning: true,
        info: true
      }
    }
  });

  const [stats, setStats] = useState<NotificationStats>({
    email: { totalSent: 0, delivered: 0, failed: 0 },
    sms: { totalSent: 0, delivered: 0, failed: 0, optInStatus: 'not-registered' }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (tenantId) {
      loadPreferences();
      loadStats();
    }
  }, [tenantId]);

  const loadPreferences = async () => {
    try {
      // In a real implementation, you would load from API
      // For now, we'll use localStorage or default values
      const saved = localStorage.getItem(`notification-preferences-${tenantId}`);
      if (saved) {
        setPreferences(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Load email stats
      const emailResponse = await fetch('/api/email/stats');
      if (emailResponse.ok) {
        const emailStats = await emailResponse.json();
        setStats(prev => ({
          ...prev,
          email: {
            totalSent: emailStats.deliveryTracking?.total || 0,
            delivered: emailStats.deliveryTracking?.sent || 0,
            failed: emailStats.deliveryTracking?.failed || 0
          }
        }));
      }

      // Load SMS stats
      const smsResponse = await fetch('/api/sms/stats');
      if (smsResponse.ok) {
        const smsStats = await smsResponse.json();
        setStats(prev => ({
          ...prev,
          sms: {
            totalSent: smsStats.deliveryTracking?.total || 0,
            delivered: smsStats.deliveryTracking?.delivered || 0,
            failed: smsStats.deliveryTracking?.failed || 0,
            optInStatus: smsStats.optInStats?.activeOptIns > 0 ? 'opted-in' : 'opted-out'
          }
        }));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      // Save to localStorage for now
      localStorage.setItem(`notification-preferences-${tenantId}`, JSON.stringify(preferences));
      
      // In a real implementation, you would save to API
      // await fetch('/api/notification-preferences', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ tenantId, preferences })
      // });

      toast({
        title: "Success",
        description: "Notification preferences saved successfully",
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSMSOptIn = async () => {
    if (!preferences.sms.phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter a phone number first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/sms/opt-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: preferences.sms.phoneNumber,
          tenantId,
          source: 'web'
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Successfully opted in to SMS notifications",
        });
        setStats(prev => ({
          ...prev,
          sms: { ...prev.sms, optInStatus: 'opted-in' }
        }));
      } else {
        throw new Error('Failed to opt in');
      }
    } catch (error) {
      console.error('Error opting in to SMS:', error);
      toast({
        title: "Error",
        description: "Failed to opt in to SMS notifications",
        variant: "destructive",
      });
    }
  };

  const handleSMSOptOut = async () => {
    try {
      const response = await fetch('/api/sms/opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: preferences.sms.phoneNumber,
          tenantId,
          reason: 'User request'
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Successfully opted out of SMS notifications",
        });
        setStats(prev => ({
          ...prev,
          sms: { ...prev.sms, optInStatus: 'opted-out' }
        }));
      } else {
        throw new Error('Failed to opt out');
      }
    } catch (error) {
      console.error('Error opting out of SMS:', error);
      toast({
        title: "Error",
        description: "Failed to opt out of SMS notifications",
        variant: "destructive",
      });
    }
  };

  const updatePreference = (path: string, value: any) => {
    setPreferences(prev => {
      const newPrefs = { ...prev };
      const keys = path.split('.');
      let current: any = newPrefs;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      setHasChanges(true);
      return newPrefs;
    });
  };

  const getOptInStatusIcon = (status: string) => {
    switch (status) {
      case 'opted-in': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'opted-out': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading notification preferences...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notification Preferences</h1>
          <p className="text-muted-foreground">Manage how you receive alerts and notifications</p>
        </div>
        <Button onClick={savePreferences} disabled={!hasChanges || saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="in-app">In-App</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Configure email notification settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts via email
                  </p>
                </div>
                <Switch
                  id="email-enabled"
                  checked={preferences.email.enabled}
                  onCheckedChange={(checked) => updatePreference('email.enabled', checked)}
                />
              </div>

              {preferences.email.enabled && (
                <>
                  <div>
                    <Label htmlFor="email-address">Email Address</Label>
                    <Input
                      id="email-address"
                      type="email"
                      value={preferences.email.address}
                      onChange={(e) => updatePreference('email.address', e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email-frequency">Notification Frequency</Label>
                    <Select
                      value={preferences.email.frequency}
                      onValueChange={(value: any) => updatePreference('email.frequency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="hourly">Hourly Digest</SelectItem>
                        <SelectItem value="daily">Daily Digest</SelectItem>
                        <SelectItem value="weekly">Weekly Digest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Alert Types</Label>
                    <div className="space-y-3 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">Critical</Badge>
                          <span>Critical alerts and urgent issues</span>
                        </div>
                        <Switch
                          checked={preferences.email.alertTypes.critical}
                          onCheckedChange={(checked) => updatePreference('email.alertTypes.critical', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Warning</Badge>
                          <span>Warning alerts and important updates</span>
                        </div>
                        <Switch
                          checked={preferences.email.alertTypes.warning}
                          onCheckedChange={(checked) => updatePreference('email.alertTypes.warning', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">Info</Badge>
                          <span>General information and updates</span>
                        </div>
                        <Switch
                          checked={preferences.email.alertTypes.info}
                          onCheckedChange={(checked) => updatePreference('email.alertTypes.info', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                SMS Notifications
              </CardTitle>
              <CardDescription>
                Configure SMS notification settings and opt-in status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-enabled">Enable SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts via text message
                  </p>
                </div>
                <Switch
                  id="sms-enabled"
                  checked={preferences.sms.enabled}
                  onCheckedChange={(checked) => updatePreference('sms.enabled', checked)}
                />
              </div>

              {preferences.sms.enabled && (
                <>
                  <div>
                    <Label htmlFor="sms-phone">Phone Number</Label>
                    <Input
                      id="sms-phone"
                      type="tel"
                      value={preferences.sms.phoneNumber}
                      onChange={(e) => updatePreference('sms.phoneNumber', e.target.value)}
                      placeholder="+1234567890"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>Opt-in Status:</span>
                      {getOptInStatusIcon(stats.sms.optInStatus)}
                      <Badge variant={stats.sms.optInStatus === 'opted-in' ? 'default' : 'secondary'}>
                        {stats.sms.optInStatus}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      {stats.sms.optInStatus !== 'opted-in' && (
                        <Button variant="outline" size="sm" onClick={handleSMSOptIn}>
                          Opt In
                        </Button>
                      )}
                      {stats.sms.optInStatus === 'opted-in' && (
                        <Button variant="outline" size="sm" onClick={handleSMSOptOut}>
                          Opt Out
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="sms-frequency">Notification Frequency</Label>
                    <Select
                      value={preferences.sms.frequency}
                      onValueChange={(value: any) => updatePreference('sms.frequency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="hourly">Hourly Digest</SelectItem>
                        <SelectItem value="daily">Daily Digest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>SMS Alert Types</Label>
                    <div className="space-y-3 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">Critical</Badge>
                          <span>Critical alerts only</span>
                        </div>
                        <Switch
                          checked={preferences.sms.alertTypes.critical}
                          onCheckedChange={(checked) => updatePreference('sms.alertTypes.critical', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Warning</Badge>
                          <span>Warning alerts</span>
                        </div>
                        <Switch
                          checked={preferences.sms.alertTypes.warning}
                          onCheckedChange={(checked) => updatePreference('sms.alertTypes.warning', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <MessageSquare className="h-4 w-4" />
                    <AlertDescription>
                      SMS notifications require opt-in and may incur charges from your mobile carrier.
                      Reply STOP to any SMS to opt out at any time.
                    </AlertDescription>
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in-app" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                In-App Notifications
              </CardTitle>
              <CardDescription>
                Configure in-app notification settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="inapp-enabled">Enable In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications within the application
                  </p>
                </div>
                <Switch
                  id="inapp-enabled"
                  checked={preferences.inApp.enabled}
                  onCheckedChange={(checked) => updatePreference('inApp.enabled', checked)}
                />
              </div>

              {preferences.inApp.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="inapp-sound">Sound Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Play sound for new notifications
                      </p>
                    </div>
                    <Switch
                      id="inapp-sound"
                      checked={preferences.inApp.sound}
                      onCheckedChange={(checked) => updatePreference('inApp.sound', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="inapp-desktop">Desktop Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Show desktop notifications when app is open
                      </p>
                    </div>
                    <Switch
                      id="inapp-desktop"
                      checked={preferences.inApp.desktop}
                      onCheckedChange={(checked) => updatePreference('inApp.desktop', checked)}
                    />
                  </div>

                  <div>
                    <Label>In-App Alert Types</Label>
                    <div className="space-y-3 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">Critical</Badge>
                          <span>Critical alerts and urgent issues</span>
                        </div>
                        <Switch
                          checked={preferences.inApp.alertTypes.critical}
                          onCheckedChange={(checked) => updatePreference('inApp.alertTypes.critical', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Warning</Badge>
                          <span>Warning alerts and important updates</span>
                        </div>
                        <Switch
                          checked={preferences.inApp.alertTypes.warning}
                          onCheckedChange={(checked) => updatePreference('inApp.alertTypes.warning', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">Info</Badge>
                          <span>General information and updates</span>
                        </div>
                        <Switch
                          checked={preferences.inApp.alertTypes.info}
                          onCheckedChange={(checked) => updatePreference('inApp.alertTypes.info', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Sent:</span>
                    <span className="font-semibold">{stats.email.totalSent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivered:</span>
                    <span className="font-semibold text-green-600">{stats.email.delivered}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed:</span>
                    <span className="font-semibold text-red-600">{stats.email.failed}</span>
                  </div>
                  {stats.email.lastSent && (
                    <div className="flex justify-between">
                      <span>Last Sent:</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(stats.email.lastSent).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  SMS Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Sent:</span>
                    <span className="font-semibold">{stats.sms.totalSent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivered:</span>
                    <span className="font-semibold text-green-600">{stats.sms.delivered}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed:</span>
                    <span className="font-semibold text-red-600">{stats.sms.failed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    <div className="flex items-center gap-2">
                      {getOptInStatusIcon(stats.sms.optInStatus)}
                      <Badge variant={stats.sms.optInStatus === 'opted-in' ? 'default' : 'secondary'}>
                        {stats.sms.optInStatus}
                      </Badge>
                    </div>
                  </div>
                  {stats.sms.lastSent && (
                    <div className="flex justify-between">
                      <span>Last Sent:</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(stats.sms.lastSent).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 