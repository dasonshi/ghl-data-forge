import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone } from "@/components/FileUploadZone";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { StepIndicator } from "@/components/StepIndicator";
import { Download, Database, CheckCircle2, AlertTriangle, Upload, ArrowLeft, HelpCircle, User, DollarSign } from "lucide-react";
import { FolderMappingCard } from "@/components/FolderMappingCard";
import { useToast } from "@/hooks/use-toast";
import { useLocationSwitch } from "@/hooks/useLocationSwitch";
import { apiFetch } from "@/lib/api";
import { useAppContext } from "@/hooks/useAppContext";
import { copyToClipboard } from "@/lib/clipboard";
import Papa from "papaparse";
import { triggerReviewRequestEvent } from "@/hooks/useReviewRequest";

interface CustomObject {
  id: string;
  key: string;
  labels: {
    singular: string;
    plural: string;
  };
  isStandard?: boolean;
}

type ImportStep = "select" | "upload" | "preview" | "importing" | "success";

interface ImportResult {
  success: boolean;
  message: string;
  objectKey: string;
  objectId: string;
  created: Array<{ fieldKey: string; id: string; label: string }>;
  skipped: Array<{ fieldName: string; reason: string }>;
  errors: Array<{ fieldName: string; error: string }>;
  summary: {
    total: number;
    created: number;
    skipped: number;
    failed: number;
  };
}

export function AddFieldsTab() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("select");
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [folders, setFolders] = useState<Array<{parentId: string; name: string}>>([]);
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
    setFolders([]);
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
        
        // Extract unique folders from fields with parentId
        const folderMap = new Map<string, string>();
        fields.forEach((field: any) => {
          if (field.parentId) {
            // Use the parentId as the key and create a proper folder name
            if (!folderMap.has(field.parentId)) {
              // Try to find a better name from fields that might represent the folder
              const folderName = field.folderName || field.parentName || `Folder ${field.parentId}`;
              folderMap.set(field.parentId, folderName);
            }
          }
        });
        
        // Convert map to array format
        const uniqueFolders = Array.from(folderMap.entries()).map(([parentId, name]) => ({
          parentId,
          name
        }));
        
        setFolders(uniqueFolders);
      } else {
        // Default fields if none exist
        setAvailableFields(["name", "email", "phone", "company", "notes"]);
        setFolders([]);
      }
    } catch {
      // Default fields on error
      setAvailableFields(["name", "email", "phone", "company", "notes"]);
      setFolders([]);
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
          setFieldsFile(null);
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
          setFieldsFile(null);
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
        setFieldsFile(null);
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

      const result = await response.json();
      setResult(result);
      setCurrentStep("success"); // Always go to success page to show detailed results

      // Compute counts for toast notification
      const errorCount = result.errors?.length || result.summary?.failed || 0;
      const successCount = (result.summary?.created || 0);
      const hasSuccesses = successCount > 0;

      if (errorCount > 0 && !hasSuccesses) {
        toast({
          title: "Import Failed",
          description: `${errorCount} field${errorCount !== 1 ? 's' : ''} failed to import.`,
          variant: "destructive",
        });
      } else if (errorCount > 0) {
        toast({
          title: "Import Completed with Errors",
          description: `${successCount} created, ${result.summary?.skipped || 0} skipped, ${errorCount} failed.`,
        });
      } else {
        toast({
          title: "Fields Imported Successfully",
          description: `${successCount} fields created, ${result.summary?.skipped || 0} skipped.`,
        });
      }

      // Only trigger review request on actual success
      if (hasSuccesses) {
        triggerReviewRequestEvent();
      }
    } catch (error) {
      // For network errors or unexpected failures, stay on preview
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import fields. Please try again.",
        variant: "destructive",
      });
      setCurrentStep("preview");
    }
  };

  const handleStartOver = () => {
    setCurrentStep("select");
    setSelectedObject("");
    setFolders([]);
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
          Select a standard object (Contact, Opportunity) or custom object to import fields into.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Select Object</CardTitle>
          <CardDescription>
            Choose which object you want to import custom fields into
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedObject} onValueChange={handleObjectSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select an object" />
            </SelectTrigger>
            <SelectContent>
              {/* Standard Objects First */}
              {objects.filter(obj => obj.isStandard).length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Standard Objects</div>
                  {objects.filter(obj => obj.isStandard).map((object) => (
                    <SelectItem key={object.id} value={object.key}>
                      <div className="flex items-center gap-2">
                        {object.key === 'contact' ? <User className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                        {object.labels.singular}
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
              {/* Custom Objects */}
              {objects.filter(obj => !obj.isStandard).length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Custom Objects</div>
                  {objects.filter(obj => !obj.isStandard).map((object) => (
                    <SelectItem key={object.id} value={object.key}>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        {object.labels.singular} ({object.key.replace('custom_objects.', '')})
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>

          {objects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No objects found. Please ensure you have connected your account.
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

      {/* Standard Object Info Alert */}
      {selectedObjectData?.isStandard && (
        <Alert>
          <User className="h-4 w-4" />
          <AlertDescription>
            <strong>Standard Object:</strong> Custom fields for {selectedObjectData.labels.singular} don't require folders.
            Fields will be added directly to the object and available in forms, workflows, and reporting.
          </AlertDescription>
        </Alert>
      )}

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
                  {selectedObjectData?.isStandard && (
                    <div className="border-l-2 border-muted pl-3">
                      <p className="font-medium">position</p>
                      <p className="text-muted-foreground">Display order position (number)</p>
                    </div>
                  )}
                  {!selectedObjectData?.isStandard && (
                    <div className="border-l-2 border-muted pl-3">
                      <p className="font-medium">existingFolderId</p>
                      <p className="text-muted-foreground">Destination folder ID for custom fields</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Folder Information - Simple Table (only for custom objects) */}
      {!selectedObjectData?.isStandard && folders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Available Folders
            </CardTitle>
            <CardDescription>
              Click to copy folder names or keys to your clipboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Folder Name</th>
                    <th className="text-left py-2 font-medium">Folder Key</th>
                  </tr>
                </thead>
                <tbody>
                  {folders.map((folder, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 text-left justify-start"
                          onClick={() => copyToClipboard(folder.name, "Folder name")}
                        >
                          {folder.name}
                        </Button>
                      </td>
                      <td className="py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 font-mono text-left justify-start"
                          onClick={() => copyToClipboard(folder.parentId, "Folder key")}
                        >
                          {folder.parentId}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Template Download and Upload Section - Combined */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Template & Upload
          </CardTitle>
          <CardDescription>
            Download the template, fill it with your field definitions, then upload
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
            <div className="space-y-2">
              <FileUploadZone
                onFileSelect={handleFieldsFile}
                acceptedTypes=".csv"
                maxSize={10}
                selectedFile={fieldsFile}
              />
            </div>
          </div>
        </CardContent>
      </Card>
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
        <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
        <h3 className="text-2xl font-bold">
          {result?.success ? 'Fields Import Complete!' : 'Import Completed with Issues'}
        </h3>
        <p className="text-muted-foreground">
          {result?.summary ? 
            `${result.summary.created} created, ${result.summary.skipped} skipped, ${result.summary.failed} failed` :
            `${fieldsData.length} field${fieldsData.length !== 1 ? 's' : ''} processed`
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
                <span>Total Fields:</span>
                <span className="font-medium">{result.summary.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600">Created:</span>
                <span className="font-medium text-green-600">{result.summary.created}</span>
              </div>
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
            <div className="flex justify-between">
              <span>Fields Processed:</span>
              <span className="font-medium">{fieldsData.length}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Results */}
      {result && (result.created || result.skipped || result.errors) && (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Created Fields */}
          {result.created && result.created.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Created Fields ({result.created.length})
                </CardTitle>
                <CardDescription>Fields that were successfully created</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {result.created.map((field: any, index: number) => (
                    <div key={index} className="text-sm bg-green-50 border border-green-200 rounded p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-green-800">
                          {field.label || field.name || `Field ${index + 1}`}
                        </span>
                        <span className="text-green-600 text-xs">Created</span>
                      </div>
                      {field.fieldKey && (
                        <p className="text-green-600 text-xs mt-1 font-mono">{field.fieldKey}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skipped Fields */}
          {result.skipped && result.skipped.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <AlertTriangle className="h-5 w-5" />
                  Skipped Fields ({result.skipped.length})
                </CardTitle>
                <CardDescription>Fields that were skipped during the import</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {result.skipped.map((field: any, index: number) => (
                    <div key={index} className="text-sm bg-yellow-50 border border-yellow-200 rounded p-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-medium text-yellow-800">
                          {field.fieldName || field.name || `Field ${index + 1}`}
                        </span>
                        <span className="text-yellow-600 text-xs">Skipped</span>
                      </div>
                      <p className="text-yellow-700 text-xs mt-1">{field.reason}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failed Fields */}
          {result.errors && result.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Failed Fields ({result.errors.length})
                </CardTitle>
                <CardDescription>Fields that failed to import</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {result.errors.map((error: any, index: number) => (
                    <div key={index} className="text-sm bg-red-50 border border-red-200 rounded p-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-medium text-red-800">
                          Row {error.recordIndex !== undefined ? error.recordIndex + 2 : index + 2}: {error.fieldName || error.name || 'Unknown'}
                        </span>
                        <span className="text-red-600 text-xs font-medium px-2 py-0.5 bg-red-100 rounded">
                          {error.errorCode || 'Failed'}
                        </span>
                      </div>
                      <p className="text-red-700 text-xs mt-1">{error.error}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

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
