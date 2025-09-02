import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUploadZone } from "@/components/FileUploadZone";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Download, Database, Info, FileText, Upload, CheckCircle2, AlertTriangle, Settings, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";

type ImportStep = "upload" | "preview" | "importing" | "success";

interface ImportResult {
  ok: boolean;
  message: string;
  stats: {
    objectsProcessed: number;
  };
}

export function ImportObjectsTab() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [objectsFile, setObjectsFile] = useState<File | null>(null);
  const [objectsData, setObjectsData] = useState<Record<string, string>[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const downloadObjectsTemplate = async () => {
    try {
      const response = await fetch('https://importer.api.savvysales.ai/templates/objects', {
        credentials: 'include',
      });
      if (response.ok) {
        const blob = await response.blob();
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
          description: "Objects CSV template downloaded successfully.",
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

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      const response = await fetch('https://importer.api.savvysales.ai/api/objects/import', {
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
          title: "Objects Imported",
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

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Objects Template
            </CardTitle>
            <CardDescription>
              Download the CSV template to define your custom objects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={downloadObjectsTemplate}
              variant="outline"
              className="w-full"
            >
              <Database className="h-4 w-4 mr-2" />
              Download Objects Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Objects Guide
            </CardTitle>
            <CardDescription>
              Complete reference for CSV template fields
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">1</div>
                <p>Download the objects CSV template</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">2</div>
                <p>Fill in the required fields for each custom object</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">3</div>
                <p>Upload the completed CSV file below</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">4</div>
                <p>Preview and import your custom objects</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">Upload Objects CSV</h3>
        <FileUploadZone
          onFileSelect={handleObjectsFile}
          acceptedTypes=".csv"
          maxSize={10}
          selectedFile={objectsFile}
        />
      </div>
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
        <CheckCircle2 className="h-16 w-16 mx-auto text-success" />
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
            <span className="font-medium">{result?.stats?.objectsProcessed || objectsData.length}</span>
          </div>
          <div className="flex justify-between">
            <span>CSV Rows Processed:</span>
            <span className="font-medium">{objectsData.length}</span>
          </div>
        </CardContent>
      </Card>

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
          Import custom objects from CSV files with proper structure and validation
        </p>
      </div>

      {currentStep === "upload" && renderUpload()}
      {currentStep === "preview" && renderPreview()}
      {currentStep === "importing" && renderImporting()}
      {currentStep === "success" && renderSuccess()}
    </div>
  );
}