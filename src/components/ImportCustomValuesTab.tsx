import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUploadZone } from "@/components/FileUploadZone";
import { StepIndicator } from "@/components/StepIndicator";
import { SuccessStats } from "@/components/SuccessStats";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, RefreshCw, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

export const ImportCustomValuesTab = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState<'new' | 'update'>('new');
  const [customValues, setCustomValues] = useState<CustomValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const steps = [
    "Select Mode",
    "Download & Upload", 
    "Review Results"
  ];

  // Fetch existing custom values
  const fetchCustomValues = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://importer.savvysales.ai/api/custom-values', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch custom values');
      }
      const data = await response.json();
      setCustomValues(data.customValues || []);
      toast({
        title: "Success",
        description: `Loaded ${data.customValues?.length || 0} existing custom values`,
      });
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
      csvContent = 'name,value,parentid\nSample Field,Sample Value,sample_parent_id\n';
    } else {
      // Include existing custom values for update template
      csvContent = 'id,name,value,parentid\n';
      if (customValues.length > 0) {
        customValues.forEach(cv => {
          csvContent += `${cv.id},"${cv.name}","${cv.value}",${cv.fieldKey || ''}\n`;
        });
      } else {
        csvContent += 'sample_id,Sample Field,Sample Value,sample_parent_id\n';
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
    
    // Don't auto-advance step - user can download and upload on same step
  };

  // Handle file upload and parse CSV
  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text();
      const result = Papa.parse(text, { 
        header: true, 
        skipEmptyLines: true 
      });
      
      if (result.errors.length > 0) {
        toast({
          title: "CSV Parse Error",
          description: "There were errors parsing your CSV file",
          variant: "destructive",
        });
        console.error('CSV parse errors:', result.errors);
        return;
      }

      setUploadedData(result.data);
      setShowPreview(true);
      
      toast({
        title: "File Uploaded",
        description: `Parsed ${result.data.length} rows. Please review and confirm import.`,
      });
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "File Error",
        description: "Failed to read the uploaded file",
        variant: "destructive",
      });
    }
  };

  // Confirm and execute import
  const confirmImport = async () => {
    setImporting(true);
    const formData = new FormData();
    
    // Convert uploaded data back to CSV for server
    const csvContent = Papa.unparse(uploadedData);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    formData.append('customValues', blob, 'import.csv');

    try {
      const response = await fetch('https://importer.savvysales.ai/api/custom-values/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
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
      
      setCurrentStep(3);
      setShowPreview(false);
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

  const cancelPreview = () => {
    setShowPreview(false);
    setUploadedData([]);
  };

  const resetProcess = () => {
    setCurrentStep(1);
    setImportResult(null);
    setUploadedData([]);
    setShowPreview(false);
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
            <div className="rounded-md border max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key Name</TableHead>
                    <TableHead>Current Value</TableHead>
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
        <div className="grid gap-6 md:grid-cols-2">
          {/* Download Template Section */}
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
                    ? 'Template includes: name, value, parentid columns'
                    : 'Template includes existing custom values with: id, name, value, parentid columns'
                  }
                </p>
                <Button onClick={generateTemplate} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download {mode === 'new' ? 'New Import' : 'Update'} Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upload CSV Section */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Custom Values CSV</CardTitle>
              <CardDescription>
                Upload your completed CSV file to {mode === 'new' ? 'import new' : 'update existing'} custom values
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showPreview ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">Preview Upload Data</h4>
                    </div>
                    <p className="text-sm text-blue-700 mb-4">
                      {uploadedData.length} rows ready to import. Please review and confirm.
                    </p>
                    
                    <div className="rounded-md border max-h-60 overflow-y-auto bg-white">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Parent ID</TableHead>
                            {mode === 'update' && <TableHead>ID</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uploadedData.map((row: any, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{row.name}</TableCell>
                              <TableCell className="max-w-xs truncate" title={row.value}>
                                {row.value}
                              </TableCell>
                              <TableCell>{row.parentid || '-'}</TableCell>
                              {mode === 'update' && <TableCell>{row.id}</TableCell>}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button onClick={confirmImport} disabled={importing} className="flex-1">
                        {importing ? "Importing..." : "Confirm Import"}
                      </Button>
                      <Button onClick={cancelPreview} variant="outline" disabled={importing}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : importing ? (
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Back button */}
      {currentStep === 2 && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentStep(1)}>
            Back
          </Button>
        </div>
      )}

      {currentStep === 3 && importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
            <CardDescription>
              Summary of your custom values import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">Server Response</h4>
              <div className="text-sm space-y-2">
                <div><span className="font-medium">Status:</span> {importResult.success ? 'Success' : 'Failed'}</div>
                <div><span className="font-medium">Message:</span> {importResult.message}</div>
                
                {importResult.summary && (
                  <div className="mt-3">
                    <div className="font-medium mb-1">Summary:</div>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                      <li>Total processed: {importResult.summary.total}</li>
                      <li>Created: {importResult.summary.created}</li>
                      <li>Updated: {importResult.summary.updated}</li>
                      <li>Failed: {importResult.summary.failed}</li>
                    </ul>
                  </div>
                )}
                
                {importResult.created?.length > 0 && (
                  <div className="mt-3">
                    <div className="font-medium mb-1">Created Items:</div>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                      {importResult.created.map((item, idx) => (
                        <li key={idx}>{item.name}: {item.value}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {importResult.updated?.length > 0 && (
                  <div className="mt-3">
                    <div className="font-medium mb-1">Updated Items:</div>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                      {importResult.updated.map((item, idx) => (
                        <li key={idx}>{item.name}: {item.value}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            
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
