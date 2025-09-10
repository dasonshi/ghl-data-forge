import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUploadZone } from "@/components/FileUploadZone";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { StepIndicator } from "@/components/StepIndicator";
import { Download, CheckCircle2, AlertTriangle, Upload, ArrowLeft, Database, Info, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useProgressInterval } from "@/hooks/useProgressInterval";
import { useLocationSwitch } from "@/hooks/useLocationSwitch";
import { apiFetch } from "@/lib/api";
import { useLocationId } from "@/hooks/useLocationId";
import Papa from "papaparse";

type ImportStep = "upload" | "preview" | "importing" | "success";

interface ImportResult {
  ok: boolean;
  message: string;
  stats: {
    objectsProcessed: number;
  };
  // Additional properties for detailed results
  created?: Array<any>;
}

export function ImportObjectsTab() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [objectsFile, setObjectsFile] = useState<File | null>(null);
  const [objectsData, setObjectsData] = useState<Record<string, string>[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { locationId, refresh } = useLocationId();
  const { toast } = useToast();
  const { startProgress, stopProgress, completeProgress } = useProgressInterval(setProgress);

  // Clear all data when location switches
  useLocationSwitch(() => {
    console.log('🔄 ImportObjectsTab: Clearing data for location switch');
    setCurrentStep("upload");
    setObjectsFile(null);
    setObjectsData([]);
    setProgress(0);
    setResult(null);
  });

  const downloadTemplate = async () => {
    try {
      const response = await apiFetch('/templates/objects', {}, locationId ?? undefined);
      
      if (response.ok) {
        const csvText = await response.text();
        const blob = new Blob([csvText], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'objects-template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Template Downloaded",
          description: "CSV template for objects downloaded successfully.",
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
        setObjectsData(data);
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
    if (!objectsFile) return;

    setCurrentStep("importing");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('objects', objectsFile);

      // Start progress simulation
      startProgress();

      const response = await apiFetch('/api/objects/import', {
        method: 'POST',
        body: formData,
      }, locationId ?? undefined);

      if (response.ok) {
        const result = await response.json();
        setResult(result);
        completeProgress();
        setCurrentStep("success");
        toast({
          title: "Objects Imported",
          description: "Your custom objects have been imported successfully.",
        });
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      stopProgress(); // Ensure interval is cleared on error
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
    setObjectsData([]);
    setProgress(0);
    setResult(null);
  };

  const renderUpload = () => (
    <div className="space-y-6">
      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          Upload a CSV file to import custom objects into your system. Download the template first to ensure proper formatting.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Custom Object CSV Format
          </CardTitle>
          <CardDescription>
            Fill in these fields for each custom object you want to create
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-primary mb-3">Object Labels (Required)</h4>
              <div className="space-y-3">
                <div className="border-l-2 border-primary pl-3">
                  <p className="font-medium">singular</p>
                  <p className="text-muted-foreground text-sm">Singular name of the custom object (e.g., "Pet", "Product")</p>
                </div>
                <div className="border-l-2 border-primary pl-3">
                  <p className="font-medium">plural</p>
                  <p className="text-muted-foreground text-sm">Plural name of the custom object (e.g., "Pets", "Products")</p>
                </div>
              </div>

              <h4 className="font-semibold text-primary mb-3 mt-6">Primary Display Property (Required)</h4>
              <div className="space-y-3">
                <div className="border-l-2 border-primary pl-3">
                  <p className="font-medium">name</p>
                  <p className="text-muted-foreground text-sm">Display name for the primary property (e.g., "Pet Name")</p>
                </div>
                <div className="border-l-2 border-primary pl-3">
                  <p className="font-medium">dataType</p>
                  <p className="text-muted-foreground text-sm">Data type: either "TEXT" or "NUMERICAL"</p>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-primary mb-3">Optional Fields</h4>
              <div className="space-y-3">
                <div className="border-l-2 border-muted pl-3">
                  <p className="font-medium">description</p>
                  <p className="text-muted-foreground text-sm">Brief description of what this object represents</p>
                </div>
              </div>
              
                <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Example Row:</strong><br/>
                  singular: "Pet", plural: "Pets", name: "Pet Name", dataType: "TEXT", description: "Animal companions"
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template Download and Upload Section - Combined */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Template & Upload
          </CardTitle>
          <CardDescription>
            Download the template, fill it with your object definitions, then upload
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
                onFileSelect={handleObjectsFile}
                acceptedTypes=".csv"
                maxSize={10}
                selectedFile={objectsFile}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Preview Objects Data</h3>
          <p className="text-sm text-muted-foreground">
            {objectsData.length} object{objectsData.length !== 1 ? 's' : ''} will be imported
          </p>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Review your data before importing. This action will create new custom objects in your system.
        </AlertDescription>
      </Alert>

      <DataPreviewTable data={objectsData} />

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("upload")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
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
          Please wait while we create your custom objects
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
        <h3 className="text-2xl font-bold">Objects Imported Successfully!</h3>
        <p className="text-muted-foreground">
          {result?.stats?.objectsProcessed || objectsData.length} custom object{(result?.stats?.objectsProcessed || objectsData.length) !== 1 ? 's' : ''} created
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Import Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Objects Created:</span>
            <span className="font-medium text-green-600">{result?.stats?.objectsProcessed || objectsData.length}</span>
          </div>
          <div className="flex justify-between">
            <span>CSV Rows Processed:</span>
            <span className="font-medium">{objectsData.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results - Show created objects */}
      {result && (result.created || objectsData.length > 0) && (
        <div className="space-y-4 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Created Objects ({result?.created?.length || objectsData.length})
              </CardTitle>
              <CardDescription>Custom objects that were successfully created</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(result?.created || objectsData).map((object: any, index: number) => (
                  <div key={index} className="text-sm bg-green-50 border border-green-200 rounded p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-800">
                        {object.singular || object.name || `Object ${index + 1}`}
                      </span>
                      <span className="text-green-600 text-xs">Created</span>
                    </div>
                    {object.description && (
                      <p className="text-green-700 text-xs mt-1">{object.description}</p>
                    )}
                    {object.key && (
                      <p className="text-green-600 text-xs mt-1 font-mono">{object.key}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Button variant="gradient" onClick={handleStartOver}>
        Import More Objects
      </Button>
    </div>
  );

  const steps = ["Download & Upload", "Preview Data", "Import Progress", "Review Results"];
  const stepMap = { upload: 0, preview: 1, importing: 2, success: 3 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Import Custom Objects</h2>
        <p className="text-muted-foreground">
          Import custom objects from CSV files with proper structure and validation
        </p>
      </div>

      <StepIndicator 
        steps={steps} 
        currentStep={stepMap[currentStep]} 
        className="mb-8"
      />

      {currentStep === "upload" && renderUpload()}
      {currentStep === "preview" && renderPreview()}
      {currentStep === "importing" && renderImporting()}
      {currentStep === "success" && renderSuccess()}
    </div>
  );
}
