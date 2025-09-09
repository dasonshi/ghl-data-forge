import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone } from "@/components/FileUploadZone";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { AssociationsTable } from "@/components/AssociationsTable";
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

type ImportStep = "select" | "selectAssociation" | "upload" | "preview" | "importing" | "success";

interface ImportResult {
  ok: boolean;
  message: string;
  stats: {
    recordsProcessed: number;
  };
}

export function UploadAssociationsTab() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("select");
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [selectedAssociation, setSelectedAssociation] = useState<Association | null>(null);
  const [relationsFile, setRelationsFile] = useState<File | null>(null);
  const [relationsData, setRelationsData] = useState<Record<string, string>[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [associationsLoading, setAssociationsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { location, refreshContext } = useAppContext();
  const { toast } = useToast();

  // Fetch objects
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

  // Fetch associations for the selected object
  const fetchAssociations = async () => {
    if (!selectedObject || !location?.id) return;
    
    setAssociationsLoading(true);
    try {
      const response = await apiFetch(`/api/objects/${selectedObject}/associations`, {}, location.id);
      if (response.ok) {
        const data = await response.json();
        setAssociations(data.associations || []);
      }
    } catch (error) {
      console.error('Failed to fetch associations:', error);
    } finally {
      setAssociationsLoading(false);
    }
  };

  // Fetch objects when component mounts
  useEffect(() => {
    if (location?.id) {
      fetchObjects();
    }
  }, [location?.id]);

  // Fetch associations when selected object changes
  useEffect(() => {
    if (selectedObject) {
      fetchAssociations();
    }
  }, [selectedObject, location?.id]);

  // Clear all data when location switches
  useLocationSwitch(async () => {
    console.log('🔄 UploadAssociationsTab: Clearing data for location switch');
    setCurrentStep("select");
    setObjects([]);
    setSelectedObject("");
    setSelectedAssociation(null);
    setRelationsFile(null);
    setRelationsData([]);
    setAssociations([]);
    setProgress(0);
    setResult(null);
    
    await refreshContext();
    await fetchObjects();
  });

  const downloadTemplate = async () => {
    if (!selectedAssociation) return;
    
    try {
      const response = await apiFetch(`/templates/relations/${selectedAssociation.id}`, {}, location?.id ?? undefined);
      
      if (response.ok) {
        const csvText = await response.text();
        const blob = new Blob([csvText], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedAssociation.firstObjectLabel?.toLowerCase()}-${selectedAssociation.secondObjectLabel?.toLowerCase()}-relations-template.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Template Downloaded",
          description: `CSV template for ${selectedAssociation.firstObjectLabel} - ${selectedAssociation.secondObjectLabel} relations downloaded.`,
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
        const errorText = await response.text();
        console.error('Import failed:', response.status, errorText);
        throw new Error(`Import failed: ${response.status}`);
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
    setCurrentStep("select");
    setSelectedObject("");
    setSelectedAssociation(null);
    setRelationsFile(null);
    setRelationsData([]);
    setAssociations([]);
    setProgress(0);
    setResult(null);
  };

  const renderSelect = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Import Record Relations</h2>
        <p className="text-muted-foreground">
          Select a custom object to import relationships for its records
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Custom Object</CardTitle>
          <CardDescription>
            Choose the object you want to import record relations for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedObject} onValueChange={setSelectedObject}>
            <SelectTrigger>
              <SelectValue placeholder="Select a custom object..." />
            </SelectTrigger>
            <SelectContent>
              {objects.map((obj) => (
                <SelectItem key={obj.key} value={obj.key}>
                  {obj.labels.plural}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedObject && (
            <Button 
              className="w-full mt-4" 
              onClick={() => setCurrentStep("selectAssociation")}
            >
              Continue with {objects.find(obj => obj.key === selectedObject)?.labels.plural}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderSelectAssociation = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Select Association</h2>
          <p className="text-muted-foreground">
            Choose which association type to import relations for
          </p>
        </div>
        <Button variant="outline" onClick={() => setCurrentStep("select")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Change Object
        </Button>
      </div>

      <AssociationsTable 
        associations={associations} 
        loading={associationsLoading} 
      />

      {associations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Association Type</CardTitle>
            <CardDescription>
              Choose the specific association you want to import relations for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedAssociation?.id || ""} 
              onValueChange={(value) => {
                const association = associations.find(a => a.id === value);
                setSelectedAssociation(association || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an association..." />
              </SelectTrigger>
              <SelectContent>
                {associations.map((association) => (
                  <SelectItem key={association.id} value={association.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{association.description}</span>
                      <span className="text-xs text-muted-foreground">
                        {association.firstObjectLabel} → {association.secondObjectLabel}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedAssociation && (
              <Button 
                className="w-full mt-4" 
                onClick={() => setCurrentStep("upload")}
              >
                Continue with {selectedAssociation.firstObjectLabel} → {selectedAssociation.secondObjectLabel}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderUpload = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Import Record Relations</h2>
          <p className="text-muted-foreground">
            Upload a CSV file to import {selectedAssociation?.firstObjectLabel} → {selectedAssociation?.secondObjectLabel} relations
          </p>
        </div>
        <Button variant="outline" onClick={() => setCurrentStep("selectAssociation")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Change Association
        </Button>
      </div>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          Download the CSV template for {selectedAssociation?.firstObjectLabel} → {selectedAssociation?.secondObjectLabel} relations, fill it with your data, and upload it.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Template & Upload
          </CardTitle>
          <CardDescription>
            Download the relations template, fill it with your data, then upload
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={downloadTemplate}
              disabled={!selectedAssociation}
            >
              <Download className="h-4 w-4 mr-2" />
              Download {selectedAssociation?.firstObjectLabel}-{selectedAssociation?.secondObjectLabel} Template
            </Button>
            <div className="space-y-2">
              <FileUploadZone
                onFileSelect={handleRelationsFile}
                acceptedTypes=".csv,text/csv"
                maxSize={10 * 1024 * 1024} // 10MB
                selectedFile={relationsFile}
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

  const renderSuccess = () => {
    console.log('renderSuccess called, currentStep:', currentStep, 'result:', result);
    
    return (
      <div className="space-y-6">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">Relations Updated Successfully!</h3>
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
  };

  return (
    <div className="space-y-6">
      <StepIndicator 
        steps={["Select Object", "Select Association", "Upload", "Preview", "Importing", "Complete"]}
        currentStep={
          currentStep === "select" ? 0 : 
          currentStep === "selectAssociation" ? 1 : 
          currentStep === "upload" ? 2 : 
          currentStep === "preview" ? 3 : 
          currentStep === "importing" ? 4 : 5
        }
      />

      {currentStep === "select" && renderSelect()}
      {currentStep === "selectAssociation" && renderSelectAssociation()}
      {currentStep === "upload" && renderUpload()}
      {currentStep === "preview" && renderPreview()}
      {currentStep === "importing" && renderImporting()}
      {currentStep === "success" && renderSuccess()}
    </div>
  );
}