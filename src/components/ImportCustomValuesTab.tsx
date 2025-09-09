import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUploadZone } from "@/components/FileUploadZone";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { StepIndicator } from "@/components/StepIndicator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, RefreshCw, Eye, CheckCircle2, AlertTriangle, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocationSwitch } from "@/hooks/useLocationSwitch";
import { apiFetch } from "@/lib/api";
import { useAppContext } from "@/hooks/useAppContext";
import Papa from "papaparse";

interface CustomValue {
  id: string;
  name: string;
  value: string;
  fieldKey?: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  created: CustomValue[];
  updated: CustomValue[];
  errors: any[];
  summary: {
    total: number;
    created: number;
    updated: number;
    failed: number;
  };
}

type ImportStep = "upload" | "preview" | "importing" | "success";

export function ImportCustomValuesTab() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [mode, setMode] = useState<'new' | 'update'>('new');
  const [customValues, setCustomValues] = useState<CustomValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [valuesFile, setValuesFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { location, refreshContext } = useAppContext();
  const { toast } = useToast();

  // Clear all data when location switches
  useLocationSwitch(async () => {
    console.log('🔄 ImportCustomValuesTab: Clearing data for location switch');
    setCurrentStep("upload");
    setMode('new');
    setCustomValues([]);
    setLoading(false);
    setImporting(false);
    setUploadedData([]);
    setValuesFile(null);
    setProgress(0);
    setImportResult(null);

    await refreshContext();
    await fetchCustomValues();
  });

  const fetchCustomValues = async () => {
    setLoading(true);
    try {
      console.log('🔍 ImportCustomValuesTab: fetchCustomValues with locationId:', location?.id ?? 'undefined');
      const response = await apiFetch('/api/custom-values', {}, location?.id ?? undefined);
      
      if (response.ok) {
        const data = await response.json();
        const customValuesList = data.customValues || data || [];
        setCustomValues(customValuesList);
        console.log('✅ ImportCustomValuesTab: Loaded', customValuesList.length, 'custom values');
      } else {
        setCustomValues([]);
      }
    } catch (error) {
      console.error('Failed to fetch custom values:', error);
      toast({
        title: "Error",
        description: "Failed to load custom values. Please try again.",
        variant: "destructive",
      });
      setCustomValues([]);
    } finally {
      setLoading(false);
    }
  };

  // Generate CSV template
  const generateTemplate = () => {
    let csvContent = '';
    
    if (mode === 'new') {
      csvContent = 'name,value\nSample Field,Sample Value\nAnother Field,Another Value\n';
    } else {
      // Include existing custom values for update template
      csvContent = 'id,name,value\n';
      if (customValues.length > 0) {
        customValues.slice(0, 3).forEach(cv => {
          csvContent += `${cv.id},"${cv.name}","${cv.value}"\n`;
        });
      } else {
        csvContent += 'sample_id,Sample Field,Sample Value\n';
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = mode === 'new' 
      ? 'custom-values-new-template.csv' 
      : 'custom-values-update-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: `${mode === 'new' ? 'New import' : 'Update'} template downloaded successfully.`,
    });
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
        setUploadedData(data);
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
    if (!valuesFile) return;

    setCurrentStep("importing");
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('customValues', valuesFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiFetch('/api/custom-values/import', {
        method: 'POST',
        body: formData,
      }, location?.id ?? undefined);

      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        const result = await response.json();
        setImportResult(result);
        setCurrentStep("success");
        toast({
          title: "Custom Values Imported",
          description: `${result.summary?.created || 0} created, ${result.summary?.updated || 0} updated`,
        });
        
        // Refresh the custom values list
        await fetchCustomValues();
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
    setCurrentStep("upload");
    setUploadedData([]);
    setValuesFile(null);
    setProgress(0);
    setImportResult(null);
  };

  useEffect(() => {
    fetchCustomValues();
  }, [location?.id]);

  const renderUpload = () => (
    <div className="space-y-6">
      {/* Existing Custom Values Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Existing Custom Values ({customValues.length})</CardTitle>
              <CardDescription>
                Current custom values in your location
              </CardDescription>
            </div>
            <Button 
              onClick={() => fetchCustomValues()} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
              Loading custom values...
            </div>
          ) : customValues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No custom values found</p>
              <p className="text-sm">Create custom values in HighLevel first, or import new ones below.</p>
            </div>
          ) : (
            <div className="rounded-md border max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="w-[100px]">ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customValues.map((cv) => (
                    <TableRow key={cv.id}>
                      <TableCell className="font-medium">{cv.name}</TableCell>
                      <TableCell className="max-w-xs truncate" title={cv.value}>
                        {cv.value}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {cv.id}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Import Mode</CardTitle>
          <CardDescription>
            Choose whether to import new custom values or update existing ones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              onClick={() => setMode('new')}
              variant={mode === 'new' ? 'default' : 'outline'}
              className="h-20 flex flex-col gap-2"
            >
              <Upload className="h-6 w-6" />
              <span>Import New Values</span>
              <span className="text-xs opacity-75">Create new custom values</span>
            </Button>
            
            <Button
              onClick={() => setMode('update')}
              variant={mode === 'update' ? 'default' : 'outline'}
              className="h-20 flex flex-col gap-2"
            >
              <RefreshCw className="h-6 w-6" />
              <span>Update Existing Values</span>
              <span className="text-xs opacity-75">Modify existing custom values</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Template Download and Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Template & Upload
          </CardTitle>
          <CardDescription>
            Download the {mode === 'new' ? 'new import' : 'update'} template, fill it with your data, then upload
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Button 
              onClick={generateTemplate} 
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download {mode === 'new' ? 'New Import' : 'Update'} Template
            </Button>
            <div className="space-y-2">
              <FileUploadZone 
                onFileSelect={handleValuesFile} 
                acceptedTypes=".csv"
                maxSize={10}
                selectedFile={valuesFile}
              />
              {mode === 'update' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Template includes existing values with IDs for updating
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">
          Preview {mode === 'new' ? 'New' : 'Update'} Custom Values
        </h3>
        <p className="text-sm text-muted-foreground">
          {uploadedData.length} value{uploadedData.length !== 1 ? 's' : ''} will be {mode === 'new' ? 'imported' : 'updated'}
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Review your data before importing. All CSV values will be {mode === 'new' ? 'created as new custom values' : 'used to update existing values'}.
        </AlertDescription>
      </Alert>

      <DataPreviewTable data={uploadedData} />

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("upload")}>
          Back
        </Button>
        <Button variant="gradient" onClick={handleImport}>
          {mode === 'new' ? 'Import New Values' : 'Update Values'}
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
          Please wait while we {mode === 'new' ? 'import your new custom values' : 'update your existing custom values'}
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
        <h3 className="text-2xl font-bold">Custom Values {mode === 'new' ? 'Imported' : 'Updated'} Successfully!</h3>
        <p className="text-muted-foreground">
          {importResult?.summary?.created || 0} created, {importResult?.summary?.updated || 0} updated
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Import Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Total Processed:</span>
            <span className="font-medium">{importResult?.summary?.total || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Created:</span>
            <span className="font-medium text-success">{importResult?.summary?.created || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Updated:</span>
            <span className="font-medium text-primary">{importResult?.summary?.updated || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Failed:</span>
            <span className="font-medium text-destructive">{importResult?.summary?.failed || 0}</span>
          </div>
        </CardContent>
      </Card>

      <Button variant="gradient" onClick={handleStartOver}>
        Import More Values
      </Button>
    </div>
  );

  const steps = ["Upload & Configure", "Preview Data", "Import Progress", "Review Results"];
  const stepMap = { upload: 0, preview: 1, importing: 2, success: 3 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Import Custom Values</h2>
        <p className="text-muted-foreground">
          View existing custom values and import new ones or update existing values
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
