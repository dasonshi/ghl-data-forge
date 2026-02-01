import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, MinusCircle } from "lucide-react";
import {
  type FieldMapping,
  type MappingValidation,
  type CustomField,
  getAvailableFields
} from "@/lib/fieldMapping";

interface FieldMappingTableProps {
  csvColumns: string[];
  ghlFields: CustomField[];
  mapping: FieldMapping;
  onMappingChange: (mapping: FieldMapping) => void;
  sampleData: Record<string, string>;
  validation: MappingValidation | null;
}

/**
 * Extract display name from a full field key
 */
function getFieldDisplayName(fieldKey: string): string {
  const parts = fieldKey.split('.');
  return parts[parts.length - 1];
}

/**
 * Check if a field is required and unmapped (error state)
 */
function isRequiredUnmapped(
  fieldKey: string | null,
  ghlFields: CustomField[],
  validation: MappingValidation | null
): boolean {
  if (fieldKey) return false;
  return (validation?.errors?.length || 0) > 0;
}

export function FieldMappingTable({
  csvColumns,
  ghlFields,
  mapping,
  onMappingChange,
  sampleData,
  validation
}: FieldMappingTableProps) {

  const handleMappingChange = (csvColumn: string, newFieldKey: string) => {
    const ghlFieldKey = newFieldKey === "__skip__" ? null : newFieldKey;
    onMappingChange({
      ...mapping,
      [csvColumn]: {
        ghlFieldKey,
        autoMatched: false  // User changed it, so not auto-matched
      }
    });
  };

  // Count mapped vs unmapped
  const mappedCount = Object.values(mapping).filter(m => m.ghlFieldKey !== null).length;
  const totalColumns = csvColumns.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Map CSV Columns to Fields</span>
          <Badge variant="secondary" className="font-normal">
            {mappedCount} of {totalColumns} columns mapped
          </Badge>
        </CardTitle>
        <CardDescription>
          Match each CSV column to a field in the custom object. Columns marked "Skip" will not be imported.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative max-h-[500px] overflow-auto border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[30%]">Your CSV Column</TableHead>
                <TableHead className="w-[40%]">Map To Field</TableHead>
                <TableHead className="w-[30%]">Sample Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {csvColumns.map((csvColumn) => {
                const entry = mapping[csvColumn] || { ghlFieldKey: null, autoMatched: false };
                const availableFields = getAvailableFields(mapping, ghlFields, csvColumn);
                const currentField = ghlFields.find(f => f.fieldKey === entry.ghlFieldKey);
                const sampleValue = sampleData[csvColumn] || '';

                // Include current selection in available options
                const fieldsForDropdown = currentField
                  ? [currentField, ...availableFields.filter(f => f.fieldKey !== currentField.fieldKey)]
                  : availableFields;

                return (
                  <TableRow key={csvColumn}>
                    {/* CSV Column Name */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[200px]" title={csvColumn}>
                          {csvColumn}
                        </span>
                        {entry.autoMatched && entry.ghlFieldKey && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" title="Auto-matched" />
                        )}
                      </div>
                    </TableCell>

                    {/* Field Dropdown */}
                    <TableCell>
                      <Select
                        value={entry.ghlFieldKey || "__skip__"}
                        onValueChange={(value) => handleMappingChange(csvColumn, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {entry.ghlFieldKey ? (
                              <div className="flex items-center gap-2">
                                <span>{currentField?.name || getFieldDisplayName(entry.ghlFieldKey)}</span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  ({currentField?.dataType || 'TEXT'})
                                </span>
                                {currentField?.required && (
                                  <span className="text-xs text-red-500">*</span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MinusCircle className="h-4 w-4" />
                                <span>Skip column</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {/* Skip option */}
                          <SelectItem value="__skip__">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MinusCircle className="h-4 w-4" />
                              <span>Skip column (do not import)</span>
                            </div>
                          </SelectItem>

                          {/* Available fields */}
                          {fieldsForDropdown.map((field) => (
                            <SelectItem key={field.fieldKey} value={field.fieldKey}>
                              <div className="flex items-center gap-2">
                                <span>{field.name}</span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  ({field.dataType})
                                </span>
                                {field.required && (
                                  <span className="text-xs text-red-500">*</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}

                          {fieldsForDropdown.length === 0 && !currentField && (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              All fields are already mapped
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Sample Data */}
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[200px] block" title={sampleValue}>
                        {sampleValue || <span className="italic">empty</span>}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Auto-matched</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-red-500">*</span>
            <span>Required field</span>
          </div>
        </div>

        {/* Validation Errors */}
        {validation && validation.errors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                {validation.errors.map((error, index) => (
                  <p key={index} className="text-sm text-red-700">{error}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Validation Warnings */}
        {validation && validation.warnings.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                {validation.warnings.map((warning, index) => (
                  <p key={index} className="text-sm text-amber-700">{warning}</p>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
