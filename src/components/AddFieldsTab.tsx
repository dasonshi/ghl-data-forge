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
import { Download, Plus, CheckCircle2, AlertTriangle, Database, Info, FileText, Settings, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export function AddFieldsTab() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("select");
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [fieldsFile, setFieldsFile] = useState<File | null>(null);
  const [fieldsData, setFieldsData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const { toast } = useToast();

  const fetchAuthStatus = async () => {
    try {
      const response = await fetch('https://importer.savvysales.ai/api/auth/status', {
        credentials: 'include',
      });
      const data = await response.json();
      setAuthData(data);
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthData({ authenticated: false });
    }
  };

  const fetchObjects = async () => {
    try {
      const response = await fetch('https://importer.savvysales.ai/api/objects', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
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
    try {
      const response = await fetch('https://importer.savvysales.ai/api/objects/fields/template', {
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
    if (!fieldsFile || !selectedObject || !authData?.locationId) return;

    setCurrentStep("importing");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('fields', fieldsFile);
      formData.append('objectKey', selectedObject);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      const response = await fetch(`https://importer.savvysales.ai/api/objects/${selectedObject}/fields/import`, {
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
        throw new Error('Import failed');
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import custom fields. Please try again.",
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

  useEffect(() => {
    fetchAuthStatus();
    fetchObjects();
  }, []);

  const selectedObjectData = Array.isArray(objects) ? objects.find(obj => obj.key === selectedObject) : undefined;

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
              {Array.isArray(objects) && objects.map((object) => (
                <SelectItem key={object.id} value={object.key}>
                  {object.labels.singular} ({object.key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(!Array.isArray(objects) || objects.length === 0) && (
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
            Importing Fields to: {selectedObjectData?.labels.singular}
          </h3>
          <p className="text-sm text-muted-foreground">Object Key: {selectedObject}</p>
        </div>
        <Button variant="outline" onClick={() => setCurrentStep("select")}>
          Change Object
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
              <Info className="h-5 w-5" />
              Field Guide
            </CardTitle>
            <CardDescription>
              Complete reference for CSV template fields
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="quick-start">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Quick Start Guide
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">1</div>
                      <p>Download the fields CSV template</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">2</div>
                      <p>Fill in your custom field definitions using the guide below</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">3</div>
                      <p>Upload the completed CSV file</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="required-fields">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Required Fields
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-sm">
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="font-semibold flex items-center gap-2">
                        <code className="bg-muted px-1 rounded">name</code>
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      </div>
                      <p>Display name of the field shown to users.</p>
                      <p className="text-muted-foreground">Example: "Customer Industry", "Project Budget"</p>
                    </div>

                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="font-semibold flex items-center gap-2">
                        <code className="bg-muted px-1 rounded">dataType</code>
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      </div>
                      <p>Type of field that determines input behavior and validation.</p>
                      <div className="bg-muted/50 p-2 rounded text-xs space-y-1">
                        <p><strong>Options:</strong> TEXT, LARGE_TEXT, NUMERICAL, PHONE, MONETARY, CHECKBOX, SINGLE_OPTIONS, MULTIPLE_OPTIONS, DATE, TEXTBOX_LIST, FILE_UPLOAD, RADIO, EMAIL</p>
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="font-semibold flex items-center gap-2">
                        <code className="bg-muted px-1 rounded">fieldKey</code>
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      </div>
                      <p>Unique field identifier with specific format.</p>
                      <div className="bg-muted/50 p-2 rounded text-xs">
                        <p><strong>Format:</strong> custom_object.&#123;objectKey&#125;.&#123;fieldKey&#125;</p>
                        <p><strong>Example:</strong> custom_object.pet.breed_type</p>
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="font-semibold flex items-center gap-2">
                        <code className="bg-muted px-1 rounded">showInForms</code>
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      </div>
                      <p>Whether the field appears in forms.</p>
                      <p className="text-muted-foreground">Values: true or false</p>
                    </div>

                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="font-semibold flex items-center gap-2">
                        <code className="bg-muted px-1 rounded">parentId</code>
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      </div>
                      <p>ID of the parent folder for organization.</p>
                      <p className="text-muted-foreground">Contact support for available parent IDs</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="optional-fields">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Optional Fields
                    <Badge variant="secondary" className="text-xs">Optional</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 text-sm">
                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="font-semibold flex items-center gap-2">
                        <code className="bg-muted px-1 rounded">description</code>
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      </div>
                      <p>Description text that explains the field's purpose.</p>
                    </div>

                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="font-semibold flex items-center gap-2">
                        <code className="bg-muted px-1 rounded">placeholder</code>
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      </div>
                      <p>Placeholder text shown in empty input fields.</p>
                      <p className="text-muted-foreground">Example: "Enter customer industry..."</p>
                    </div>

                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="font-semibold flex items-center gap-2">
                        <code className="bg-muted px-1 rounded">options</code>
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      </div>
                      <p>For SINGLE_OPTIONS, MULTIPLE_OPTIONS, RADIO, CHECKBOX fields. JSON array format.</p>
                      <div className="bg-muted/50 p-2 rounded text-xs">
                        <p><strong>Format:</strong> [&#123;"key":"opt1","label":"Option 1"&#125;,&#123;"key":"opt2","label":"Option 2"&#125;]</p>
                        <p><strong>For RADIO:</strong> Include optional "url" field</p>
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="font-semibold flex items-center gap-2">
                        <code className="bg-muted px-1 rounded">acceptedFormats</code>
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      </div>
                      <p>File formats allowed for FILE_UPLOAD fields.</p>
                      <div className="bg-muted/50 p-2 rounded text-xs">
                        <p><strong>Options:</strong> .pdf, .docx, .doc, .jpg, .jpeg, .png, .gif, .csv, .xlsx, .xls, all</p>
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="font-semibold flex items-center gap-2">
                        <code className="bg-muted px-1 rounded">maxFileLimit</code>
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      </div>
                      <p>Maximum number of files for FILE_UPLOAD fields.</p>
                      <p className="text-muted-foreground">Example: 2 (allows up to 2 files)</p>
                    </div>

                    <div className="border rounded-lg p-3 space-y-2">
                      <div className="font-semibold flex items-center gap-2">
                        <code className="bg-muted px-1 rounded">allowCustomOption</code>
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      </div>
                      <p>For RADIO fields: allows users to enter custom values not in predefined options.</p>
                      <p className="text-muted-foreground">Values: true or false</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="data-types">
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Data Type Reference
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-2">
                      <div className="font-semibold">Text Fields</div>
                      <div className="space-y-1 text-xs">
                        <p><code className="bg-muted px-1 rounded">TEXT</code> - Single line text</p>
                        <p><code className="bg-muted px-1 rounded">LARGE_TEXT</code> - Multi-line text</p>
                        <p><code className="bg-muted px-1 rounded">EMAIL</code> - Email validation</p>
                        <p><code className="bg-muted px-1 rounded">PHONE</code> - Phone number</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold">Number Fields</div>
                      <div className="space-y-1 text-xs">
                        <p><code className="bg-muted px-1 rounded">NUMERICAL</code> - Number input</p>
                        <p><code className="bg-muted px-1 rounded">MONETARY</code> - Currency amount</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold">Selection Fields</div>
                      <div className="space-y-1 text-xs">
                        <p><code className="bg-muted px-1 rounded">SINGLE_OPTIONS</code> - Dropdown select</p>
                        <p><code className="bg-muted px-1 rounded">MULTIPLE_OPTIONS</code> - Multi-select</p>
                        <p><code className="bg-muted px-1 rounded">RADIO</code> - Radio buttons</p>
                        <p><code className="bg-muted px-1 rounded">CHECKBOX</code> - Checkboxes</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold">Other Fields</div>
                      <div className="space-y-1 text-xs">
                        <p><code className="bg-muted px-1 rounded">DATE</code> - Date picker</p>
                        <p><code className="bg-muted px-1 rounded">FILE_UPLOAD</code> - File uploads</p>
                        <p><code className="bg-muted px-1 rounded">TEXTBOX_LIST</code> - List of text inputs</p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
          Back to Upload
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Import Custom Fields</h2>
        <p className="text-muted-foreground">
          Import new custom fields into existing custom objects
        </p>
      </div>

      {currentStep === "select" && renderSelect()}
      {currentStep === "upload" && renderUpload()}
      {currentStep === "preview" && renderPreview()}
      {currentStep === "importing" && renderImporting()}
      {currentStep === "success" && renderSuccess()}
    </div>
  );
}