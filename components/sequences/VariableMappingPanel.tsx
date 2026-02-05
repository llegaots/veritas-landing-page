'use client';

import { useState, useEffect } from 'react';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { GripVertical, X, Plus, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Available investor fields that can be mapped
const INVESTOR_FIELDS = [
  { id: 'investor_name', label: 'Investor Name', description: 'Full name of the investor', example: 'John Smith' },
  { id: 'email_address', label: 'Email Address', description: 'Email address', example: 'john@example.com' },
  { id: 'phone_number', label: 'Phone Number', description: 'Phone number', example: '+1 555-1234' },
  { id: 'status', label: 'Status', description: 'Investor status', example: 'New Lead' },
  { id: 'investor_type', label: 'Investor Type', description: 'Type of investor', example: 'Accredited' },
  { id: 'amount_dollars', label: 'Amount ($)', description: 'Investment amount', example: '$50,000' },
  { id: 'deal', label: 'Deal', description: 'Deal name', example: 'Property A' },
  { id: 'source', label: 'Source', description: 'Lead source', example: 'Calendly' },
  { id: 'investor_notes', label: 'Investor Notes', description: 'Additional notes', example: 'Interested in...' },
];

// Common variable names that are often used
const COMMON_VARIABLES = [
  { name: 'FirstName', description: 'First name (extracted from Investor Name)' },
  { name: 'LastName', description: 'Last name (extracted from Investor Name)' },
  { name: 'FullName', description: 'Full investor name' },
  { name: 'PropertyName', description: 'Property or deal name' },
  { name: 'CalendarLink', description: 'Link to schedule a call' },
  { name: 'Email', description: 'Email address' },
  { name: 'Phone', description: 'Phone number' },
];

export function VariableMappingPanel() {
  const { spec, applyOps } = useSequenceStore();
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [newVariableName, setNewVariableName] = useState('');
  const [selectedField, setSelectedField] = useState<string>('');

  // Load existing mappings from spec
  useEffect(() => {
    if (spec?.variables) {
      setMappings(spec.variables);
    }
  }, [spec]);

  // Save mappings to spec
  const saveMappings = () => {
    if (!spec) return;

    const patches = [{
      op: 'replace' as const,
      path: '/variables',
      value: mappings,
    }];

    applyOps(patches);
  };

  // Add a new variable mapping
  const addMapping = () => {
    if (!newVariableName.trim() || !selectedField) return;

    const variableName = newVariableName.trim();
    
    // Validate variable name (alphanumeric, no spaces)
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(variableName)) {
      alert('Variable name must start with a letter and contain only letters and numbers');
      return;
    }

    setMappings(prev => ({
      ...prev,
      [variableName]: selectedField,
    }));

    setNewVariableName('');
    setSelectedField('');
  };

  // Remove a mapping
  const removeMapping = (variableName: string) => {
    const newMappings = { ...mappings };
    delete newMappings[variableName];
    setMappings(newMappings);
  };

  // Auto-save when mappings change (debounced)
  useEffect(() => {
    if (!spec) return;
    
    const timer = setTimeout(() => {
      // Only save if mappings have actually changed
      const currentMappings = spec.variables || {};
      const mappingsChanged = JSON.stringify(mappings) !== JSON.stringify(currentMappings);
      
      if (mappingsChanged) {
        saveMappings();
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappings]);

  return (
    <Card className="bg-white border-gray-200 shadow-sm rounded-xl">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 px-4 py-3 border-b border-purple-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-900">Variable Mapping</CardTitle>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500">Use in SMS: {'{{VariableName}}'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Current Mappings */}
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-2 block">
            Current Mappings
          </Label>
          {Object.keys(mappings).length === 0 ? (
            <div className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-lg">
              No variables mapped yet. Add one below.
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(mappings).map(([variableName, fieldId]) => {
                const field = INVESTOR_FIELDS.find(f => f.id === fieldId);
                return (
                  <div
                    key={variableName}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {`{{${variableName}}}`}
                        </Badge>
                        <span className="text-gray-400">→</span>
                        <span className="text-sm text-gray-700 font-medium">
                          {field?.label || fieldId}
                        </span>
                      </div>
                      {field?.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{field.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMapping(variableName)}
                      className="h-6 w-6 p-0 cursor-pointer hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add New Mapping */}
        <div className="border-t border-gray-200 pt-4">
          <Label className="text-xs font-medium text-gray-700 mb-2 block">
            Add New Variable
          </Label>
          <div className="space-y-2">
            <div>
              <Label htmlFor="variable-name" className="text-xs text-gray-600 mb-1 block">
                Variable Name (use in SMS as {'{{VariableName}}'})
              </Label>
              <div className="flex gap-2">
                <Input
                  id="variable-name"
                  value={newVariableName}
                  onChange={(e) => setNewVariableName(e.target.value)}
                  placeholder="e.g., FirstName"
                  className="flex-1 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 text-gray-900 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newVariableName && selectedField) {
                      addMapping();
                    }
                  }}
                />
                <Select value={selectedField} onValueChange={setSelectedField}>
                  <SelectTrigger className="w-48 border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer text-gray-900 text-sm">
                    <SelectValue placeholder="Select investor field" />
                  </SelectTrigger>
                  <SelectContent>
                    {INVESTOR_FIELDS.map((field) => (
                      <SelectItem key={field.id} value={field.id}>
                        <div>
                          <div className="font-medium">{field.label}</div>
                          <div className="text-xs text-gray-500">{field.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={addMapping}
                  disabled={!newVariableName.trim() || !selectedField}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Variable names must start with a letter and contain only letters and numbers
              </p>
            </div>
          </div>
        </div>

        {/* Quick Add Common Variables */}
        <div className="border-t border-gray-200 pt-4">
          <Label className="text-xs font-medium text-gray-700 mb-2 block">
            Quick Add Common Variables
          </Label>
          <div className="flex flex-wrap gap-2">
            {COMMON_VARIABLES.map((variable) => {
              const isMapped = mappings[variable.name] !== undefined;
              const suggestedField = variable.name === 'FirstName' || variable.name === 'FullName' 
                ? 'investor_name'
                : variable.name === 'PropertyName'
                ? 'deal'
                : variable.name === 'Email'
                ? 'email_address'
                : variable.name === 'Phone'
                ? 'phone_number'
                : null;

              return (
                <Button
                  key={variable.name}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isMapped) {
                      removeMapping(variable.name);
                    } else if (suggestedField) {
                      setMappings(prev => ({
                        ...prev,
                        [variable.name]: suggestedField,
                      }));
                    }
                  }}
                  className={`text-xs cursor-pointer ${
                    isMapped
                      ? 'bg-purple-50 border-purple-300 text-purple-700'
                      : 'border-gray-200 hover:bg-purple-50 hover:border-purple-300'
                  }`}
                >
                  {isMapped ? '✓ ' : ''}
                  {`{{${variable.name}}}`}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        {Object.keys(mappings).length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <Label className="text-xs font-medium text-gray-700 mb-2 block">
              Preview
            </Label>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-600 mb-2">Example SMS message:</p>
              <p className="text-sm text-gray-900 font-mono">
                Hi {`{{${Object.keys(mappings)[0]}}}`}, thanks for your interest!
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Available variables: {Object.keys(mappings).map(v => `{{${v}}}`).join(', ')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

