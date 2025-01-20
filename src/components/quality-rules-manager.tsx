import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, AlertTriangle, Info, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { QualityRule, Severity, Condition } from '@/lib/quality-management';

interface QualityRulesManagerProps {
  dictionaryId: string;
}

interface CreateRuleFormData {
  name: string;
  description: string;
  severity: Severity;
  condition: Condition;
  field: string;
  value?: string;
}

export function QualityRulesManager({ dictionaryId }: QualityRulesManagerProps) {
  const [rules, setRules] = useState<QualityRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreateRuleFormData>({
    name: '',
    description: '',
    severity: 'warning',
    condition: 'required',
    field: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchRules();
  }, [dictionaryId]);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('quality_rules')
        .select('*')
        .eq('dictionary_id', dictionaryId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRules(data || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quality rules',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let value: any = formData.value;
      if (formData.condition === 'minLength' || formData.condition === 'maxLength') {
        value = parseInt(formData.value || '0', 10);
      } else if (formData.condition === 'enum') {
        value = formData.value?.split(',').map(v => v.trim());
      }

      const { error } = await supabase
        .from('quality_rules')
        .insert([
          {
            dictionary_id: dictionaryId,
            name: formData.name,
            description: formData.description,
            severity: formData.severity,
            condition: formData.condition,
            field: formData.field,
            value,
            created_by: user.id,
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Quality rule created successfully',
      });

      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        severity: 'warning',
        condition: 'required',
        field: '',
      });
      fetchRules();
    } catch (error) {
      console.error('Error creating rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create quality rule',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRuleStatus = async (ruleId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('quality_rules')
        .update({ enabled })
        .eq('id', ruleId);

      if (error) throw error;

      setRules(rules.map(rule =>
        rule.id === ruleId ? { ...rule, enabled } : rule
      ));

      toast({
        title: 'Success',
        description: `Rule ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling rule status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update rule status',
        variant: 'destructive',
      });
    }
  };

  const getSeverityIcon = (severity: Severity) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getValueLabel = (condition: Condition) => {
    switch (condition) {
      case 'minLength':
        return 'Minimum Length';
      case 'maxLength':
        return 'Maximum Length';
      case 'pattern':
        return 'Regular Expression';
      case 'enum':
        return 'Allowed Values (comma-separated)';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Quality Rules</h2>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Quality Rule</CardTitle>
            <CardDescription>
              Define a new quality rule for dictionary entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity</Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(value: Severity) =>
                        setFormData({ ...formData, severity: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-destructive" />
                            Error
                          </div>
                        </SelectItem>
                        <SelectItem value="warning">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            Warning
                          </div>
                        </SelectItem>
                        <SelectItem value="info">
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-500" />
                            Info
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value: Condition) =>
                        setFormData({ ...formData, condition: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="required">Required</SelectItem>
                        <SelectItem value="minLength">Minimum Length</SelectItem>
                        <SelectItem value="maxLength">Maximum Length</SelectItem>
                        <SelectItem value="pattern">Pattern Match</SelectItem>
                        <SelectItem value="enum">Allowed Values</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="field">Field</Label>
                    <Input
                      id="field"
                      value={formData.field}
                      onChange={e => setFormData({ ...formData, field: e.target.value })}
                      required
                      placeholder="e.g. name, description"
                    />
                  </div>
                  {(formData.condition === 'minLength' || 
                    formData.condition === 'maxLength' || 
                    formData.condition === 'pattern' || 
                    formData.condition === 'enum') && (
                    <div className="space-y-2">
                      <Label htmlFor="value">{getValueLabel(formData.condition)}</Label>
                      <Input
                        id="value"
                        value={formData.value || ''}
                        onChange={e => setFormData({ ...formData, value: e.target.value })}
                        required
                        placeholder={getValueLabel(formData.condition)}
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Create Rule</Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Existing Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getSeverityIcon(rule.severity)}
                <div>
                  <h3 className="font-medium">{rule.name}</h3>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {rule.condition} on {rule.field}
                </span>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(checked) => toggleRuleStatus(rule.id, checked)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}