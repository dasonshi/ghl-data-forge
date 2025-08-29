import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUploadZone } from "@/components/FileUploadZone";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Download, Upload, CheckCircle2, AlertTriangle, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ImportStep = "upload" | "preview" | "importing" | "success";

interface ImportResult {
  ok: boolean;
  message: string;
  stats: {
    schemasProcessed: number;
    fieldsProcessed: number;
    recordsProcessed: number;
  };
}

export function ImportObjectsTab() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [objectsFile, setObjectsFile] = useState<File | null>(null);
  const [fieldsFile, setFieldsFile] = useState<File | null>(null);
  const [objectsData, setObjectsData] = useState<Record<string, string>[]>([]);
  const [fieldsData, setFieldsData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const downloadTemplate = async (type: 'objects' | 'fields') => {
    try {
      const response = await fetch(`/templates/${type}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-template.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Template Downloaded",
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} CSV template downloaded successfully.`,
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

  const handleObjectsFile = (file: File) => {
    setObjectsFile(file);
    // Mock CSV parsing - replace with actual parsing
    const mockData = [
      { key: "leads", singular: "Lead", plural: "Leads", description: "Customer leads" },
      { key: "projects", singular: "Project", plural: "Projects", description: "Active projects" },
    ];
    setObjectsData(mockData);
  };

  const handleFieldsFile = (file: File) => {
    setFieldsFile(file);
    // Mock CSV parsing - replace with actual parsing  
    const mockData = [
      { objectKey: "leads", key: "industry", name: "Industry", type: "TEXT", required: "false" },
      { objectKey: "leads", key: "budget", name: "Budget", type: "NUMBER", required: "true" },
    ];
    setFieldsData(mockData);
  };

  const handleMappingChange = (column: string, field: string) => {
    setMapping(prev => ({ ...prev, [column]: field }));
  };

  const handlePreview = () => {
    if (!objectsFile) {
      toast({
        title: "Missing File",
        description: "Please upload an objects CSV file.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep("preview");
  };

  const handleImport = async () => {
    if (!objectsFile) return;

    setCurrentStep("importing");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('objects', objectsFile);
      if (fieldsFile) {
        formData.append('fields', fieldsFile);
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/import/mock-location-id', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        const result = await response.json();
        setResult(result);
        setCurrentStep("success");
        toast({
          title: "Import Successful",
          description: "Your custom objects have been imported successfully.",
        });
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import objects. Please try again.",
        variant: "destructive",
      });
      setCurrentStep("preview");
    }
  };

  const handleStartOver = () => {
    setCurrentStep("upload");
    setObjectsFile(null);
    setFieldsFile(null);
    setObjectsData([]);
    setFieldsData([]);
    setMapping({});
    setProgress(0);
    setResult(null);
  };

  const renderUpload = () => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Template Downloads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              CSV Templates
            </CardTitle>
            <CardDescription>
              Download properly formatted CSV templates to ensure correct data structure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => downloadTemplate('objects')}
            >
              <Database className="h-4 w-4 mr-2" />
              Download Objects Template
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => downloadTemplate('fields')}
            >
              <Database className="h-4 w-4 mr-2" />
              Download Fields Template
            </Button>
          </CardContent>
        </Card>

        {/* Upload Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Import Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">1</div>
              <p>Download and fill the objects CSV template with your custom object definitions</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">2</div>
              <p>Optionally, download and fill the fields CSV template for custom fields</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">3</div>
              <p>Upload your completed CSV files using the zones below</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Upload Zones */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h3 className="font-medium">Objects CSV (Required)</h3>
          <FileUploadZone
            onFileSelect={handleObjectsFile}
            acceptedTypes=".csv"
            maxSize={10}
            selectedFile={objectsFile}
          />
        </div>
        
        <div className="space-y-3">
          <h3 className="font-medium">Fields CSV (Optional)</h3>
          <FileUploadZone
            onFileSelect={handleFieldsFile}
            acceptedTypes=".csv"
            maxSize={10}
            selectedFile={fieldsFile}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          variant="gradient"
          onClick={handlePreview}
          disabled={!objectsFile}
          className="flex items-center gap-2"
        >
          Preview Data
          <Upload className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Review your data carefully before importing. This action will create new custom objects in GoHighLevel.
        </AlertDescription>
      </Alert>

      {objectsData.length > 0 && (
        <DataPreviewTable
          data={objectsData}
          mapping={mapping}
          onMappingChange={handleMappingChange}
          availableFields={["key", "singular", "plural", "description"]}
        />
      )}

      {fieldsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fields Preview</CardTitle>
            <CardDescription>
              {fieldsData.length} custom field{fieldsData.length !== 1 ? 's' : ''} will be created
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataPreviewTable
              data={fieldsData}
              mapping={{}}
              onMappingChange={() => {}}
              availableFields={["objectKey", "key", "name", "type", "required"]}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("upload")}>
          Back to Upload
        </Button>
        <Button variant="gradient" onClick={handleImport}>
          Import Objects
        </Button>
      </div>
    </div>
  );

  const renderImporting = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <Upload className="h-16 w-16 mx-auto text-primary animate-pulse" />
        <h3 className="text-xl font-semibold">Importing Objects...</h3>
        <p className="text-muted-foreground">
          Please wait while we process your custom objects and fields
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
        <h3 className="text-2xl font-bold">Import Completed!</h3>
        <p className="text-muted-foreground">
          Your custom objects have been successfully imported to GoHighLevel
        </p>
      </div>

      {result && (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Import Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Objects Created:</span>
              <span className="font-medium">{result.stats.schemasProcessed}</span>
            </div>
            <div className="flex justify-between">
              <span>Fields Created:</span>
              <span className="font-medium">{result.stats.fieldsProcessed}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Button variant="gradient" onClick={handleStartOver}>
        Import More Objects
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Import Custom Objects</h2>
        <p className="text-muted-foreground">
          Create new custom objects and their associated fields in GoHighLevel
        </p>
      </div>

      {currentStep === "upload" && renderUpload()}
      {currentStep === "preview" && renderPreview()}
      {currentStep === "importing" && renderImporting()}
      {currentStep === "success" && renderSuccess()}
    </div>
  );
}