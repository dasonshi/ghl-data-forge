import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone } from "@/components/FileUploadZone";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { StepIndicator } from "@/components/StepIndicator";
import { Download, Database, CheckCircle2, AlertTriangle, Upload, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocationSwitch } from "@/hooks/useLocationSwitch";
import { apiFetch } from '@/lib/api';
import { useAppContext } from '@/hooks/useAppContext';
import { enrichErrors, groupErrorsByMessage, formatRowNumbers, type EnrichedError, type GroupedError } from '@/lib/errorSuggestions';
import { FieldMappingTable } from '@/components/FieldMappingTable';
import {
  type FieldMapping,
  type MappingValidation,
  autoMatchFields,
  validateMapping,
  applyMapping,
  type CustomField as MappingCustomField
} from '@/lib/fieldMapping';
import Papa from "papaparse";

// Field mapping is now enabled for all users

interface CustomObject {
  id: string;
  key: string;
  labels: {
    singular: string;
    plural: string;
  };
}

interface CustomField {
  id: string;
  fieldKey: string;
  name: string;
  dataType: string;
  required?: boolean;
  picklistValues?: Array<{ value: string; label: string }>;
}

interface Association {
  id: string;
  key: string;
  description: string;
  relationTo: string;
  isFirst: boolean;
  firstObjectLabel?: string;
  firstObjectKey?: string;
  secondObjectLabel?: string;
  secondObjectKey?: string;
  associationType?: string;
}

type ImportStep = "select" | "upload" | "mapping" | "preview" | "importing" | "success";

interface PhoneWarning {
  recordId: string;
  externalId: string;
  warnings: Array<{ field: string; warning: string }>;
}

interface ImportResult {
  ok: boolean;
  success?: boolean;
  message: string;
  stats: {
    recordsProcessed: number;
  };
  errors?: Array<{ recordIndex: number; error: string }>;
  phoneWarnings?: PhoneWarning[];
  summary?: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    phoneAutoFormatted?: number;
  };
  // Additional properties for detailed results
  created?: Array<any>;
  updated?: Array<any>;
  skipped?: Array<any>;
}

export function ImportRecordsTab() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("select");
  
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [fieldsData, setFieldsData] = useState<CustomField[]>([]);
  
  const [recordsFile, setRecordsFile] = useState<File | null>(null);
  const [recordsData, setRecordsData] = useState<Record<string, string>[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [mappingValidation, setMappingValidation] = useState<MappingValidation | null>(null);
  const { location, refreshContext } = useAppContext();
  const { toast } = useToast();

  // Field mapping is now enabled for all users
  const isMappingEnabled = true;

// Clear all data when location switches
useLocationSwitch(async () => {
  console.log('🔄 ImportRecordsTab: Clearing data for location switch');
  setCurrentStep("select");
  setObjects([]);
  setSelectedObject("");
  setAvailableFields([]);
  setFieldsData([]);
  setRecordsFile(null);
  setRecordsData([]);
  setProgress(0);
  setResult(null);
  setFieldMapping({});
  setMappingValidation(null);

  await refreshContext();
  await fetchObjects();
});

const fetchObjects = async () => {
  try {
    const res = await apiFetch('/api/objects', {}, location?.id ?? undefined);
    if (res.ok) {
      const data = await res.json();
      setObjects(data.objects || data || []);
    }
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to load custom objects. Please try again.",
      variant: "destructive",
    });
  }
};


 const fetchFields = async (objectKey: string) => {
  try {
    const res = await apiFetch(`/api/objects/${objectKey}/fields`, {}, location?.id ?? undefined);
    if (res.ok) {
      const data = await res.json();
      const fields = data.fields || [];
      setFieldsData(fields);
      setAvailableFields(fields.map((field: any) => field.fieldKey || field.key));
    } else {
      setAvailableFields(["name", "email", "phone", "company", "notes"]);
      setFieldsData([]);
    }
  } catch {
    setAvailableFields(["name", "email", "phone", "company", "notes"]);
    setFieldsData([]);
  }
};



  const downloadTemplate = async () => {
    if (!selectedObject) {
      toast({
        title: "No Object Selected",
        description: "Please select a custom object first.",
        variant: "destructive",
      });
      return;
    }

    try {
          // Only fetch template since we already have fields data
          const templateResponse = await apiFetch(`/templates/records/${selectedObject}`, {}, location?.id ?? undefined);

          if (templateResponse.ok) {
            const csvText = await templateResponse.text();
            
              // Parse CSV and filter out external_id and object_key columns
              const lines = csvText.split('\n');
              if (lines.length > 0) {
                const headers = lines[0].split(',');
                const filteredHeaders = headers.filter(header => 
                  header.trim() !== 'external_id' && header.trim() !== 'object_key'
                );
          
          // Generate sample data based on field types
          const generateSampleValue = (fieldName: string) => {
            const field = fieldsData.find((f: any) => f.fieldKey.endsWith(`.${fieldName.trim()}`));
            if (!field) return 'sample_value';
            
            switch (field.dataType) {
              case 'TEXT':
                return 'Sample Text';
              case 'EMAIL':
                return 'user@example.com';
              case 'PHONE':
                return '+1-555-123-4567';
              case 'URL':
                return 'https://www.example.com';
              case 'NUMBER':
                return '100';
              case 'CURRENCY':
                return '99.99';
              case 'PERCENT':
                return '75.5';
              case 'DATE':
                return '2024-01-15';
              case 'DATETIME':
                return '2024-01-15T10:30:00Z';
              case 'BOOLEAN':
                return 'true';
              case 'PICKLIST':
                return field.picklistValues && field.picklistValues.length > 0 
                  ? field.picklistValues[0].value 
                  : 'Option1';
              case 'TEXTAREA':
                return 'This is a longer sample text that would typically be used in a textarea field for more detailed information.';
              default:
                return 'sample_value';
            }
            };
            
            const sampleRow = filteredHeaders.map(header => {
              return generateSampleValue(header.trim());
            });
            
            // Reconstruct CSV with filtered headers and sample row
            const csvLines = [
              filteredHeaders.join(','),
              sampleRow.join(',')
            ];
          const filteredCsv = csvLines.join('\n');
          
          const blob = new Blob([filteredCsv], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${selectedObject}-new-template.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          toast({
            title: "Template Downloaded",
            description: `CSV template for importing new ${selectedObjectData?.labels.singular} records downloaded.`,
          });
        }
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleObjectSelect = (objectKey: string) => {
    setSelectedObject(objectKey);
    fetchFields(objectKey);
  };

  const handleContinueToUpload = () => {
    if (selectedObject) {
      setCurrentStep("upload");
    }
  };


  const handleRecordsFile = (file: File) => {
    setRecordsFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Check for field mismatch errors (rows with wrong number of columns)
        const fieldMismatchErrors = results.errors.filter(
          (err: any) => err.type === 'FieldMismatch'
        );

        if (fieldMismatchErrors.length > 0) {
          console.log('CSV Field Mismatch Errors:', fieldMismatchErrors);
          const affectedRows = fieldMismatchErrors.map((err: any) => err.row).slice(0, 10);
          const moreCount = fieldMismatchErrors.length > 10 ? ` and ${fieldMismatchErrors.length - 10} more` : '';

          toast({
            title: "CSV Format Error",
            description: `Your CSV has rows with inconsistent column counts. Affected rows: ${affectedRows.join(', ')}${moreCount}. This usually means some fields contain unescaped commas. Please wrap text fields containing commas in double quotes and re-upload.`,
            variant: "destructive",
          });
          setRecordsFile(null);
          return;
        }

        // Check for other critical parse errors
        const criticalErrors = results.errors.filter(
          (err: any) => err.type !== 'FieldMismatch'
        );

        if (criticalErrors.length > 0) {
          console.log('CSV Parse Errors:', criticalErrors);
          toast({
            title: "CSV Parse Error",
            description: `Parse error: ${criticalErrors[0].message || 'Please check the format.'}`,
            variant: "destructive",
          });
          setRecordsFile(null);
          return;
        }

        const data = results.data as Record<string, string>[];
        setRecordsData(data);

        if (isMappingEnabled && data.length > 0) {
          // New flow: go to mapping step
          const csvColumns = Object.keys(data[0]);
          const initialMapping = autoMatchFields(csvColumns, fieldsData as MappingCustomField[]);
          setFieldMapping(initialMapping);
          setMappingValidation(null);
          setCurrentStep("mapping");
        } else {
          // Current flow: skip directly to preview
          setCurrentStep("preview");
        }
      },
      error: (error) => {
        toast({
          title: "File Error",
          description: "Failed to read CSV file. Please try again.",
          variant: "destructive",
        });
        setRecordsFile(null);
      }
    });
  };

  const handleContinueToPreview = () => {
    const validation = validateMapping(fieldMapping, fieldsData as MappingCustomField[]);
    setMappingValidation(validation);

    if (!validation.canProceed) {
      toast({
        title: "Mapping Incomplete",
        description: validation.errors[0] || "Please map all required fields.",
        variant: "destructive"
      });
      return;
    }

    setCurrentStep("preview");
  };

  const handleImport = async () => {
    if (!recordsFile || !selectedObject) return;

    setCurrentStep("importing");
    setProgress(0);

    try {
      // Apply field mapping if enabled, then add object_key
      const dataToImport = isMappingEnabled ? applyMapping(recordsData, fieldMapping) : recordsData;
      const modifiedData = dataToImport.map(record => ({
        ...record,
        object_key: selectedObject.split('.').pop() // Extract just the object name from the full key
      }));

      // Convert modified data back to CSV
      const csvHeaders = Object.keys(modifiedData[0]);
      const csvRows = modifiedData.map(row => 
        csvHeaders.map(header => row[header] || '').join(',')
      );
      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

      // Create new file with modified data
      const modifiedFile = new Blob([csvContent], { type: 'text/csv' });
      
      const formData = new FormData();
      formData.append('records', modifiedFile, recordsFile.name);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

const response = await apiFetch(`/api/objects/${selectedObject}/records/import`, {
  method: 'POST',
  body: formData,
}, location?.id ?? undefined);

      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        const result = await response.json();
        // Enrich errors with helpful suggestions
        if (result.errors && Array.isArray(result.errors)) {
          result.errors = enrichErrors(result.errors);
        }
        setResult(result);
        setCurrentStep("success");
        toast({
          title: "Records Imported",
          description: "Your records have been imported successfully.",
        });
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import records. Please try again.",
        variant: "destructive",
      });
      setCurrentStep("preview");
    }
  };

  const handleStartOver = () => {
    setCurrentStep("select");
    setSelectedObject("");
    setAvailableFields([]);
    setRecordsFile(null);
    setRecordsData([]);
    setProgress(0);
    setResult(null);
    setFieldMapping({});
    setMappingValidation(null);
  };

useEffect(() => {
  fetchObjects();
}, [location?.id]);

  const selectedObjectData = objects.find(obj => obj.key === selectedObject);


  const renderSelect = () => (
    <div className="space-y-6">
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>
            Select a custom object to import records into. The object must already exist and have custom fields defined.
          </AlertDescription>
        </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Select Custom Object</CardTitle>
          <CardDescription>
            Choose the custom object you want to import records into
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedObject} onValueChange={handleObjectSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select a custom object" />
            </SelectTrigger>
            <SelectContent>
              {objects.map((object) => (
                <SelectItem key={object.id} value={object.key}>
                  {object.labels.singular} ({object.key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {objects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No custom objects found. Create custom objects first before importing records.
            </p>
          )}


          {selectedObject && (
            <Button 
              onClick={handleContinueToUpload}
              className="w-full"
            >
              Continue to Upload
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderUpload = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Import Records for: {selectedObjectData?.labels.singular}
          </h3>
          <p className="text-sm text-muted-foreground">Object Key: {selectedObject}</p>
        </div>
        <Button variant="outline" onClick={() => setCurrentStep("select")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Fields</CardTitle>
          <CardDescription>
            Fields available for mapping in this object
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {fieldsData.length > 0 ? (
              fieldsData.map((field, index) => (
                <div key={index} className="text-sm bg-muted/50 px-2 py-1 rounded flex justify-between items-center">
                  <span>{field.fieldKey || field.name}</span>
                  <span className="text-xs text-muted-foreground font-mono bg-background px-1 rounded">
                    {field.dataType}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Loading fields...</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Template & Upload
          </CardTitle>
          <CardDescription>
            Download the template, fill it with your data, then upload
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Button 
              onClick={downloadTemplate}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <FileUploadZone
              onFileSelect={handleRecordsFile}
              acceptedTypes=".csv"
              maxSize={10}
              selectedFile={recordsFile}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMapping = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Map CSV Columns</h3>
          <p className="text-sm text-muted-foreground">
            Match your CSV columns to {selectedObjectData?.labels.singular} fields
          </p>
        </div>
        <Button variant="outline" onClick={() => setCurrentStep("upload")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          Map each CSV column to a field in your custom object. Columns marked "Skip" will not be imported.
        </AlertDescription>
      </Alert>

      <FieldMappingTable
        csvColumns={recordsData.length > 0 ? Object.keys(recordsData[0]) : []}
        ghlFields={fieldsData as MappingCustomField[]}
        mapping={fieldMapping}
        onMappingChange={setFieldMapping}
        sampleData={recordsData[0] || {}}
        validation={mappingValidation}
      />

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("upload")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button variant="gradient" onClick={handleContinueToPreview}>
          Continue to Preview
        </Button>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Preview Records for: {selectedObjectData?.labels.singular}
          </h3>
          <p className="text-sm text-muted-foreground">
            {recordsData.length} record{recordsData.length !== 1 ? 's' : ''} will be imported
          </p>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {isMappingEnabled
            ? "Review your mapped data before importing. Only mapped columns will be imported."
            : "Review your data before importing. All CSV columns will be imported as-is."
          }
        </AlertDescription>
      </Alert>

      <DataPreviewTable
        data={isMappingEnabled ? applyMapping(recordsData, fieldMapping) : recordsData}
      />

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(isMappingEnabled ? "mapping" : "upload")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button variant="gradient" onClick={handleImport}>
          Import Records
        </Button>
      </div>
    </div>
  );

  const renderImporting = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <Upload className="h-16 w-16 mx-auto text-primary animate-pulse" />
        <h3 className="text-xl font-semibold">Importing Records...</h3>
        <p className="text-muted-foreground">
          Please wait while we import your records into {selectedObjectData?.labels.singular}
        </p>
      </div>
      
      <div className="space-y-2 max-w-md mx-auto">
        <Progress value={progress} className="w-full" />
        <p className="text-sm text-muted-foreground">{progress}% complete</p>
      </div>
    </div>
  );

  const renderSuccess = () => {
    const hasErrors = result?.errors && result.errors.length > 0;
    const hasSuccesses = result?.created?.length > 0 || result?.summary?.successful > 0;

    return (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        {hasErrors && !hasSuccesses ? (
          <AlertTriangle className="h-16 w-16 mx-auto text-red-600" />
        ) : hasErrors ? (
          <AlertTriangle className="h-16 w-16 mx-auto text-yellow-600" />
        ) : (
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
        )}
        <h3 className="text-2xl font-bold">
          {hasErrors && !hasSuccesses
            ? 'Import Failed'
            : hasErrors
              ? 'Import Completed with Errors'
              : 'Records Imported Successfully!'}
        </h3>
        <p className="text-muted-foreground">
          {result?.summary ?
            `${result.summary.successful || 0} imported, ${result.summary.failed || 0} failed` :
            `${result?.stats?.recordsProcessed || recordsData.length} record${(result?.stats?.recordsProcessed || recordsData.length) !== 1 ? 's' : ''} processed`
          } for {selectedObjectData?.labels.singular}
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Import Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Object:</span>
            <span className="font-medium">{selectedObjectData?.labels.singular}</span>
          </div>
          {result?.summary ? (
            <>
              <div className="flex justify-between">
                <span>Total Records:</span>
                <span className="font-medium">{result.summary.total}</span>
              </div>
              {result.summary.created > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-600">Created:</span>
                  <span className="font-medium text-green-600">{result.summary.created}</span>
                </div>
              )}
              {result.summary.updated > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-600">Updated:</span>
                  <span className="font-medium text-green-600">{result.summary.updated}</span>
                </div>
              )}
              {result.summary.skipped > 0 && (
                <div className="flex justify-between">
                  <span className="text-yellow-600">Skipped:</span>
                  <span className="font-medium text-yellow-600">{result.summary.skipped}</span>
                </div>
              )}
              {result.summary.failed > 0 && (
                <div className="flex justify-between">
                  <span className="text-red-600">Failed:</span>
                  <span className="font-medium text-red-600">{result.summary.failed}</span>
                </div>
              )}
              {result.summary.phoneAutoFormatted && result.summary.phoneAutoFormatted > 0 && (
                <div className="flex justify-between">
                  <span className="text-blue-600">Phones Auto-Formatted:</span>
                  <span className="font-medium text-blue-600">{result.summary.phoneAutoFormatted}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span>Records Imported:</span>
                <span className="font-medium">{result?.stats?.recordsProcessed || recordsData.length}</span>
              </div>
              <div className="flex justify-between">
                <span>CSV Columns:</span>
                <span className="font-medium">{recordsData.length > 0 ? Object.keys(recordsData[0]).length : 0}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detailed Results */}
      {result && (result.created || result.updated || result.skipped || result.errors) && (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Created Records */}
          {result.created && result.created.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Created Records ({result.created.length})
                </CardTitle>
                <CardDescription>Records that were successfully created</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {result.created.map((record: any, index: number) => (
                    <div key={index} className="text-sm bg-green-50 border border-green-200 rounded p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-green-800">
                          {record.id || record.name || `Record ${index + 1}`}
                        </span>
                        <span className="text-green-600 text-xs">Created</span>
                      </div>
                      {record.details && (
                        <p className="text-green-700 text-xs mt-1">{record.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Updated Records */}
          {result.updated && result.updated.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Updated Records ({result.updated.length})
                </CardTitle>
                <CardDescription>Records that were successfully updated</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {result.updated.map((record: any, index: number) => (
                    <div key={index} className="text-sm bg-green-50 border border-green-200 rounded p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-green-800">
                          {record.id || record.name || `Record ${index + 1}`}
                        </span>
                        <span className="text-green-600 text-xs">Updated</span>
                      </div>
                      {record.details && (
                        <p className="text-green-700 text-xs mt-1">{record.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skipped Records */}
          {result.skipped && result.skipped.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <AlertTriangle className="h-5 w-5" />
                  Skipped Records ({result.skipped.length})
                </CardTitle>
                <CardDescription>Records that were skipped during the import</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {result.skipped.map((record: any, index: number) => (
                    <div key={index} className="text-sm bg-yellow-50 border border-yellow-200 rounded p-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-medium text-yellow-800">
                          {record.id || record.name || `Record ${index + 1}`}
                        </span>
                        <span className="text-yellow-600 text-xs">Skipped</span>
                      </div>
                      {record.reason && (
                        <p className="text-yellow-700 text-xs mt-1">{record.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failed Records - Grouped by Error */}
          {result.errors && result.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Failed Records ({result.errors.length})
                </CardTitle>
                <CardDescription>Records that failed to import, grouped by error type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {groupErrorsByMessage(result.errors as EnrichedError[]).map((group: GroupedError, index: number) => (
                    <div key={index} className="text-sm bg-red-50 border border-red-200 rounded p-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-red-600 text-xs font-medium px-2 py-0.5 bg-red-100 rounded">
                          {group.rows.length} record{group.rows.length !== 1 ? 's' : ''}
                        </span>
                        {group.errorCode && (
                          <span className="text-red-500 text-xs">
                            {group.errorCode}
                          </span>
                        )}
                      </div>
                      <p className="text-red-700 text-sm mt-2">{group.error}</p>
                      <p className="text-red-500 text-xs mt-1">
                        {formatRowNumbers(group.rows, 8)}
                      </p>
                      {group.suggestion && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
                          <span className="font-medium text-amber-800">Suggestion: </span>
                          <span className="text-amber-700">{group.suggestion}</span>
                          {group.action === 'download-template' && (
                            <button
                              onClick={downloadTemplate}
                              className="ml-2 text-amber-800 underline hover:text-amber-900"
                            >
                              Download Template
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Phone Number Formatting Warnings */}
          {result.phoneWarnings && result.phoneWarnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <AlertTriangle className="h-5 w-5" />
                  Phone Numbers Auto-Formatted ({result.phoneWarnings.length})
                </CardTitle>
                <CardDescription>
                  These phone numbers were automatically reformatted. Please verify they are correct.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {result.phoneWarnings.slice(0, 20).map((warning: PhoneWarning, index: number) => (
                    <div key={index} className="text-sm bg-blue-50 border border-blue-200 rounded p-2">
                      {warning.warnings.map((w, wIdx) => (
                        <p key={wIdx} className="text-blue-700 text-xs">
                          <span className="font-medium">{w.field}:</span> {w.warning}
                        </p>
                      ))}
                    </div>
                  ))}
                  {result.phoneWarnings.length > 20 && (
                    <p className="text-sm text-blue-600 italic">
                      And {result.phoneWarnings.length - 20} more...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Button variant="gradient" onClick={handleStartOver}>
        Import More Records
      </Button>
    </div>
  );
  };

  // Conditionally show 5 or 6 steps based on feature flag
  const steps = isMappingEnabled
    ? ["Choose Object", "Upload CSV", "Map Fields", "Preview Data", "Import Progress", "Review Results"]
    : ["Choose Object", "Download & Upload", "Preview Data", "Import Progress", "Review Results"];
  const stepMap = isMappingEnabled
    ? { select: 0, upload: 1, mapping: 2, preview: 3, importing: 4, success: 5 }
    : { select: 0, upload: 1, mapping: 1, preview: 2, importing: 3, success: 4 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Import Records</h2>
        <p className="text-muted-foreground">
          Import new records into existing custom objects
        </p>
      </div>

      <StepIndicator 
        steps={steps} 
        currentStep={stepMap[currentStep]} 
        className="mb-8"
      />

      {currentStep === "select" && renderSelect()}
      {currentStep === "upload" && renderUpload()}
      {currentStep === "mapping" && renderMapping()}
      {currentStep === "preview" && renderPreview()}
      {currentStep === "importing" && renderImporting()}
      {currentStep === "success" && renderSuccess()}
    </div>
  );
}
