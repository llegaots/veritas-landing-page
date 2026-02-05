'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'

interface EditableCellProps {
  value: string | number | null
  type: 'text' | 'select' | 'phone' | 'amount'
  options?: string[] // For select type
  onSave: (newValue: string | number | null) => Promise<void>
  onAddOption?: (newOption: string) => void // Callback when a new option is added
  className?: string
  placeholder?: string
  displayAsBadge?: boolean // For status/source to show as badge when not editing
  creatable?: boolean // Allow creating new options
}

export function EditableCell({
  value,
  type,
  options = [],
  onSave,
  onAddOption,
  className = '',
  placeholder = '',
  displayAsBadge = false,
  creatable = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState<string>(value?.toString() || '')
  const [isSaving, setIsSaving] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [localOptions, setLocalOptions] = useState<string[]>(options)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectRef = useRef<HTMLButtonElement>(null)

  const [forceOpen, setForceOpen] = useState(false)

  // Update local options when options prop changes (only if different)
  const optionsKey = options.join('|')
  const prevOptionsKeyRef = useRef<string>('')
  
  useEffect(() => {
    // Only update if the options actually changed
    if (optionsKey !== prevOptionsKeyRef.current) {
      prevOptionsKeyRef.current = optionsKey
      setLocalOptions([...options])
    }
  }, [optionsKey, options])

  useEffect(() => {
    if (isEditing) {
      if (type === 'select') {
        // Force dropdown to open immediately
        setForceOpen(true)
      } else if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    } else {
      setForceOpen(false)
    }
  }, [isEditing, type])

  // Update editValue when value prop changes (after save)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value?.toString() || '')
    }
  }, [value, isEditing])

  const handleClick = () => {
    setEditValue(value?.toString() || '')
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (isSaving) return
    
    setIsSaving(true)
    try {
      let finalValue: string | number | null = editValue.trim()
      
      if (type === 'amount') {
        // Remove $ and commas, parse as number
        const cleaned = editValue.replace(/[$,]/g, '')
        finalValue = cleaned ? parseFloat(cleaned) : null
      } else if (type === 'phone') {
        finalValue = editValue || null
      } else {
        finalValue = editValue || null
      }

      await onSave(finalValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving:', error)
      // Keep editing on error
    } finally {
      setIsSaving(false)
    }
  }

  const handleBlur = () => {
    // Auto-save on blur
    if (editValue !== (value?.toString() || '')) {
      handleSave()
    } else {
      setIsEditing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditValue(value?.toString() || '')
      setIsEditing(false)
    }
  }

  if (isEditing) {
    if (type === 'select') {
      // Filter options based on search, or show all if no search
      const filteredOptions = searchValue
        ? localOptions.filter(opt => 
            opt.toLowerCase().includes(searchValue.toLowerCase())
          )
        : localOptions

      // Check if search value is a new option
      const isNewOption = searchValue && 
        searchValue.trim() !== '' && 
        !localOptions.some(opt => opt.toLowerCase() === searchValue.toLowerCase().trim()) &&
        creatable

      const allOptions = isNewOption 
        ? [...filteredOptions, `+ Add "${searchValue.trim()}"`]
        : filteredOptions

      return (
        <div className="relative">
          <Select
            value={editValue}
            onValueChange={(newValue) => {
              // Check if this is the "Add new" option
              if (newValue.startsWith('__CREATE__')) {
                const newOption = newValue.replace('__CREATE__', '').trim()
                if (newOption && creatable) {
                  // Add to local options
                  const updatedOptions = [...localOptions, newOption]
                  setLocalOptions(updatedOptions)
                  setEditValue(newOption)
                  // Notify parent about new option
                  onAddOption?.(newOption)
                  // Save the new value
                  onSave(newOption).then(() => {
                    setIsEditing(false)
                    setSearchValue('')
                  }).catch(() => {
                    // Keep editing on error
                  })
                }
              } else {
                setEditValue(newValue)
                // Auto-save when value changes
                const finalValue = newValue || null
                onSave(finalValue).then(() => {
                  setIsEditing(false)
                  setSearchValue('')
                }).catch(() => {
                  // Keep editing on error
                })
              }
            }}
            onOpenChange={(open) => {
              if (!open && !isSaving) {
                setForceOpen(false)
                setSearchValue('')
                // If dropdown closes and value hasn't changed, just exit edit mode
                if (editValue === (value?.toString() || '')) {
                  setIsEditing(false)
                }
              } else if (open) {
                setForceOpen(true)
              }
            }}
            open={forceOpen || isEditing} // Force open immediately
          >
            <SelectTrigger
              ref={selectRef}
              className="h-8 border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 admin-font"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setEditValue(value?.toString() || '')
                  setIsEditing(false)
                  setSearchValue('')
                }
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {creatable && (
                <div className="px-2 py-1.5 border-b border-gray-200 sticky top-0 bg-white z-10">
                  <Input
                    value={searchValue}
                    onChange={(e) => {
                      e.stopPropagation()
                      setSearchValue(e.target.value)
                    }}
                    placeholder="Type to search or create..."
                    className="h-7 text-sm admin-font"
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => {
                      e.stopPropagation()
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      if (e.key === 'Enter' && isNewOption) {
                        e.preventDefault()
                        const newOption = searchValue.trim()
                        if (newOption) {
                          const updatedOptions = [...localOptions, newOption]
                          setLocalOptions(updatedOptions)
                          setEditValue(newOption)
                          onAddOption?.(newOption)
                          onSave(newOption).then(() => {
                            setIsEditing(false)
                            setSearchValue('')
                          })
                        }
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        setSearchValue('')
                        setIsEditing(false)
                      }
                    }}
                    autoFocus
                    ref={(el) => {
                      if (el && isEditing && creatable && forceOpen) {
                        // Ensure focus stays on input when dropdown opens
                        setTimeout(() => {
                          if (document.activeElement !== el) {
                            el.focus()
                          }
                        }, 50)
                      }
                    }}
                  />
                </div>
              )}
              <div className="max-h-[200px] overflow-y-auto">
                {allOptions.length > 0 ? (
                  allOptions.map((option) => (
                    <SelectItem 
                      key={option} 
                      value={option.startsWith('+ Add "') ? `__CREATE__${searchValue.trim()}` : option}
                      className={option.startsWith('+ Add "') ? 'text-purple-600 font-semibold bg-purple-50' : 'admin-font'}
                    >
                      {option.startsWith('+ Add "') ? (
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          <span>{option}</span>
                        </div>
                      ) : (
                        option
                      )}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-sm text-gray-500 admin-font">No options</div>
                )}
              </div>
            </SelectContent>
          </Select>
        </div>
      )
    }

    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={isSaving}
        className={`h-8 border-purple-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 ${className}`}
        type={type === 'amount' ? 'text' : type === 'phone' ? 'tel' : 'text'}
        placeholder={placeholder}
      />
    )
  }

  // Display value
  const displayValue = value?.toString() || '-'
  
  if (displayAsBadge && value) {
    // Determine badge color based on value
    let badgeClass = 'bg-gray-400 text-white border-0 shadow-sm font-medium px-3 py-1';
    if (type === 'select') {
      const val = value.toString().toLowerCase();
      if (val === 'new lead') {
        badgeClass = 'bg-green-500 text-white border-0 shadow-sm font-medium px-3 py-1';
      } else if (val === 'contacted') {
        badgeClass = 'bg-green-400 text-white border-0 shadow-sm font-medium px-3 py-1';
      } else if (val.includes('calendly') || val.includes('calendar')) {
        badgeClass = 'bg-blue-500 text-white border-0 shadow-sm font-medium px-3 py-1';
      } else if (val.includes('paid') || val.includes('ads')) {
        badgeClass = 'bg-indigo-500 text-white border-0 shadow-sm font-medium px-3 py-1';
      }
    }
    
    return (
      <div
        onClick={handleClick}
        className="cursor-pointer max-w-full"
        title={`${displayValue} - Click to edit`}
      >
        <Badge className={`${badgeClass} max-w-full truncate block`} title={displayValue}>
          <span className="truncate block">{displayValue}</span>
        </Badge>
      </div>
    );
  }
  
  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer hover:bg-purple-50 px-2 py-1 rounded transition-colors truncate ${className}`}
      title={`${displayValue} - Click to edit`}
    >
      {type === 'amount' && value ? (
        <span className="font-bold text-green-700 truncate block">${Number(value).toLocaleString()}</span>
      ) : type === 'phone' && value ? (
        <span className="text-blue-600 font-medium truncate block">{displayValue}</span>
      ) : (
        <span className="text-gray-900 truncate block">{displayValue}</span>
      )}
    </div>
  )
}

