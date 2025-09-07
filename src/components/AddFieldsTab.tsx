import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone } from "@/components/FileUploadZone";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { StepIndicator } from "@/components/StepIndicator";
import { Download, Database, CheckCircle2, AlertTriangle, Upload, ArrowLeft, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocationSwitch } from "@/hooks/useLocationSwitch";
import { apiFetch } from "@/lib/api";
import { useAppContext } from "@/hooks/useAppContext";
import Papa from "papaparse";

interface CustomObject {
  id: string;
  key: string;
  labels: {
    singular: string;
    plural: string;
  };
}

type ImportStep = "select" | "upload" | "preview" | "importing" | "success";

interface ImportResult {
  ok: boolean;
  message: string;
  stats: {
    fieldsProcessed: number;
  };
}

export function AddFieldsTab() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("select");
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [fieldsFile, setFieldsFile] = useState<File | null>(null);
  const [fieldsData, setFieldsData] = useState<Record<string, string>[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { location, refreshContext } = useAppContext();
  const { toast } = useToast();

  // Clear all data when location switches
  useLocationSwitch(async () => {
    console.log('🔄 AddFieldsTab: Clearing data for location switch');
    setCurrentStep("select");
    setObjects([]);
    setSelectedObject("");
    setAvailableFields([]);
    setFieldsFile(null);
    setFieldsData([]);
    setProgress(0);
    setResult(null);

    await refreshContext();
    await fetchObjects();
  });

  const fetchObjects = async () => {
    try {
      console.log('🔍 AddFieldsTab: fetchObjects with locationId:', location?.id ?? 'undefined');
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

const downloadTemplate = async () => {
  if (!selectedObject) {
    toast({
      title: "No Object Selected",
      description: "Please select an object first.",
      variant: "destructive",
    });
    return;
  }
  
  try {
    const response = await apiFetch(`/templates/fields/${selectedObject}`, {}, location?.id ?? undefined);      
      if (response.ok) {
        const csvText = await response.text();
        const blob = new Blob([csvText], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cleanKey = selectedObject.replace(/^custom_objects\./, '');
        a.download = `${cleanKey}-fields-template.csv`;        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Template Downloaded",
          description: "CSV template for fields downloaded successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download template. Please try again.",
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
        setAvailableFields(fields.map((field: any) => field.fieldKey || field.key));
      } else {
        // Default fields if none exist
        setAvailableFields(["name", "email", "phone", "company", "notes"]);
      }
    } catch {
      // Default fields on error
      setAvailableFields(["name", "email", "phone", "company", "notes"]);
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

  const handleFieldsFile = (file: File) => {
    setFieldsFile(file);
    
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
        
        // Auto-generate fieldKey for each row based on the name field
        const dataWithFieldKeys = data.map(row => ({
          ...row,
          fieldKey: `custom_object.${selectedObject}.${row.name ? row.name.toLowerCase().replace(/\s+/g, '_') : 'unnamed_field'}`
        }));
        
        setFieldsData(dataWithFieldKeys);
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
    if (!fieldsFile || !selectedObject) return;

    setCurrentStep("importing");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('fields', fieldsFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiFetch(`/api/objects/${selectedObject}/fields/import`, {
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
          title: "Fields Imported",
          description: "Your fields have been imported successfully.",
        });
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import fields. Please try again.",
        variant: "destructive",
      });
      setCurrentStep("preview");
    }
  };

  const handleStartOver = () => {
    setCurrentStep("select");
    setSelectedObject("");
    setFieldsFile(null);
    setFieldsData([]);
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
          Select an existing custom object to import fields into it.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Select Custom Object</CardTitle>
          <CardDescription>
            Choose the custom object you want to import fields into
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
              No custom objects found. Create custom objects first before importing fields.
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
            Import Fields for: {selectedObjectData?.labels.singular}
          </h3>
          <p className="text-sm text-muted-foreground">Object Key: {selectedObject}</p>
        </div>
        <Button variant="outline" onClick={() => setCurrentStep("select")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Field Parameters Help Section - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Field Parameters Guide
          </CardTitle>
          <CardDescription>
            Required and optional parameters for each field in your CSV
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-primary mb-2">Required Fields</h4>
                <div className="space-y-2">
                  <div className="border-l-2 border-primary pl-3">
                    <p className="font-medium">name</p>
                    <p className="text-muted-foreground">Display name for the field (e.g., "Full Name")</p>
                  </div>
                  <div className="border-l-2 border-primary pl-3">
                    <p className="font-medium">dataType</p>
                    <p className="text-muted-foreground">Field type: TEXT, LARGE_TEXT, NUMERICAL, PHONE, MONETARY, CHECKBOX, SINGLE_OPTIONS, MULTIPLE_OPTIONS, DATE, TEXTBOX_LIST, FILE_UPLOAD, RADIO, EMAIL</p>
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        For SINGLE_OPTIONS, MULTIPLE_OPTIONS, RADIO, CHECKBOX, and TEXTBOX_LIST fields, include an "options" column with pipe-separated values (e.g., "Option 1|Option 2|Option 3")
                      </AlertDescription>
                    </Alert>
                  </div>
                  <div className="border-l-2 border-primary pl-3">
                    <p className="font-medium">showInForms</p>
                    <p className="text-muted-foreground">Boolean (true/false) - whether field appears in forms</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-secondary mb-2">Optional Fields</h4>
                <div className="space-y-2">
                  <div className="border-l-2 border-muted pl-3">
                    <p className="font-medium">description</p>
                    <p className="text-muted-foreground">Field description or help text</p>
                  </div>
                  <div className="border-l-2 border-muted pl-3">
                    <p className="font-medium">placeholder</p>
                    <p className="text-muted-foreground">Placeholder text for the field</p>
                  </div>
                  <div className="border-l-2 border-muted pl-3">
                    <p className="font-medium">acceptedFormats</p>
                    <p className="text-muted-foreground">For FILE_UPLOAD: .pdf, .docx, .doc, .jpg, .jpeg, .png, .gif, .csv, .xlsx, .xls</p>
                  </div>
                  <div className="border-l-2 border-muted pl-3">
                    <p className="font-medium">maxFileLimit</p>
                    <p className="text-muted-foreground">Number - maximum files for FILE_UPLOAD fields</p>
                  </div>
                  <div className="border-l-2 border-muted pl-3">
                    <p className="font-medium">allowCustomOption</p>
                    <p className="text-muted-foreground">Boolean - for RADIO fields, allows custom values</p>
                  </div>
                  <div className="border-l-2 border-muted pl-3">
                    <p className="font-medium">options</p>
                    <p className="text-muted-foreground">Pipe-separated values for select/radio fields (e.g., "Red|Blue|Green")</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Download and Upload Section - Side by Side */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              CSV Template
            </CardTitle>
            <CardDescription>
              Download the template and fill it with your field definitions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={downloadTemplate}
            >
              <Database className="h-4 w-4 mr-2" />
              Download Fields Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV
            </CardTitle>
            <CardDescription>
              Upload your completed CSV file with field definitions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone
              onFileSelect={handleFieldsFile}
              acceptedTypes=".csv"
              maxSize={10}
              selectedFile={fieldsFile}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPreview = () => {
    // Validate the data and collect errors
    const validationErrors: Record<number, string[]> = {};
    
    fieldsData.forEach((row, index) => {
      const errors: string[] = [];
      
      // Check required fields
      if (!row.name || row.name.trim() === '') {
        errors.push('Name is required');
      }
      
      const dataType = (row.data_type || row.dataType || 'TEXT').toUpperCase();
      
      // Validate data type
      const validTypes = ['TEXT', 'LARGE_TEXT', 'NUMERICAL', 'PHONE', 'MONETORY', 'CHECKBOX', 
                         'SINGLE_OPTIONS', 'MULTIPLE_OPTIONS', 'DATE', 'TEXTBOX_LIST', 
                         'FILE_UPLOAD', 'RADIO', 'EMAIL'];
      if (!validTypes.includes(dataType)) {
        errors.push(`Invalid data type: ${row.data_type || row.dataType}`);
      }
      
      // Check options for fields that require them
      const optionTypes = ['SINGLE_OPTIONS', 'MULTIPLE_OPTIONS', 'RADIO', 'CHECKBOX', 'TEXTBOX_LIST'];
      if (optionTypes.includes(dataType)) {
        if (!row.options || row.options.trim() === '') {
          errors.push(`${dataType} requires options (pipe-separated values)`);
        } else if (dataType === 'CHECKBOX') {
          const optionCount = row.options.split('|').filter((o: string) => o.trim() !== '').length;
          if (optionCount < 2) {
            errors.push('CHECKBOX requires at least 2 options');
          }
        }
      }
      
      // Validate show_in_forms
      const showInForms = row.show_in_forms || row.showInForms;
      if (showInForms && !['true', 'false', ''].includes(showInForms.toLowerCase())) {
        errors.push('show_in_forms must be true or false');
      }
      
      // Validate file upload fields
      if (dataType === 'FILE_UPLOAD') {
        const maxFileLimit = row.max_file_limit || row.maxFileLimit;
        if (maxFileLimit && isNaN(parseInt(maxFileLimit))) {
          errors.push('max_file_limit must be a number');
        }
        
        const acceptedFormats = row.accepted_formats || row.acceptedFormats;
        if (acceptedFormats) {
          const validFormats = ['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png', '.gif', '.csv', '.xlsx', '.xls'];
          const formats = acceptedFormats.split(',').map((f: string) => {
            const trimmed = f.trim();
            return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
          });
          
          const invalidFormats = formats.filter(f => !validFormats.includes(f.toLowerCase()));
          if (invalidFormats.length > 0) {
            errors.push(`Invalid file formats: ${invalidFormats.join(', ')}`);
          }
        }
      }
      
      // Validate RADIO allow_custom_option
      const allowCustomOption = row.allow_custom_option || row.allowCustomOption;
      if (dataType === 'RADIO' && allowCustomOption && 
          !['true', 'false', ''].includes(allowCustomOption.toLowerCase())) {
        errors.push('allow_custom_option must be true or false');
      }
      
      if (errors.length > 0) {
        validationErrors[index] = errors;
      }
    });
    
    const hasErrors = Object.keys(validationErrors).length > 0;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              Preview Fields for: {selectedObjectData?.labels.singular}
            </h3>
            <p className="text-sm text-muted-foreground">
              {fieldsData.length} field{fieldsData.length !== 1 ? 's' : ''} to import
              {hasErrors && (
                <span className="text-destructive ml-2">
                  ({Object.keys(validationErrors).length} with errors)
                </span>
              )}
            </p>
          </div>
        </div>

        {hasErrors ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Validation errors found. Please fix these issues before importing:</p>
              <ul className="list-disc list-inside space-y-2 mt-2 text-sm">
                {Object.entries(validationErrors).slice(0, 5).map(([index, errors]) => (
                  <li key={index}>
                    <span className="font-medium">Row {parseInt(index) + 2} ({fieldsData[parseInt(index)].name || 'unnamed'}):</span>
                    <ul className="list-disc list-inside ml-4 text-muted-foreground">
                      {errors.map((error, errIndex) => (
                        <li key={errIndex}>{error}</li>
                      ))}
                    </ul>
                  </li>
                ))}
                {Object.keys(validationErrors).length > 5 && (
                  <li className="text-muted-foreground">
                    ...and {Object.keys(validationErrors).length - 5} more rows with errors
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription>
              All fields validated successfully. Ready to import.
            </AlertDescription>
          </Alert>
        )}

        <DataPreviewTable 
          data={fieldsData} 
          errorRows={hasErrors ? Object.keys(validationErrors).map(k => parseInt(k)) : undefined}
        />

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep("upload")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button 
            variant="gradient" 
            onClick={handleImport}
            disabled={hasErrors}
          >
            {hasErrors ? 'Fix Errors to Continue' : 'Import Fields'}
          </Button>
        </div>
      </div>
    );
  };

  const renderImporting = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <Upload className="h-16 w-16 mx-auto text-primary animate-pulse" />
        <h3 className="text-xl font-semibold">Importing Fields...</h3>
        <p className="text-muted-foreground">
          Please wait while we import your fields into {selectedObjectData?.labels.singular}
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
        <h3 className="text-2xl font-bold">Fields Imported Successfully!</h3>
        <p className="text-muted-foreground">
          {result?.stats?.fieldsProcessed || fieldsData.length} field{(result?.stats?.fieldsProcessed || fieldsData.length) !== 1 ? 's' : ''} imported to {selectedObjectData?.labels.singular}
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
          <div className="flex justify-between">
            <span>Fields Imported:</span>
            <span className="font-medium">{result?.stats?.fieldsProcessed || fieldsData.length}</span>
          </div>
          <div className="flex justify-between">
            <span>CSV Columns:</span>
            <span className="font-medium">{fieldsData.length > 0 ? Object.keys(fieldsData[0]).length : 0}</span>
          </div>
        </CardContent>
      </Card>

      <Button variant="gradient" onClick={handleStartOver}>
        Import More Fields
      </Button>
    </div>
  );

  const steps = ["Choose Object", "Download & Upload", "Preview Data", "Import Progress", "Review Results"];
  const stepMap = { select: 0, upload: 1, preview: 2, importing: 3, success: 4 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Import Fields</h2>
        <p className="text-muted-foreground">
          Import custom fields into existing custom objects
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
