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

type ImportStep = "upload" | "preview" | "importing" | "success";

interface ImportResult {
  ok: boolean;
  message: string;
  stats: {
    recordsProcessed: number;
  };
}

export function UploadAssociationsTab() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [relationsFile, setRelationsFile] = useState<File | null>(null);
  const [relationsData, setRelationsData] = useState<Record<string, string>[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { location, refreshContext } = useAppContext();
  const { toast } = useToast();

  // Clear all data when location switches
  useLocationSwitch(async () => {
    console.log('🔄 UploadAssociationsTab: Clearing data for location switch');
    setCurrentStep("upload");
    setRelationsFile(null);
    setRelationsData([]);
    setProgress(0);
    setResult(null);
    
    await refreshContext();
  });

  const downloadTemplate = async () => {
    try {
      const response = await apiFetch('/templates/relations', {}, location?.id ?? undefined);
      
      if (response.ok) {
        const csvText = await response.text();
        const blob = new Blob([csvText], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'relations-template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Template Downloaded",
          description: "CSV template for updating record relations downloaded.",
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

  const handleRelationsFile = (file: File) => {
    setRelationsFile(file);
    
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
        setRelationsData(data);
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
    if (!relationsFile) return;

    setCurrentStep("importing");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('relations', relationsFile, relationsFile.name);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiFetch('/api/associations/relations/import', {
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
          title: "Relations Updated",
          description: "Your record relations have been updated successfully.",
        });
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to update relations. Please try again.",
        variant: "destructive",
      });
      setCurrentStep("preview");
    }
  };

  const handleStartOver = () => {
    setCurrentStep("upload");
    setRelationsFile(null);
    setRelationsData([]);
    setProgress(0);
    setResult(null);
  };

  const renderUpload = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Update Record Relations</h2>
        <p className="text-muted-foreground">
          Upload a CSV file to update relationships between records
        </p>
      </div>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          Download the CSV template, fill it with your relation data, and upload it to update record relationships.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              CSV Template
            </CardTitle>
            <CardDescription>
              Download the relations template and fill it with your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={downloadTemplate}
            >
              <Database className="h-4 w-4 mr-2" />
              Download Relations Template
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
              Upload your completed CSV file with relation data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone
              onFileSelect={handleRelationsFile}
              acceptedTypes=".csv,text/csv"
              maxSize={10 * 1024 * 1024} // 10MB
              selectedFile={relationsFile}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Preview Relations Data</h3>
          <p className="text-sm text-muted-foreground">
            Review your data before importing ({relationsData.length} relations)
          </p>
        </div>
        <Button variant="outline" onClick={() => setCurrentStep("upload")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <DataPreviewTable data={relationsData} />
          
          <div className="mt-6 flex gap-4">
            <Button onClick={handleImport} className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Import Relations ({relationsData.length} relations)
            </Button>
            <Button variant="outline" onClick={() => setCurrentStep("upload")}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderImporting = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h3 className="text-lg font-semibold">Importing Relations...</h3>
        <Progress value={progress} className="w-full max-w-md mx-auto" />
        <p className="text-sm text-muted-foreground">
          Please wait while we process your relations data.
        </p>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-6">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-success/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Relations Updated Successfully!</h3>
          <p className="text-muted-foreground">
            Your record relations have been processed successfully.
          </p>
        </div>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Import Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Relations Processed:</span>
                <span className="font-semibold">{result.stats.recordsProcessed}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={handleStartOver} className="w-full max-w-sm">
          Import More Relations
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <StepIndicator 
        steps={["Upload", "Preview", "Importing", "Complete"]}
        currentStep={currentStep === "upload" ? 0 : currentStep === "preview" ? 1 : currentStep === "importing" ? 2 : 3}
      />

      {currentStep === "upload" && renderUpload()}
      {currentStep === "preview" && renderPreview()}
      {currentStep === "importing" && renderImporting()}
      {currentStep === "success" && renderSuccess()}
    </div>
  );
}