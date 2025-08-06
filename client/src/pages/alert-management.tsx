import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, TestTube, Bell, Mail, MessageSquare, Globe } from 'lucide-react';

interface AlertRule {
  id: string;
  name: string;
  description?: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  isActive: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cooldownPeriod?: number;
  createdAt: string;
  updatedAt: string;
}

interface AlertCondition {
  type: 'rating_threshold' | 'keyword_detection' | 'volume_based' | 'time_based' | 'custom';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'contains' | 'not_contains' | 'regex';
  field: string;
  value: any;
  additionalParams?: Record<string, any>;
}

interface AlertAction {
  type: 'email' | 'sms' | 'webhook' | 'notification' | 'escalation';
  recipients?: string[];
  phoneNumbers?: string[];
  url?: string;
  template?: string;
  delay?: number;
  retryCount?: number;
  retryInterval?: number;
}

interface AlertNotification {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  isRead: boolean;
  isAcknowledged: boolean;
  createdAt: string;
  feedbackId?: string;
}

export default function AlertManagement() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { toast } = useToast();
  
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testRule, setTestRule] = useState<AlertRule | null>(null);
  const [testFeedback, setTestFeedback] = useState({
    overallRating: 5,
    customerName: 'Test Customer',
    feedbackText: 'Test feedback message',
    customerEmail: 'test@example.com'
  });

  // Form state for creating/editing rules
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    priority: 'medium' as const,
    isActive: true,
    cooldownPeriod: 30,
    conditions: [] as AlertCondition[],
    actions: [] as AlertAction[]
  });

  useEffect(() => {
    if (tenantId) {
      loadAlertRules();
      loadAlertNotifications();
    }
  }, [tenantId]);

  const loadAlertRules = async () => {
    try {
      const response = await fetch(`/api/alerts/rules/${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setRules(data);
      }
    } catch (error) {
      console.error('Error loading alert rules:', error);
      toast({
        title: "Error",
        description: "Failed to load alert rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAlertNotifications = async () => {
    try {
      const response = await fetch(`/api/alerts/notifications/${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error loading alert notifications:', error);
    }
  };

  const handleCreateRule = async () => {
    try {
      const response = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ruleForm,
          tenantId
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Alert rule created successfully",
        });
        setShowCreateDialog(false);
        resetForm();
        loadAlertRules();
      } else {
        throw new Error('Failed to create rule');
      }
    } catch (error) {
      console.error('Error creating alert rule:', error);
      toast({
        title: "Error",
        description: "Failed to create alert rule",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    try {
      const response = await fetch(`/api/alerts/rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ruleForm,
          tenantId
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Alert rule updated successfully",
        });
        setEditingRule(null);
        resetForm();
        loadAlertRules();
      } else {
        throw new Error('Failed to update rule');
      }
    } catch (error) {
      console.error('Error updating alert rule:', error);
      toast({
        title: "Error",
        description: "Failed to update alert rule",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) return;

    try {
      const response = await fetch(`/api/alerts/rules/${ruleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Alert rule deleted successfully",
        });
        loadAlertRules();
      } else {
        throw new Error('Failed to delete rule');
      }
    } catch (error) {
      console.error('Error deleting alert rule:', error);
      toast({
        title: "Error",
        description: "Failed to delete alert rule",
        variant: "destructive",
      });
    }
  };

  const handleTestRule = async () => {
    if (!testRule) return;

    try {
      const response = await fetch(`/api/alerts/rules/${testRule.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: testFeedback })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Test Result",
          description: result.triggered ? `Rule triggered: ${result.message}` : 'Rule did not trigger',
          variant: result.triggered ? "default" : "secondary",
        });
      } else {
        throw new Error('Failed to test rule');
      }
    } catch (error) {
      console.error('Error testing alert rule:', error);
      toast({
        title: "Error",
        description: "Failed to test alert rule",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setRuleForm({
      name: '',
      description: '',
      priority: 'medium',
      isActive: true,
      cooldownPeriod: 30,
      conditions: [],
      actions: []
    });
  };

  const addCondition = () => {
    setRuleForm(prev => ({
      ...prev,
      conditions: [...prev.conditions, {
        type: 'rating_threshold',
        operator: 'less_than',
        field: 'overallRating',
        value: 3
      }]
    }));
  };

  const removeCondition = (index: number) => {
    setRuleForm(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const addAction = () => {
    setRuleForm(prev => ({
      ...prev,
      actions: [...prev.actions, {
        type: 'email',
        recipients: []
      }]
    }));
  };

  const removeAction = (index: number) => {
    setRuleForm(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      case 'info': return 'default';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'default';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading alert management...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Alert Management</h1>
          <p className="text-muted-foreground">Configure and manage alert rules for your feedback system</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Alert Rule
        </Button>
      </div>

      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          <TabsTrigger value="notifications">Alert History</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <div className="grid gap-6">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        {rule.name}
                        <Badge variant={getPriorityColor(rule.priority)}>
                          {rule.priority}
                        </Badge>
                        <Badge variant={rule.isActive ? "default" : "secondary"}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{rule.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTestRule(rule);
                          setShowTestDialog(true);
                        }}
                      >
                        <TestTube className="w-4 h-4 mr-2" />
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingRule(rule);
                          setRuleForm({
                            name: rule.name,
                            description: rule.description || '',
                            priority: rule.priority,
                            isActive: rule.isActive,
                            cooldownPeriod: rule.cooldownPeriod || 30,
                            conditions: rule.conditions,
                            actions: rule.actions
                          });
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Conditions</h4>
                      <div className="space-y-2">
                        {rule.conditions.map((condition, index) => (
                          <div key={index} className="text-sm p-2 bg-muted rounded">
                            {condition.type}: {condition.field} {condition.operator} {condition.value}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Actions</h4>
                      <div className="space-y-2">
                        {rule.actions.map((action, index) => (
                          <div key={index} className="text-sm p-2 bg-muted rounded flex items-center gap-2">
                            {action.type === 'email' && <Mail className="w-4 h-4" />}
                            {action.type === 'sms' && <MessageSquare className="w-4 h-4" />}
                            {action.type === 'webhook' && <Globe className="w-4 h-4" />}
                            {action.type}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="grid gap-4">
            {notifications.map((notification) => (
              <Card key={notification.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{notification.title}</h3>
                        <Badge variant={getSeverityColor(notification.severity)}>
                          {notification.severity}
                        </Badge>
                        {!notification.isRead && (
                          <Badge variant="default">New</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!notification.isRead && (
                        <Button variant="outline" size="sm">
                          Mark Read
                        </Button>
                      )}
                      {!notification.isAcknowledged && (
                        <Button variant="outline" size="sm">
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Total Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{rules.length}</div>
                <p className="text-sm text-muted-foreground">
                  {rules.filter(r => r.isActive).length} active
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{notifications.length}</div>
                <p className="text-sm text-muted-foreground">
                  {notifications.filter(n => !n.isRead).length} unread
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Critical Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {notifications.filter(n => n.severity === 'critical').length}
                </div>
                <p className="text-sm text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Rule Dialog */}
      <Dialog open={showCreateDialog || !!editingRule} onOpenChange={() => {
        setShowCreateDialog(false);
        setEditingRule(null);
        resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
            </DialogTitle>
            <DialogDescription>
              Configure conditions and actions for this alert rule
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Rule Name</Label>
                <Input
                  id="name"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Low Rating Alert"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={ruleForm.priority}
                  onValueChange={(value: any) => setRuleForm(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={ruleForm.description}
                onChange={(e) => setRuleForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this alert rule does..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cooldown">Cooldown Period (minutes)</Label>
                <Input
                  id="cooldown"
                  type="number"
                  value={ruleForm.cooldownPeriod}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, cooldownPeriod: parseInt(e.target.value) || 30 }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={ruleForm.isActive}
                  onCheckedChange={(checked) => setRuleForm(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Conditions</h3>
                <Button variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Condition
                </Button>
              </div>
              <div className="space-y-4">
                {ruleForm.conditions.map((condition, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={condition.type}
                          onValueChange={(value: any) => {
                            const newConditions = [...ruleForm.conditions];
                            newConditions[index].type = value;
                            setRuleForm(prev => ({ ...prev, conditions: newConditions }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rating_threshold">Rating Threshold</SelectItem>
                            <SelectItem value="keyword_detection">Keyword Detection</SelectItem>
                            <SelectItem value="volume_based">Volume Based</SelectItem>
                            <SelectItem value="time_based">Time Based</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Field</Label>
                        <Input
                          value={condition.field}
                          onChange={(e) => {
                            const newConditions = [...ruleForm.conditions];
                            newConditions[index].field = e.target.value;
                            setRuleForm(prev => ({ ...prev, conditions: newConditions }));
                          }}
                        />
                      </div>
                      <div>
                        <Label>Operator</Label>
                        <Select
                          value={condition.operator}
                          onValueChange={(value: any) => {
                            const newConditions = [...ruleForm.conditions];
                            newConditions[index].operator = value;
                            setRuleForm(prev => ({ ...prev, conditions: newConditions }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals</SelectItem>
                            <SelectItem value="not_equals">Not Equals</SelectItem>
                            <SelectItem value="greater_than">Greater Than</SelectItem>
                            <SelectItem value="less_than">Less Than</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="not_contains">Not Contains</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Value</Label>
                        <Input
                          value={condition.value}
                          onChange={(e) => {
                            const newConditions = [...ruleForm.conditions];
                            newConditions[index].value = e.target.value;
                            setRuleForm(prev => ({ ...prev, conditions: newConditions }));
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => removeCondition(index)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Actions</h3>
                <Button variant="outline" size="sm" onClick={addAction}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Action
                </Button>
              </div>
              <div className="space-y-4">
                {ruleForm.actions.map((action, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={action.type}
                          onValueChange={(value: any) => {
                            const newActions = [...ruleForm.actions];
                            newActions[index].type = value;
                            setRuleForm(prev => ({ ...prev, actions: newActions }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="webhook">Webhook</SelectItem>
                            <SelectItem value="notification">In-App Notification</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>
                          {action.type === 'email' ? 'Recipients (comma-separated)' :
                           action.type === 'sms' ? 'Phone Numbers (comma-separated)' :
                           action.type === 'webhook' ? 'Webhook URL' : 'Configuration'}
                        </Label>
                        <Input
                          value={
                            action.type === 'email' ? action.recipients?.join(', ') :
                            action.type === 'sms' ? action.phoneNumbers?.join(', ') :
                            action.url || ''
                          }
                          onChange={(e) => {
                            const newActions = [...ruleForm.actions];
                            if (action.type === 'email') {
                              newActions[index].recipients = e.target.value.split(',').map(s => s.trim());
                            } else if (action.type === 'sms') {
                              newActions[index].phoneNumbers = e.target.value.split(',').map(s => s.trim());
                            } else if (action.type === 'webhook') {
                              newActions[index].url = e.target.value;
                            }
                            setRuleForm(prev => ({ ...prev, actions: newActions }));
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => removeAction(index)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingRule(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingRule ? handleUpdateRule : handleCreateRule}
                disabled={!ruleForm.name || ruleForm.conditions.length === 0 || ruleForm.actions.length === 0}
              >
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Rule Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Alert Rule</DialogTitle>
            <DialogDescription>
              Test this rule with sample feedback data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="test-rating">Rating</Label>
              <Select
                value={testFeedback.overallRating.toString()}
                onValueChange={(value) => setTestFeedback(prev => ({ ...prev, overallRating: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Star</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="test-name">Customer Name</Label>
              <Input
                id="test-name"
                value={testFeedback.customerName}
                onChange={(e) => setTestFeedback(prev => ({ ...prev, customerName: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="test-feedback">Feedback Text</Label>
              <Textarea
                id="test-feedback"
                value={testFeedback.feedbackText}
                onChange={(e) => setTestFeedback(prev => ({ ...prev, feedbackText: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTestDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleTestRule}>
                <TestTube className="w-4 h-4 mr-2" />
                Test Rule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 