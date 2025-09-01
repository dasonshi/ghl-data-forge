import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone } from "@/components/FileUploadZone";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Download, Database, CheckCircle2, AlertTriangle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  key: string;
  name: string;
  type: string;
  required?: boolean;
  parentId?: string;
  folderName?: string;
}

type ImportStep = "select" | "upload" | "preview" | "importing" | "success";

interface ImportResult {
  ok: boolean;
  message: string;
  stats: {
    recordsProcessed: number;
  };
}

export function ImportRecordsTab() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("select");
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [availableFields, setAvailableFields] = useState<CustomField[]>([]);
  const [recordsFile, setRecordsFile] = useState<File | null>(null);
  const [recordsData, setRecordsData] = useState<Record<string, string>[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

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

  const fetchFields = async (objectKey: string) => {
    try {
      const response = await fetch(`https://importer.savvysales.ai/api/objects/${objectKey}/fields`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const fields = data.fields || [];
        setAvailableFields(fields.map((field: any) => ({
          id: field.id,
          key: field.fieldKey || field.key,
          name: field.name || field.fieldKey || field.key,
          type: field.type || 'text',
          required: field.required,
          parentId: field.parentId,
          folderName: field.folderName
        })));
      }
    } catch (error) {
      // Use mock fields if API fails
      setAvailableFields([
        { id: '1', key: 'name', name: 'Name', type: 'text' },
        { id: '2', key: 'email', name: 'Email', type: 'email' },
        { id: '3', key: 'phone', name: 'Phone', type: 'text' },
        { id: '4', key: 'company', name: 'Company', type: 'text' },
        { id: '5', key: 'notes', name: 'Notes', type: 'text' }
      ]);
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
      const response = await fetch(`https://importer.savvysales.ai/api/objects/${selectedObject}/template`, {
        credentials: 'include',
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedObject}-template.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Template Downloaded",
          description: `CSV template for ${selectedObjectData?.labels.singular} downloaded successfully.`,
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
      const formData = new FormData();
      formData.append('records', recordsFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(`https://importer.savvysales.ai/api/objects/${selectedObject}/records/import`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

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
  }, []);

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
              Download the records template and fill it with your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={downloadTemplate}
            >
              <Database className="h-4 w-4 mr-2" />
              Download Records Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Fields</CardTitle>
            <CardDescription>
              Fields available for mapping in this object
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {availableFields.length > 0 ? (
                availableFields.map((field, index) => (
                  <div key={index} className="text-sm bg-muted/50 px-3 py-2 rounded space-y-1">
                    <div className="font-medium">{field.name}</div>
                    {field.folderName && (
                      <div className="text-xs text-muted-foreground">
                        📁 {field.folderName}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Key: {field.key} • Type: {field.type}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Loading fields...</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">Upload Records CSV</h3>
        <FileUploadZone
          onFileSelect={handleRecordsFile}
          acceptedTypes=".csv"
          maxSize={10}
          selectedFile={recordsFile}
        />
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
          Review your data before importing. All CSV columns will be imported as-is.
        </AlertDescription>
      </Alert>

      <DataPreviewTable data={recordsData} />

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("upload")}>
          Back to Upload
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
        <h3 className="text-2xl font-bold">Records Imported Successfully!</h3>
        <p className="text-muted-foreground">
          {result?.stats?.recordsProcessed || recordsData.length} record{(result?.stats?.recordsProcessed || recordsData.length) !== 1 ? 's' : ''} imported to {selectedObjectData?.labels.singular}
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
            <span>Records Imported:</span>
            <span className="font-medium">{result?.stats?.recordsProcessed || recordsData.length}</span>
          </div>
          <div className="flex justify-between">
            <span>CSV Columns:</span>
            <span className="font-medium">{recordsData.length > 0 ? Object.keys(recordsData[0]).length : 0}</span>
          </div>
        </CardContent>
      </Card>

      <Button variant="gradient" onClick={handleStartOver}>
        Import More Records
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Import Records</h2>
        <p className="text-muted-foreground">
          Import records into existing custom objects with field mapping
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