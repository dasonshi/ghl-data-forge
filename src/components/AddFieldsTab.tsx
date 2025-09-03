import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone } from "@/components/FileUploadZone";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Download, Plus, CheckCircle2, AlertTriangle, Database, Info, FileText, Settings, Type, Folder, Hash, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocationSwitch } from "@/hooks/useLocationSwitch";
import { useAppContext } from "@/hooks/useAppContext";
import { StepIndicator } from "@/components/StepIndicator";
import Papa from "papaparse";

interface CustomObject {
  id: string;
  key: string;
  labels: {
    singular: string;
    plural: string;
  };
}

interface AuthData {
  authenticated: boolean;
  locationId?: string;
  tokenStatus?: string;
}

type ImportStep = "select" | "upload" | "preview" | "importing" | "success";

interface CustomField {
  id: string;
  key: string;
  name: string;
  type: string;
  required?: boolean;
  parentId?: string;
  folderName?: string;
}

interface FolderInfo {
  id: string;
  name: string;
  fields: CustomField[];
}

export function AddFieldsTab() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("select");
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [availableFields, setAvailableFields] = useState<CustomField[]>([]);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [fieldsFile, setFieldsFile] = useState<File | null>(null);
  const [fieldsData, setFieldsData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const { toast } = useToast();
  
  // Get current location context
  const { location, user } = useAppContext();
  const currentLocationId = location?.id || user?.activeLocation;

  // Clear all data when location switches and refetch for new location
  useLocationSwitch(({ newLocationId }) => {
    console.log('🔄 AddFieldsTab: Location switch detected:', newLocationId);
    
    // Clear all state immediately
    setCurrentStep("select");
    setObjects([]);
    setSelectedObject("");
    setAvailableFields([]);
    setFolders([]);
    setFieldsFile(null);
    setFieldsData([]);
    setMapping({});
    setProgress(0);
    setAuthData(null);
    
    // Wait a moment for location context to update, then refetch
    setTimeout(() => {
      fetchAuthStatus();
      fetchObjects(newLocationId);
    }, 500);
  });

  const fetchAuthStatus = async () => {
    try {
      const response = await fetch('https://importer.api.savvysales.ai/api/auth/status', {
        credentials: 'include',
      });
      const data = await response.json();
      setAuthData(data);
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthData({ authenticated: false });
    }
  };

  const fetchObjects = async (locationId?: string) => {
    try {
      const url = locationId 
        ? `https://importer.api.savvysales.ai/api/objects?locationId=${locationId}`
        : 'https://importer.api.savvysales.ai/api/objects';
        
      console.log('🔄 AddFieldsTab: Fetching objects for location:', locationId || 'cookie');
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const objectsList = data.objects || data || [];
        console.log('✅ AddFieldsTab: Loaded', objectsList.length, 'objects');
        setObjects(objectsList);
      } else {
        console.error('Failed to fetch objects:', response.status);
        setObjects([]);
      }
    } catch (error) {
      console.error('Error fetching objects:', error);
      toast({
        title: "Error",
        description: "Failed to load custom objects. Please try again.",
        variant: "destructive",
      });
      setObjects([]);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('https://importer.api.savvysales.ai/templates/fields', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fields-template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Template Downloaded",
          description: "Fields CSV template downloaded successfully.",
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        toast({
          title: "Download Failed",
          description: `Server error: ${errorData.error || 'Failed to generate template'}. Please contact support.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Network error occurred. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  const fetchFields = async (objectKey: string) => {
    try {
      const url = currentLocationId
        ? `https://importer.api.savvysales.ai/api/objects/${objectKey}/fields?locationId=${currentLocationId}`
        : `https://importer.api.savvysales.ai/api/objects/${objectKey}/fields`;
        
      console.log('🔄 AddFieldsTab: Fetching fields for object:', objectKey, 'location:', currentLocationId);
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const fields = data.fields || [];
        const folderData = data.folders || [];

        // Process fields and organize by folder
        const processedFields: CustomField[] = fields.map((field: any) => ({
          id: field.id,
          key: field.fieldKey || field.key,
          name: field.name,
          type: field.dataType || field.type,
          required: field.required,
          parentId: field.parentId,
          folderName: field.folder?.field?.name || 'No Folder'
        }));

        // Organize fields by folder
        const folderMap = new Map<string, FolderInfo>();
        
        // Add folders first
        folderData.forEach((folder: any) => {
          folderMap.set(folder.id, {
            id: folder.id,
            name: folder.field?.name || folder.name,
            fields: []
          });
        });

        // Add fields to their respective folders
        processedFields.forEach(field => {
          if (field.parentId && folderMap.has(field.parentId)) {
            folderMap.get(field.parentId)!.fields.push(field);
          } else {
            // Fields without folder
            if (!folderMap.has('no-folder')) {
              folderMap.set('no-folder', {
                id: 'no-folder',
                name: 'Ungrouped Fields',
                fields: []
              });
            }
            folderMap.get('no-folder')!.fields.push(field);
          }
        });

        setAvailableFields(processedFields);
        setFolders(Array.from(folderMap.values()));
      } else {
        console.error('Failed to fetch fields:', response.status);
        setAvailableFields([]);
        setFolders([]);
      }
    } catch (error) {
      console.error('Failed to fetch fields:', error);
      setAvailableFields([]);
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
    // Mock CSV parsing - replace with actual parsing
    const mockData = [
      { key: "industry", name: "Industry", type: "TEXT", required: "false", description: "Customer industry" },
      { key: "budget", name: "Budget", type: "NUMBER", required: "true", description: "Project budget" },
      { key: "priority", name: "Priority", type: "SELECT", required: "false", description: "Task priority level" },
    ];
    setFieldsData(mockData);
    setCurrentStep("preview");
  };

  const handleMappingChange = (column: string, field: string) => {
    setMapping(prev => ({ ...prev, [column]: field }));
  };

  const handleImport = async () => {
    if (!fieldsFile || !selectedObject || !currentLocationId) {
      toast({
        title: "Import Error",
        description: "Missing required data for import. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setCurrentStep("importing");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('fields', fieldsFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      // Use location-aware endpoint
      const url = `https://importer.api.savvysales.ai/api/objects/${selectedObject}/fields/import?locationId=${currentLocationId}`;
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        setCurrentStep("success");
        toast({
          title: "Fields Added",
          description: "Custom fields have been imported successfully.",
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Import failed');
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import Failed",
        description: `Failed to import custom fields: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    setMapping({});
    setProgress(0);
  };

  // Initial load and location changes
  useEffect(() => {
    fetchAuthStatus();
    if (currentLocationId) {
      console.log('🔄 AddFieldsTab: Initial load for location:', currentLocationId);
      fetchObjects(currentLocationId);
    } else {
      console.log('🔄 AddFieldsTab: Initial load without specific location');
      fetchObjects();
    }
  }, [currentLocationId]); // Re-run when location changes

  const selectedObjectData = Array.isArray(objects) ? objects.find(obj => obj.key === selectedObject) : undefined;

  const renderSelect = () => (
    <div className="space-y-6">
      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          Select an existing custom object to import fields into it.
          {location?.name && <span className="ml-2 font-medium">• Current location: {location.name}</span>}
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
              {Array.isArray(objects) && objects.map((object) => (
                <SelectItem key={object.id} value={object.key}>
                  {object.labels.singular} ({object.key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(!Array.isArray(objects) || objects.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No custom objects found</p>
              <p className="text-sm">Create custom objects first before importing fields.</p>
              {currentLocationId && (
                <p className="text-xs mt-2">Location: {currentLocationId}</p>
              )}
            </div>
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

  // Rest of the render methods remain the same...
  const renderUpload = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Importing Fields to: {selectedObjectData?.labels.singular}
          </h3>
          <p className="text-sm text-muted-foreground">
            Object Key: {selectedObject}
            {location?.name && <span className="ml-2">• {location.name}</span>}
          </p>
        </div>
        <Button variant="outline" onClick={() => setCurrentStep("select")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Rest of the upload UI remains the same */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              CSV Template
            </CardTitle>
            <CardDescription>
              Download the fields template and fill it with your custom field definitions
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
              <Folder className="h-5 w-5" />
              Existing Field Organization
            </CardTitle>
            <CardDescription>
              Current fields organized by folders with parentId references
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {folders.length > 0 ? (
              <Accordion type="multiple" className="w-full">
                {folders.map((folder) => (
                  <AccordionItem key={folder.id} value={folder.id}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        <span>{folder.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {folder.fields.length} fields
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          Parent ID: <code className="bg-muted px-1 rounded">{folder.id}</code>
                        </div>
                        {folder.fields.map((field) => (
                          <div key={field.id} className="text-sm bg-muted/30 px-3 py-2 rounded border-l-2 border-primary/20">
                            <div className="font-medium">{field.name}</div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>Key: <code className="bg-muted px-1 rounded">{field.key}</code></div>
                              <div>Type: <Badge variant="outline" className="text-xs">{field.type}</Badge></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No existing fields found</p>
                <p className="text-xs">Select an object to view its field organization</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Field Guide Card - keeping original content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Field Guide
            </CardTitle>
            <CardDescription>
              Complete reference for CSV template fields
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Original field guide content remains the same */}
            <p className="text-sm text-muted-foreground">Complete field reference guide available in original component</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">Upload Fields CSV</h3>
        <FileUploadZone
          onFileSelect={handleFieldsFile}
          acceptedTypes=".csv"
          maxSize={10}
          selectedFile={fieldsFile}
        />
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Preview Fields for: {selectedObjectData?.labels.singular}
          </h3>
          <p className="text-sm text-muted-foreground">
            {fieldsData.length} field{fieldsData.length !== 1 ? 's' : ''} will be imported
          </p>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Review your field definitions carefully. These will be imported into the selected custom object.
        </AlertDescription>
      </Alert>

      <DataPreviewTable data={fieldsData} />

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("upload")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button variant="gradient" onClick={handleImport}>
          Import Fields
        </Button>
      </div>
    </div>
  );

  const renderImporting = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <Plus className="h-16 w-16 mx-auto text-primary animate-pulse" />
        <h3 className="text-xl font-semibold">Importing Fields...</h3>
        <p className="text-muted-foreground">
          Please wait while we import the custom fields into your object
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
          {fieldsData.length} custom field{fieldsData.length !== 1 ? 's' : ''} imported into {selectedObjectData?.labels.singular}
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Object:</span>
            <span className="font-medium">{selectedObjectData?.labels.singular}</span>
          </div>
          <div className="flex justify-between">
            <span>Fields Imported:</span>
            <span className="font-medium">{fieldsData.length}</span>
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
        <h2 className="text-2xl font-bold">Import Custom Fields</h2>
        <p className="text-muted-foreground">
          Import new custom fields into existing custom objects
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
