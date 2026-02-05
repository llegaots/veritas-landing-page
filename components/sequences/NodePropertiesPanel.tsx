'use client';

import { useState, useEffect } from 'react';
import { useSequenceStore } from '@/lib/store/sequence-store';
import { SendSmsNode, SendEmailNode } from '@/lib/sequences/spec';
import type { JSONPatchOperation } from '@/lib/sequences/patches';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Mail, X, Play, Plus, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function NodePropertiesPanel() {
  const { spec, selectedNodeId, setSelectedNodeId, applyOps } = useSequenceStore();
  const [message, setMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailHtml, setEmailHtml] = useState('');
  const [emailText, setEmailText] = useState('');
  const [timingValue, setTimingValue] = useState('');
  const [timingUnit, setTimingUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [triggerType, setTriggerType] = useState<'lead.created' | 'lead.demo_booked' | 'investor.matched' | 'manual'>('lead.created');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [showVariableMapping, setShowVariableMapping] = useState(false);
  const [newVariableName, setNewVariableName] = useState('');
  const [selectedField, setSelectedField] = useState<string>('');

  // Convert step ID to node ID if needed
  // Step IDs are like "step_send_sms_123" for node "send_sms_123"
  const actualNodeId = selectedNodeId?.startsWith('step_') 
    ? selectedNodeId.replace(/^step_/, '')
    : selectedNodeId;
  
  // Find selected node (using actual node ID)
  const selectedNode = spec?.nodes.find(n => n.id === actualNodeId);
  const isSmsNode = selectedNode?.type === 'send_sms';
  const isEmailNode = selectedNode?.type === 'send_email';
  const isTriggerNode = selectedNodeId === 'trigger' || selectedNode?.type === 'trigger';
  
  // Debug logging
  if (selectedNodeId) {
    console.log('[NodePropertiesPanel] Selected node ID:', selectedNodeId);
    console.log('[NodePropertiesPanel] Actual node ID:', actualNodeId);
    console.log('[NodePropertiesPanel] Found node:', selectedNode);
    console.log('[NodePropertiesPanel] Is SMS node:', isSmsNode);
  }

  // Load node data when selection changes
  useEffect(() => {
    if (selectedNode && isSmsNode) {
      const smsNode = selectedNode as SendSmsNode;
      setMessage(smsNode.content || '');
      
      // Parse timing string (e.g., "2 hours", "30 minutes", "1 day")
      if (smsNode.timing) {
        const match = smsNode.timing.match(/^(\d+)\s*(minutes?|hours?|days?)$/i);
        if (match) {
          setTimingValue(match[1]);
          const unit = match[2].toLowerCase();
          if (unit.startsWith('minute')) setTimingUnit('minutes');
          else if (unit.startsWith('hour')) setTimingUnit('hours');
          else if (unit.startsWith('day')) setTimingUnit('days');
        } else {
          setTimingValue('');
        }
      } else {
        setTimingValue('');
      }
    } else if (selectedNode && isEmailNode) {
      const emailNode = selectedNode as SendEmailNode;
      setEmailSubject(emailNode.subject || '');
      setEmailHtml(emailNode.html_content || '');
      setEmailText(emailNode.text_content || '');
      
      // Parse timing string
      if (emailNode.timing) {
        const match = emailNode.timing.match(/^(\d+)\s*(minutes?|hours?|days?)$/i);
        if (match) {
          setTimingValue(match[1]);
          const unit = match[2].toLowerCase();
          if (unit.startsWith('minute')) setTimingUnit('minutes');
          else if (unit.startsWith('hour')) setTimingUnit('hours');
          else if (unit.startsWith('day')) setTimingUnit('days');
        } else {
          setTimingValue('');
        }
      } else {
        setTimingValue('');
      }
    } else if (isTriggerNode && spec) {
      // Load trigger type and filters
      setTriggerType(spec.trigger?.type || 'lead.created');
      const currentSource = spec.trigger?.filters?.source;
      setSourceFilter(typeof currentSource === 'string' ? currentSource : '');
    }
  }, [selectedNode, isSmsNode, isEmailNode, isTriggerNode, spec]);

  // Fetch available sources when trigger node is selected (merge DB sources with common presets)
  const { password } = useSequenceStore();
  const PRESET_SOURCES = ['Meta ads', 'Calendly', 'Paid Ads', 'Organic', 'Referral'];
  useEffect(() => {
    if (!isTriggerNode || !password) return;
    fetch(`/api/admin/sources?key=${encodeURIComponent(password)}`)
      .then((res) => (res.ok ? res.json() : { sources: [] }))
      .then((data) => {
        const fromDb = data.sources || [];
        const combined = [...new Set([...PRESET_SOURCES, ...fromDb])].sort();
        setAvailableSources(combined);
      })
      .catch(() => setAvailableSources(PRESET_SOURCES));
  }, [isTriggerNode, password]);

  // Don't render anything if no node is selected - parent will handle visibility
  if (!selectedNodeId) {
    return null;
  }

  // Handle trigger node
  if (isTriggerNode) {
    const handleTriggerSave = () => {
      if (!spec) return;

      const patches: JSONPatchOperation[] = [
        { op: 'replace', path: '/trigger/type', value: triggerType },
      ];

      // Audience filter: only run for specific source
      const existingFilters = spec.trigger?.filters || {};
      if (sourceFilter) {
        patches.push({
          op: 'replace',
          path: '/trigger/filters',
          value: { ...existingFilters, source: sourceFilter },
        });
      } else if (existingFilters.source !== undefined) {
        const { source: _, ...rest } = existingFilters;
        if (Object.keys(rest).length > 0) {
          patches.push({ op: 'replace', path: '/trigger/filters', value: rest });
        } else {
          patches.push({ op: 'remove', path: '/trigger/filters' });
        }
      }

      console.log('[NodePropertiesPanel] Saving trigger:', { triggerType, sourceFilter });
      applyOps(patches);
    };

    return (
      <div className="w-80 border-l border-gray-200 bg-white/50 backdrop-blur-sm flex flex-col">
        <Card className="border-0 shadow-none rounded-none h-full flex flex-col">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 px-4 py-3 border-b border-purple-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Play className="h-4 w-4 text-purple-600" />
                Edit Trigger
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 cursor-pointer"
                onClick={() => setSelectedNodeId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  When to Trigger
                </Label>
                <Select value={triggerType} onValueChange={(value: any) => setTriggerType(value)}>
                  <SelectTrigger className="w-full border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg bg-white transition-all duration-200 cursor-pointer text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead.created">New Lead Created</SelectItem>
                    <SelectItem value="lead.demo_booked">Demo Booked</SelectItem>
                    <SelectItem value="investor.matched">Investor Matched</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose when this sequence should start
                </p>
              </div>
              {triggerType === 'lead.created' && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Target Audience
                  </Label>
                  <Select
                    value={sourceFilter || '__all__'}
                    onValueChange={(v) => setSourceFilter(v === '__all__' ? '' : v)}
                  >
                    <SelectTrigger className="w-full border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg bg-white transition-all duration-200 cursor-pointer text-gray-900">
                      <SelectValue placeholder="All sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All sources</SelectItem>
                      {availableSources.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Only run for leads from this source (e.g. Meta ads)
                  </p>
                </div>
              )}
              <Button
                onClick={handleTriggerSave}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg cursor-pointer"
              >
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle Email node
  if (isEmailNode) {
    const handleEmailSave = () => {
      if (!spec || !selectedNode) {
        console.error('[NodePropertiesPanel] Cannot save: no spec or selectedNode');
        return;
      }

      const nodeIndex = spec.nodes.findIndex(n => n.id === actualNodeId);
      if (nodeIndex === -1) {
        console.error('[NodePropertiesPanel] Cannot find node with ID:', actualNodeId);
        return;
      }

      const currentNode = spec.nodes[nodeIndex] as SendEmailNode;
      const patches = [];

      // Update subject
      if (currentNode.subject !== emailSubject) {
        patches.push({
          op: (currentNode.subject !== undefined ? 'replace' : 'add') as 'replace' | 'add',
          path: `/nodes/${nodeIndex}/subject`,
          value: emailSubject,
        });
      }

      // Update HTML content
      if (currentNode.html_content !== emailHtml) {
        patches.push({
          op: (currentNode.html_content !== undefined ? 'replace' : 'add') as 'replace' | 'add',
          path: `/nodes/${nodeIndex}/html_content`,
          value: emailHtml,
        });
      }

      // Update text content (optional)
      if (emailText && emailText.trim() !== '') {
        if (currentNode.text_content !== emailText) {
          patches.push({
            op: (currentNode.text_content !== undefined ? 'replace' : 'add') as 'replace' | 'add',
            path: `/nodes/${nodeIndex}/text_content`,
            value: emailText,
          });
        }
      } else if (currentNode.text_content !== undefined) {
        // Remove text_content if empty
        patches.push({
          op: 'remove' as const,
          path: `/nodes/${nodeIndex}/text_content`,
        });
      }

      // Update timing
      const currentTiming = currentNode.timing;
      if (timingValue && timingValue.trim() !== '') {
        const timingString = `${timingValue} ${timingUnit}`;
        if (currentTiming !== timingString) {
          patches.push({
            op: (currentTiming !== undefined ? 'replace' : 'add') as 'replace' | 'add',
            path: `/nodes/${nodeIndex}/timing`,
            value: timingString,
          });
        }
      } else if (currentTiming !== undefined) {
        patches.push({
          op: 'remove' as const,
          path: `/nodes/${nodeIndex}/timing`,
        });
      }

      if (patches.length > 0) {
        applyOps(patches);
        console.log('[NodePropertiesPanel] Email changes applied locally');
      }
    };

    return (
      <div className="w-80 border-l border-gray-200 bg-white/50 backdrop-blur-sm flex flex-col">
        <Card className="border-0 shadow-none rounded-none h-full flex flex-col">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-4 py-3 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                Edit Email Node
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 cursor-pointer"
                onClick={() => setSelectedNodeId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 flex-1 overflow-y-auto">
            <div className="space-y-4">
              {/* Available Variables */}
              {spec?.variables && Object.keys(spec.variables).length > 0 && (
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-2 block">
                    Available Variables (Click to Add)
                  </Label>
                  <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                    {Object.keys(spec.variables).map((varName) => {
                      const fieldId = spec.variables[varName];
                      const INVESTOR_FIELDS: Record<string, string> = {
                        investor_name: 'Investor Name',
                        email_address: 'Email',
                        phone_number: 'Phone',
                        status: 'Status',
                        investor_type: 'Type',
                        amount_dollars: 'Amount',
                        deal: 'Deal',
                        source: 'Source',
                        investor_notes: 'Notes',
                      };
                      const fieldLabel = INVESTOR_FIELDS[fieldId] || fieldId;
                      
                      return (
                        <Button
                          key={varName}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const variableText = `{{${varName}}}`;
                            // Check which field is focused, otherwise default to HTML
                            const subjectInput = document.querySelector('input[placeholder*="subject"]') as HTMLInputElement;
                            const htmlTextarea = document.querySelector('textarea[placeholder*="HTML"]') as HTMLTextAreaElement;
                            
                            if (subjectInput && document.activeElement === subjectInput) {
                              setEmailSubject(prev => prev + variableText);
                            } else if (htmlTextarea && document.activeElement === htmlTextarea) {
                              setEmailHtml(prev => prev + variableText);
                            } else {
                              // Default to HTML content
                              setEmailHtml(prev => prev + variableText);
                            }
                          }}
                          className="text-xs cursor-pointer border-blue-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
                          title={`Click to add {{${varName}}} (maps to ${fieldLabel}). Inserts into the focused field (Subject or HTML), or HTML by default.`}
                        >
                          {`{{${varName}}}`}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Subject
                </Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject line. Use {{FirstName}}, {{PropertyName}}, etc."
                  className="w-full border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  HTML Content
                </Label>
                <Textarea
                  value={emailHtml}
                  onChange={(e) => setEmailHtml(e.target.value)}
                  placeholder="<html>...</html> or HTML content. Use {{FirstName}}, {{PropertyName}}, etc."
                  className="w-full min-h-[300px] font-mono text-sm border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900"
                  onFocus={(e) => {
                    // When HTML is focused, clicking variable buttons will insert there
                    e.currentTarget.setAttribute('data-focused', 'true');
                  }}
                  onBlur={(e) => {
                    e.currentTarget.removeAttribute('data-focused');
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Type variables like {'{{'}FirstName{'}}'} or click variable buttons above. Variables will be replaced with investor data.
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Plain Text Content (Optional)
                </Label>
                <Textarea
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                  placeholder="Plain text fallback (optional)"
                  className="w-full min-h-[100px] border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional plain text version for email clients that don't support HTML
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Wait Time
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={timingValue}
                    onChange={(e) => setTimingValue(e.target.value)}
                    placeholder="0"
                    className="w-20 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900"
                  />
                  <Select value={timingUnit} onValueChange={(value: any) => setTimingUnit(value)}>
                    <SelectTrigger className="flex-1 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 rounded-lg bg-white transition-all duration-200 cursor-pointer text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Wait time before sending this email (after previous step)
                </p>
              </div>

              {/* Variable Mapping Section */}
              <div className="border-t border-gray-200 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowVariableMapping(!showVariableMapping)}
                  className="w-full justify-between p-2 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Map Variables</span>
                  </div>
                  {showVariableMapping ? (
                    <ChevronUp className="h-4 w-4 text-gray-600" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-600" />
                  )}
                </Button>
                
                {showVariableMapping && (
                  <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {/* Current Mappings */}
                    {spec?.variables && Object.keys(spec.variables).length > 0 && (
                      <div>
                        <Label className="text-xs font-medium text-gray-700 mb-2 block">
                          Current Mappings
                        </Label>
                        <div className="space-y-1">
                          {Object.entries(spec.variables).map(([varName, fieldId]) => {
                            const INVESTOR_FIELDS: Record<string, string> = {
                              investor_name: 'Investor Name',
                              email_address: 'Email',
                              phone_number: 'Phone',
                              status: 'Status',
                              investor_type: 'Type',
                              amount_dollars: 'Amount',
                              deal: 'Deal',
                              source: 'Source',
                              investor_notes: 'Notes',
                            };
                            const fieldLabel = INVESTOR_FIELDS[fieldId] || fieldId;
                            
                            return (
                              <div
                                key={varName}
                                className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 text-xs"
                              >
                                <div>
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mr-2">
                                    {`{{${varName}}}`}
                                  </Badge>
                                  <span className="text-gray-600">→ {fieldLabel}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newMappings = { ...spec.variables };
                                    delete newMappings[varName];
                                    applyOps([{
                                      op: 'replace' as const,
                                      path: '/variables',
                                      value: newMappings,
                                    }]);
                                  }}
                                  className="h-5 w-5 p-0 cursor-pointer hover:bg-red-50 hover:text-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Add New Mapping */}
                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-2 block">
                        Add New Variable
                      </Label>
                      <div className="space-y-2">
                        <Input
                          value={newVariableName}
                          onChange={(e) => setNewVariableName(e.target.value)}
                          placeholder="Variable name (e.g., FirstName)"
                          className="text-xs border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 text-gray-900"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newVariableName && selectedField) {
                              handleAddVariable();
                            }
                          }}
                        />
                        <Select value={selectedField} onValueChange={setSelectedField}>
                          <SelectTrigger className="text-xs border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer text-gray-900">
                            <SelectValue placeholder="Select investor field" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="investor_name">Investor Name</SelectItem>
                            <SelectItem value="email_address">Email Address</SelectItem>
                            <SelectItem value="phone_number">Phone Number</SelectItem>
                            <SelectItem value="status">Status</SelectItem>
                            <SelectItem value="investor_type">Investor Type</SelectItem>
                            <SelectItem value="amount_dollars">Amount ($)</SelectItem>
                            <SelectItem value="deal">Deal</SelectItem>
                            <SelectItem value="source">Source</SelectItem>
                            <SelectItem value="investor_notes">Investor Notes</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={handleAddVariable}
                          disabled={!newVariableName.trim() || !selectedField}
                          size="sm"
                          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white cursor-pointer text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Variable
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleEmailSave}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg cursor-pointer"
              >
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle SMS node (existing code)
  if (!isSmsNode) {
    return (
      <div className="w-80 border-l border-gray-200 bg-white/50 backdrop-blur-sm p-4">
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="h-6 w-6 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600">
            Select an SMS or Email node to edit its properties
          </p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (!spec || !selectedNode) {
      console.error('[NodePropertiesPanel] Cannot save: no spec or selectedNode');
      return;
    }

    // Use actualNodeId to find the node in spec
    const nodeIndex = spec.nodes.findIndex(n => n.id === actualNodeId);
    if (nodeIndex === -1) {
      console.error('[NodePropertiesPanel] Cannot find node with ID:', actualNodeId);
      console.log('[NodePropertiesPanel] Available node IDs:', spec.nodes.map(n => n.id));
      return;
    }

    const currentNode = spec.nodes[nodeIndex] as SendSmsNode;
    const patches = [];

    // Update message - check if content exists, use 'add' if it doesn't, 'replace' if it does
    const currentContent = currentNode.content;
    if (currentContent !== undefined) {
      if (currentContent !== message) {
        patches.push({
          op: 'replace' as const,
          path: `/nodes/${nodeIndex}/content`,
          value: message,
        });
      }
    } else {
      patches.push({
        op: 'add' as const,
        path: `/nodes/${nodeIndex}/content`,
        value: message,
      });
    }

    // Update timing
    const currentTiming = currentNode.timing;
    if (timingValue && timingValue.trim() !== '') {
      const timingString = `${timingValue} ${timingUnit}`;
      if (currentTiming !== timingString) {
        if (currentTiming !== undefined) {
          patches.push({
            op: 'replace' as const,
            path: `/nodes/${nodeIndex}/timing`,
            value: timingString,
          });
        } else {
          patches.push({
            op: 'add' as const,
            path: `/nodes/${nodeIndex}/timing`,
            value: timingString,
          });
        }
      }
    } else {
      // Remove timing if empty and it exists
      if (currentTiming !== undefined) {
        patches.push({
          op: 'remove' as const,
          path: `/nodes/${nodeIndex}/timing`,
        });
      }
    }

    if (patches.length > 0) {
      console.log('[NodePropertiesPanel] Saving changes to node:', {
        selectedNodeId,
        actualNodeId,
        nodeIndex,
        currentNodeId: currentNode.id,
        patches,
      });
      applyOps(patches);
      // DON'T call commitOpsToServer - user will click main "Save" button to persist
      console.log('[NodePropertiesPanel] Changes applied locally. Click main "Save" button to persist.');
    } else {
      console.log('[NodePropertiesPanel] No changes to save');
    }
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white/50 backdrop-blur-sm flex flex-col">
      <Card className="border-0 shadow-none rounded-none h-full flex flex-col">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 px-4 py-3 border-b border-purple-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              Edit SMS Node
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 cursor-pointer"
              onClick={() => setSelectedNodeId(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-1 overflow-y-auto">
          <div className="space-y-4">
            {/* Available Variables */}
            {spec?.variables && Object.keys(spec.variables).length > 0 && (
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-2 block">
                  Available Variables (Click to Add)
                </Label>
                <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  {Object.keys(spec.variables).map((varName) => {
                    const fieldId = spec.variables[varName];
                    const INVESTOR_FIELDS: Record<string, string> = {
                      investor_name: 'Investor Name',
                      email_address: 'Email',
                      phone_number: 'Phone',
                      status: 'Status',
                      investor_type: 'Type',
                      amount_dollars: 'Amount',
                      deal: 'Deal',
                      source: 'Source',
                      investor_notes: 'Notes',
                    };
                    const fieldLabel = INVESTOR_FIELDS[fieldId] || fieldId;
                    
                    return (
                      <Button
                        key={varName}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const variableText = `{{${varName}}}`;
                          setMessage(prev => prev + variableText);
                        }}
                        className="text-xs cursor-pointer border-purple-200 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {`{{${varName}}}`}
                        <span className="ml-1 text-gray-400 text-[10px]">({fieldLabel})</span>
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Click a variable to insert it into your message
                </p>
              </div>
            )}

            {/* Message Content */}
            <div>
              <Label htmlFor="message" className="text-sm font-medium text-gray-700 mb-2 block">
                Message Content
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your SMS message here. Use {{FirstName}}, {{PropertyName}}, {{CalendarLink}} for personalization."
                className="min-h-[120px] border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {message.length} characters
              </p>
            </div>

            {/* Timing */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Send After
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={timingValue}
                  onChange={(e) => setTimingValue(e.target.value)}
                  placeholder="e.g., 2"
                  className="flex-1 border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg transition-all duration-200 text-gray-900"
                />
                <Select value={timingUnit} onValueChange={(value: any) => setTimingUnit(value)}>
                  <SelectTrigger className="w-32 border-gray-200 hover:border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 rounded-lg bg-white transition-all duration-200 cursor-pointer text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                When to send this message after the previous step
              </p>
            </div>

            {/* Variable Mapping Section */}
            <div className="border-t border-gray-200 pt-4">
              <Button
                variant="ghost"
                onClick={() => setShowVariableMapping(!showVariableMapping)}
                className="w-full justify-between p-2 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Map Variables</span>
                </div>
                {showVariableMapping ? (
                  <ChevronUp className="h-4 w-4 text-gray-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                )}
              </Button>
              
              {showVariableMapping && (
                <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  {/* Current Mappings */}
                  {spec?.variables && Object.keys(spec.variables).length > 0 && (
                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-2 block">
                        Current Mappings
                      </Label>
                      <div className="space-y-1">
                        {Object.entries(spec.variables).map(([varName, fieldId]) => {
                          const INVESTOR_FIELDS: Record<string, string> = {
                            investor_name: 'Investor Name',
                            email_address: 'Email',
                            phone_number: 'Phone',
                            status: 'Status',
                            investor_type: 'Type',
                            amount_dollars: 'Amount',
                            deal: 'Deal',
                            source: 'Source',
                            investor_notes: 'Notes',
                          };
                          const fieldLabel = INVESTOR_FIELDS[fieldId] || fieldId;
                          
                          return (
                            <div
                              key={varName}
                              className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 text-xs"
                            >
                              <div>
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 mr-2">
                                  {`{{${varName}}}`}
                                </Badge>
                                <span className="text-gray-600">→ {fieldLabel}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newMappings = { ...spec.variables };
                                  delete newMappings[varName];
                                  applyOps([{
                                    op: 'replace' as const,
                                    path: '/variables',
                                    value: newMappings,
                                  }]);
                                }}
                                className="h-5 w-5 p-0 cursor-pointer hover:bg-red-50 hover:text-red-600"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add New Mapping */}
                  <div>
                    <Label className="text-xs font-medium text-gray-700 mb-2 block">
                      Add New Variable
                    </Label>
                    <div className="space-y-2">
                      <Input
                        value={newVariableName}
                        onChange={(e) => setNewVariableName(e.target.value)}
                        placeholder="Variable name (e.g., FirstName)"
                        className="text-xs border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 text-gray-900"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newVariableName && selectedField) {
                            handleAddVariable();
                          }
                        }}
                      />
                      <Select value={selectedField} onValueChange={setSelectedField}>
                        <SelectTrigger className="text-xs border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer text-gray-900">
                          <SelectValue placeholder="Select investor field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="investor_name">Investor Name</SelectItem>
                          <SelectItem value="email_address">Email Address</SelectItem>
                          <SelectItem value="phone_number">Phone Number</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="investor_type">Investor Type</SelectItem>
                          <SelectItem value="amount_dollars">Amount ($)</SelectItem>
                          <SelectItem value="deal">Deal</SelectItem>
                          <SelectItem value="source">Source</SelectItem>
                          <SelectItem value="investor_notes">Investor Notes</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleAddVariable}
                        disabled={!newVariableName.trim() || !selectedField}
                        size="sm"
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white cursor-pointer text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Variable
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg cursor-pointer"
            >
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  function handleAddVariable() {
    if (!newVariableName.trim() || !selectedField || !spec) return;

    const variableName = newVariableName.trim();
    
    // Validate variable name
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(variableName)) {
      alert('Variable name must start with a letter and contain only letters and numbers');
      return;
    }

    const newMappings = {
      ...(spec.variables || {}),
      [variableName]: selectedField,
    };

    applyOps([{
      op: 'replace' as const,
      path: '/variables',
      value: newMappings,
    }]);

    setNewVariableName('');
    setSelectedField('');
  }
}

