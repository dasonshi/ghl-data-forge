import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone } from "@/components/FileUploadZone";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { StepIndicator } from "@/components/StepIndicator";
import { CheckCircle2, AlertTriangle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocationSwitch } from "@/hooks/useLocationSwitch";
import { apiFetch } from "@/lib/api";
import { useLocationId } from "@/hooks/useLocationId";
import Papa from "papaparse";

interface CustomField {
  id: string;
  fieldKey: string;
  name: string;
  dataType: string;
  picklistValues?: Array<{ value: string; label: string }>;
}

type ImportStep = "select" | "upload" | "preview" | "importing" | "success";

interface ImportResult {
  ok: boolean;
  message: string;
  stats: {
    valuesProcessed: number;
  };
}

export function ImportCustomValuesTab() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("select");
  const [selectedField, setSelectedField] = useState("");
  const [fieldsData, setFieldsData] = useState<CustomField[]>([]);
  const [valuesFile, setValuesFile] = useState<File | null>(null);
  const [valuesData, setValuesData] = useState<Record<string, string>[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { locationId, refresh } = useLocationId();
  const { toast } = useToast();

  // Clear all data when location switches
  useLocationSwitch(async () => {
    console.log('🔄 ImportCustomValuesTab: Clearing data for location switch');
    setCurrentStep("select");
    setSelectedField("");
    setFieldsData([]);
    setValuesFile(null);
    setValuesData([]);
    setProgress(0);
    setResult(null);
    
    const id = await refresh();
    await fetchPicklistFields(id || undefined);
  });

  const fetchPicklistFields = async (locId?: string) => {
    try {
      // Fetch all fields and filter for picklist fields
      const response = await apiFetch('/api/fields', {}, locId ?? locationId ?? undefined);
      
      if (response.ok) {
        const data = await response.json();
        const allFields = data.fields || [];
        
        // Filter for picklist fields only
        const picklistFields = allFields.filter((field: CustomField) => 
          field.dataType === 'PICKLIST'
        );
        
        setFieldsData(picklistFields);
      }
    } catch (error) {
      console.error('Failed to fetch picklist fields:', error);
      toast({
        title: "Error",
        description: "Failed to load picklist fields. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFieldSelect = (fieldId: string) => {
    setSelectedField(fieldId);
  };

  const handleContinueToUpload = () => {
    if (selectedField) {
      setCurrentStep("upload");
    }
  };

  const handleValuesFile = (file: File) => {
    setValuesFile(file);
    
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
        setValuesData(data);
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
    if (!valuesFile || !selectedField) return;

    setCurrentStep("importing");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('values', valuesFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiFetch(`/api/fields/${selectedField}/values/import`, {
        method: 'POST',
        body: formData,
      }, locationId ?? undefined);

      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        const result = await response.json();
        setResult(result);
        setCurrentStep("success");
        toast({
          title: "Custom Values Imported",
          description: "Your custom values have been imported successfully.",
        });
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to import custom values. Please try again.",
        variant: "destructive",
      });
      setCurrentStep("preview");
    }
  };

  const handleStartOver = () => {
    setCurrentStep("select");
    setSelectedField("");
    setValuesFile(null);
    setValuesData([]);
    setProgress(0);
    setResult(null);
  };

  useEffect(() => {
    (async () => {
      const id = await refresh();
      await fetchPicklistFields(id || undefined);
    })();
  }, []);

  const selectedFieldData = fieldsData.find(field => field.id === selectedField);

  const renderSelect = () => (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Select a picklist field to import custom values into it.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Select Picklist Field</CardTitle>
          <CardDescription>
            Choose the picklist field you want to import values into
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedField} onValueChange={handleFieldSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select a picklist field" />
            </SelectTrigger>
            <SelectContent>
              {fieldsData.map((field) => (
                <SelectItem key={field.id} value={field.id}>
                  {field.name} ({field.fieldKey})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {fieldsData.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No picklist fields found. Create picklist fields first before importing values.
            </p>
          )}

          {selectedField && (
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
      <div>
        <h3 className="text-lg font-semibold">
          Import Values for: {selectedFieldData?.name}
        </h3>
        <p className="text-sm text-muted-foreground">Field Key: {selectedFieldData?.fieldKey}</p>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">Upload Values CSV</h3>
        <FileUploadZone
          onFileSelect={handleValuesFile}
          acceptedTypes=".csv"
          maxSize={10}
          selectedFile={valuesFile}
        />
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">
          Preview Values for: {selectedFieldData?.name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {valuesData.length} value{valuesData.length !== 1 ? 's' : ''} will be imported
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Review your data before importing. All CSV values will be added to the picklist.
        </AlertDescription>
      </Alert>

      <DataPreviewTable data={valuesData} />

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("upload")}>
          Back
        </Button>
        <Button variant="gradient" onClick={handleImport}>
          Import Custom Values
        </Button>
      </div>
    </div>
  );

  const renderImporting = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <Upload className="h-16 w-16 mx-auto text-primary animate-pulse" />
        <h3 className="text-xl font-semibold">Importing Custom Values...</h3>
        <p className="text-muted-foreground">
          Please wait while we import values for {selectedFieldData?.name}
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
        <h3 className="text-2xl font-bold">Custom Values Imported Successfully!</h3>
        <p className="text-muted-foreground">
          {result?.stats?.valuesProcessed || valuesData.length} value{(result?.stats?.valuesProcessed || valuesData.length) !== 1 ? 's' : ''} imported to {selectedFieldData?.name}
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Import Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Field:</span>
            <span className="font-medium">{selectedFieldData?.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Values Imported:</span>
            <span className="font-medium">{result?.stats?.valuesProcessed || valuesData.length}</span>
          </div>
        </CardContent>
      </Card>

      <Button variant="gradient" onClick={handleStartOver}>
        Import More Values
      </Button>
    </div>
  );

  const steps = ["Choose Field", "Upload Data", "Preview Values", "Import Progress", "Review Results"];
  const stepMap = { select: 0, upload: 1, preview: 2, importing: 3, success: 4 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Import Custom Values</h2>
        <p className="text-muted-foreground">
          Import custom values into picklist fields
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