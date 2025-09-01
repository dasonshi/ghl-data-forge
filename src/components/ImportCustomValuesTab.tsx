import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUploadZone } from "@/components/FileUploadZone";
import { StepIndicator } from "@/components/StepIndicator";
import { SuccessStats } from "@/components/SuccessStats";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export const ImportCustomValuesTab = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState<'new' | 'update'>('new');
  const [customValues, setCustomValues] = useState<CustomValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const steps = [
    "Select Mode",
    "Download Template", 
    "Upload CSV",
    "Review Results"
  ];

  // Fetch existing custom values
  const fetchCustomValues = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/custom-values');
      if (!response.ok) {
        throw new Error('Failed to fetch custom values');
      }
      const data = await response.json();
      setCustomValues(data);
    } catch (error) {
      console.error('Error fetching custom values:', error);
      toast({
        title: "Error",
        description: "Failed to fetch existing custom values",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomValues();
  }, []);

  // Generate CSV template
  const generateTemplate = () => {
    let csvContent = '';
    
    if (mode === 'new') {
      csvContent = 'name,value\nSample Field,Sample Value\n';
    } else {
      // Include existing custom values for update template
      csvContent = 'id,name,value\n';
      if (customValues.length > 0) {
        customValues.forEach(cv => {
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
    
    setCurrentStep(3);
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setImporting(true);
    const formData = new FormData();
    formData.append('customValues', file);

    try {
      const response = await fetch('/api/custom-values/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setImportResult(result);
      
      if (result.success) {
        toast({
          title: "Import Successful",
          description: `${result.summary.created} created, ${result.summary.updated} updated`,
        });
        // Refresh the custom values list
        fetchCustomValues();
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `${result.summary.failed} failed out of ${result.summary.total}`,
          variant: "destructive",
        });
      }
      
      setCurrentStep(4);
    } catch (error) {
      console.error('Error importing custom values:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import custom values",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const resetProcess = () => {
    setCurrentStep(1);
    setImportResult(null);
    setMode('new');
  };

  return (
    <div className="space-y-6">
      <StepIndicator steps={steps} currentStep={currentStep - 1} />
      
      {/* Existing Custom Values Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Existing Custom Values</CardTitle>
              <CardDescription>
                Current custom values in your location
              </CardDescription>
            </div>
            <Button 
              onClick={fetchCustomValues} 
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
              Loading custom values...
            </div>
          ) : customValues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No custom values found
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {customValues.map((cv) => (
                <div key={cv.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <span className="font-medium">{cv.name}</span>
                    <span className="text-muted-foreground ml-2">: {cv.value}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {cv.id}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {currentStep === 1 && (
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
                onClick={() => {
                  setMode('new');
                  setCurrentStep(2);
                }}
                variant={mode === 'new' ? 'default' : 'outline'}
                className="h-24 flex flex-col gap-2"
              >
                <Upload className="h-6 w-6" />
                <span>Import New Custom Values</span>
                <span className="text-xs opacity-75">Create new custom values</span>
              </Button>
              
              <Button
                onClick={() => {
                  setMode('update');
                  setCurrentStep(2);
                }}
                variant={mode === 'update' ? 'default' : 'outline'}
                className="h-24 flex flex-col gap-2"
              >
                <RefreshCw className="h-6 w-6" />
                <span>Update Existing Values</span>
                <span className="text-xs opacity-75">Modify existing custom values</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Download CSV Template</CardTitle>
            <CardDescription>
              Download the {mode === 'new' ? 'new import' : 'update'} template and fill it with your data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">
                {mode === 'new' ? 'New Custom Values Template' : 'Update Custom Values Template'}
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                {mode === 'new' 
                  ? 'Template includes: name, value columns'
                  : 'Template includes existing custom values with: id, name, value columns'
                }
              </p>
              <Button onClick={generateTemplate} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download {mode === 'new' ? 'New Import' : 'Update'} Template
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Custom Values CSV</CardTitle>
            <CardDescription>
              Upload your completed CSV file to {mode === 'new' ? 'import new' : 'update existing'} custom values
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {importing ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Importing custom values...</p>
              </div>
            ) : (
              <FileUploadZone 
                onFileSelect={handleFileUpload} 
                acceptedTypes=".csv"
              />
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>
              Summary of your custom values import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SuccessStats 
              stats={{
                totalRecords: importResult.summary.total,
                successfulImports: importResult.summary.created + importResult.summary.updated,
                failedImports: importResult.summary.failed,
                duration: "N/A"
              }}
            />
            
            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-destructive">Errors:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="p-2 bg-destructive/10 rounded text-sm">
                      <span className="font-medium">{error.name}:</span> {error.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button onClick={resetProcess} className="w-full">
              Import More Custom Values
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
