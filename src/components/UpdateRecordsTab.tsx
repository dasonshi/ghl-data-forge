import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone } from "@/components/FileUploadZone";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { StepIndicator } from "@/components/StepIndicator";
import { Download, Database, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocationSwitch } from "@/hooks/useLocationSwitch";
import { apiFetch } from '@/lib/api';
import { useAppContext } from '@/hooks/useAppContext';
import Papa from "papaparse";
import { getDataTypeDisplay } from "@/lib/fieldUtils";

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

type UpdateStep = "select" | "upload" | "preview" | "updating" | "success";

interface UpdateResult {
  ok: boolean;
  success?: boolean;
  message: string;
  stats: {
    recordsProcessed: number;
  };
  errors?: Array<{ recordIndex: number; error: string }>;
  summary?: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  // Additional properties for detailed results
  updated?: Array<any>;
  skipped?: Array<any>;
}

export function UpdateRecordsTab() {
  const [currentStep, setCurrentStep] = useState<UpdateStep>("select");
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [fieldsData, setFieldsData] = useState<CustomField[]>([]);
  
  const [recordsFile, setRecordsFile] = useState<File | null>(null);
  const [recordsData, setRecordsData] = useState<Record<string, string>[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const { location, refreshContext } = useAppContext();
  const { toast } = useToast();

  // Clear all data when location switches
  useLocationSwitch(async () => {
    console.log('🔄 UpdateRecordsTab: Clearing data for location switch');
    setCurrentStep("select");
    setObjects([]);
    setSelectedObject("");
    setAvailableFields([]);
    setFieldsData([]);
    setRecordsFile(null);
    setRecordsData([]);
    setProgress(0);
    setResult(null);

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
        setAvailableFields(["id", "name", "email", "phone", "company", "notes"]);
        setFieldsData([]);
      }
    } catch {
      setAvailableFields(["id", "name", "email", "phone", "company", "notes"]);
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
      const templateResponse = await apiFetch(`/templates/records/${selectedObject}`, {}, location?.id ?? undefined);

      if (templateResponse.ok) {
        const csvText = await templateResponse.text();
        
        // Parse CSV and filter out external_id and object_key columns, add id column
        const lines = csvText.split('\n');
        if (lines.length > 0) {
          const headers = lines[0].split(',');
          let filteredHeaders = headers.filter(header => 
            header.trim() !== 'external_id' && header.trim() !== 'object_key'
          );
          
          // Add id column at the beginning for update mode
          filteredHeaders = ['id', ...filteredHeaders];
        
          // Generate sample data based on field types
          const generateSampleValue = (fieldName: string) => {
            if (fieldName.trim() === 'id') {
              return 'record_id_123';
            }
            
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
          a.download = `${selectedObject}-update-template.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          toast({
            title: "Template Downloaded",
            description: `CSV template for updating existing ${selectedObjectData?.labels.singular} records downloaded.`,
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
            description: `Your CSV has rows with inconsistent column counts. Affected rows: ${affectedRows.join(', ')}${moreCount}. Please wrap text fields containing commas in double quotes and re-upload.`,
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
          toast({
            title: "CSV Parse Error",
            description: "There was an error parsing your CSV file. Please check the format.",
            variant: "destructive",
          });
          setRecordsFile(null);
          return;
        }

        const data = results.data as Record<string, string>[];
        setRecordsData(data);
        setCurrentStep("preview");
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

  const handleUpdate = async () => {
    if (!recordsFile || !selectedObject) return;

    setCurrentStep("updating");
    setProgress(0);

    try {
      // Add object_key to each record in the CSV data
      const modifiedData = recordsData.map(record => ({
        ...record,
        object_key: selectedObject.split('.').pop()
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

      const response = await apiFetch(`/api/objects/${selectedObject}/records/update`, {
        method: 'POST',
        body: formData,
      }, location?.id ?? undefined);

      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        const result = await response.json();
        setResult(result);
        setCurrentStep("success");
        toast({
          title: "Records Updated",
          description: "Your records have been updated successfully.",
        });
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update records. Please try again.",
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
          Select a custom object to update records in. Your CSV must include an 'id' column with the record IDs to update.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Select Custom Object</CardTitle>
          <CardDescription>
            Choose the custom object you want to update records in
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
              No custom objects found. Create custom objects first before updating records.
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
            Update Records for: {selectedObjectData?.labels.singular}
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
            Fields available for mapping in this object (id column required for updates)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm bg-primary/10 px-2 py-1 rounded flex justify-between items-center border border-primary/20">
              <span className="font-semibold">id</span>
              <span className="text-xs text-muted-foreground font-mono bg-background px-1 rounded">
                REQUIRED
              </span>
            </div>
            {fieldsData.length > 0 ? (
              fieldsData.map((field, index) => (
                <div key={index} className="text-sm bg-muted/50 px-2 py-1 rounded flex justify-between items-center">
                  <span>{field.fieldKey || field.name}</span>
                  <span className="text-xs text-muted-foreground font-mono bg-background px-1 rounded">
                    {getDataTypeDisplay(field.dataType)}
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
            Download the update template (includes ID column), fill it with your data, then upload
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
              Download Update Template
            </Button>
            <FileUploadZone
              onFileSelect={handleRecordsFile}
              acceptedTypes=".csv"
              maxSize={10}
              selectedFile={recordsFile}
            />
          </div>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your CSV must include an 'id' column with valid record IDs to update existing records.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Preview Updates for: {selectedObjectData?.labels.singular}
          </h3>
          <p className="text-sm text-muted-foreground">
            {recordsData.length} record{recordsData.length !== 1 ? 's' : ''} will be updated
          </p>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Review your data before updating. Only records with valid IDs will be updated.
        </AlertDescription>
      </Alert>

      <DataPreviewTable data={recordsData} />

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("upload")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button variant="gradient" onClick={handleUpdate}>
          Update Records
        </Button>
      </div>
    </div>
  );

  const renderUpdating = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <Database className="h-16 w-16 mx-auto text-primary animate-pulse" />
        <h3 className="text-xl font-semibold">Updating Records...</h3>
        <p className="text-muted-foreground">
          Please wait while we update your records in {selectedObjectData?.labels.singular}
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
    const hasSuccesses = result?.updated?.length > 0 || result?.summary?.updated > 0;

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
            ? 'Update Failed'
            : hasErrors
              ? 'Update Completed with Errors'
              : 'Records Updated Successfully!'}
        </h3>
        <p className="text-muted-foreground">
          {result?.summary ?
            `${result.summary.updated || 0} updated, ${result.summary.failed || 0} failed` :
            `${result?.stats?.recordsProcessed || recordsData.length} record${(result?.stats?.recordsProcessed || recordsData.length) !== 1 ? 's' : ''} processed`
          } for {selectedObjectData?.labels.singular}
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Update Summary</CardTitle>
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
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span>Records Updated:</span>
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
      {result && (result.updated || result.skipped || result.errors) && (
        <div className="space-y-4 max-w-4xl mx-auto">
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
                <CardDescription>Records that were skipped during the update</CardDescription>
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

          {/* Failed Records */}
          {result.errors && result.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Failed Records ({result.errors.length})
                </CardTitle>
                <CardDescription>Records that failed to update</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.errors.map((error: any, index: number) => (
                    <div key={index} className="text-sm bg-red-50 border border-red-200 rounded p-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-medium text-red-800">
                          Row {error.recordIndex !== undefined ? error.recordIndex + 2 : index + 2}: {error.name || error.externalId || 'Unknown'}
                        </span>
                        <span className="text-red-600 text-xs font-medium px-2 py-0.5 bg-red-100 rounded">
                          {error.errorCode || 'Failed'}
                        </span>
                      </div>
                      <p className="text-red-700 text-xs mt-1">{error.error || error.message}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Button variant="gradient" onClick={handleStartOver}>
        Update More Records
      </Button>
    </div>
  );
  };

  const steps = ["Choose Object", "Download & Upload", "Preview Data", "Update Progress", "Review Results"];
  const stepMap = { select: 0, upload: 1, preview: 2, updating: 3, success: 4 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Update Records</h2>
        <p className="text-muted-foreground">
          Update existing records in custom objects using their IDs
        </p>
      </div>

      <StepIndicator 
        steps={steps} 
        currentStep={stepMap[currentStep]} 
        className="mb-8"
      />

      {currentStep === "select" && renderSelect()}
      {currentStep === "upload" && renderUpload()}
      {currentStep === "preview" && renderPreview()}
      {currentStep === "updating" && renderUpdating()}
      {currentStep === "success" && renderSuccess()}
    </div>
  );
}