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
import Papa from "papaparse";

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

type ImportStep = "select" | "upload" | "preview" | "importing" | "success";

interface ImportResult {
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
  const { location, refreshContext } = useAppContext();
  const { toast } = useToast();

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
        if (results.errors.length > 0) {
          toast({
            title: "CSV Parse Error",
            description: "There was an error parsing your CSV file. Please check the format.",
            variant: "destructive",
          });
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
      }
    });
  };


  const handleImport = async () => {
    if (!recordsFile || !selectedObject) return;

    setCurrentStep("importing");
    setProgress(0);

    try {
      // Add object_key to each record in the CSV data
      const modifiedData = recordsData.map(record => ({
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
          Review your data before importing. All CSV columns will be imported as-is.
        </AlertDescription>
      </Alert>

      <DataPreviewTable data={recordsData} />

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("upload")}>
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

  const renderSuccess = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <CheckCircle2 className="h-16 w-16 mx-auto text-success" />
        <h3 className="text-2xl font-bold">
          {result?.success ? 'Records Imported Successfully!' : 'Import Completed with Issues'}
        </h3>
        <p className="text-muted-foreground">
          {result?.summary ? 
            `${result.summary.created + result.summary.updated} imported, ${result.summary.skipped} skipped, ${result.summary.failed} failed` :
            `${result?.stats?.recordsProcessed || recordsData.length} record${(result?.stats?.recordsProcessed || recordsData.length) !== 1 ? 's' : ''} imported to`
          } {selectedObjectData?.labels.singular}
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
                  <span className="text-success">Created:</span>
                  <span className="font-medium text-success">{result.summary.created}</span>
                </div>
              )}
              {result.summary.updated > 0 && (
                <div className="flex justify-between">
                  <span className="text-success">Updated:</span>
                  <span className="font-medium text-success">{result.summary.updated}</span>
                </div>
              )}
              {result.summary.skipped > 0 && (
                <div className="flex justify-between">
                  <span className="text-warning">Skipped:</span>
                  <span className="font-medium text-warning">{result.summary.skipped}</span>
                </div>
              )}
              {result.summary.failed > 0 && (
                <div className="flex justify-between">
                  <span className="text-destructive">Failed:</span>
                  <span className="font-medium text-destructive">{result.summary.failed}</span>
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

      {/* Error Details Section */}
      {result?.errors && result.errors.length > 0 && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Import Errors ({result.errors.length})
            </CardTitle>
            <CardDescription>
              Issues encountered during the import process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {result.errors.map((error, index) => (
                <div key={index} className="text-sm bg-destructive/5 border border-destructive/20 rounded p-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium text-destructive">
                      Record {error.recordIndex + 1}:
                    </span>
                    <span className="text-destructive/80 text-xs">
                      {error.error}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button variant="gradient" onClick={handleStartOver}>
        Import More Records
      </Button>
    </div>
  );

  const steps = ["Choose Object", "Download & Upload", "Preview Data", "Import Progress", "Review Results"];
  const stepMap = { select: 0, upload: 1, preview: 2, importing: 3, success: 4 };

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
      {currentStep === "preview" && renderPreview()}
      {currentStep === "importing" && renderImporting()}
      {currentStep === "success" && renderSuccess()}
    </div>
  );
}
