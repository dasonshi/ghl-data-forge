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
import { triggerReviewRequestEvent } from "@/hooks/useReviewRequest";

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
  relationshipName?: string;
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
  success: boolean;
  message: string;
  created?: any[];
  skipped?: any[];
  errors?: any[];
}

export function UploadAssociationsTab() {
  const [currentStep, setCurrentStep] = useState<ImportStep>("selectAssociation");
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

  // Fetch ALL associations (including system associations like Contact-Business)
  const fetchAssociations = async () => {
    if (!location?.id) return;

    setAssociationsLoading(true);
    try {
      // Fetch all associations, not just for a specific object
      const response = await apiFetch('/api/associations', {}, location.id);
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

  // Fetch objects and associations when component mounts
  useEffect(() => {
    if (location?.id) {
      fetchObjects();
      fetchAssociations(); // Fetch ALL associations on mount
    }
  }, [location?.id]);

  // Clear all data when location switches
  useLocationSwitch(async () => {
    console.log('🔄 UploadAssociationsTab: Clearing data for location switch');
    setCurrentStep("selectAssociation");
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
    await fetchAssociations();
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
        // Check for field mismatch errors (rows with wrong number of columns)
        const fieldMismatchErrors = results.errors.filter(
          (err: any) => err.type === 'FieldMismatch'
        );

        if (fieldMismatchErrors.length > 0) {
          console.log('CSV Field Mismatch Errors:', fieldMismatchErrors);
          const affectedRows = fieldMismatchErrors.map((err: any) => err.row).slice(0, 10);
          const moreCount = fieldMismatchErrors.length > 10 ? ` and ${fieldMismatchErrors.length - 10} more` : '';

          toast({
            title: "CSV Format Error",
            description: `Your CSV has rows with inconsistent column counts. Affected rows: ${affectedRows.join(', ')}${moreCount}. Please wrap text fields containing commas in double quotes and re-upload.`,
            variant: "destructive",
          });
          setRelationsFile(null);
          return;
        }

        // Check for other critical parse errors
        const criticalErrors = results.errors.filter(
          (err: any) => err.type !== 'FieldMismatch'
        );

        if (criticalErrors.length > 0) {
          toast({
            title: "CSV Parse Error",
            description: "There was an error parsing your CSV file. Please check the format.",
            variant: "destructive",
          });
          setRelationsFile(null);
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
        setRelationsFile(null);
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
      formData.append('associationId', selectedAssociation?.id || '');

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

        const createdCount = Array.isArray(result.created) ? result.created.length : 0;
        const skippedCount = Array.isArray(result.skipped) ? result.skipped.length : 0;
        const errorCount = Array.isArray(result.errors) ? result.errors.length : 0;
        const hasSuccesses = createdCount > 0 || skippedCount > 0;

        if (errorCount > 0 && !hasSuccesses) {
          toast({
            title: "Relations Import Failed",
            description: `${errorCount} relation${errorCount !== 1 ? "s" : ""} failed to import. Review the errors below.`,
            variant: "destructive",
          });
        } else if (errorCount > 0) {
          toast({
            title: "Relations Import Completed with Errors",
            description: `${createdCount} created, ${skippedCount} skipped, ${errorCount} failed.`,
          });
        } else {
          toast({
            title: "Relations Updated",
            description: "Your record relations have been updated successfully.",
          });
        }

        // Trigger review request if there were any successes
        if (hasSuccesses) {
          triggerReviewRequestEvent();
        }
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
    setCurrentStep("selectAssociation");
    setSelectedObject("");
    setSelectedAssociation(null);
    setRelationsFile(null);
    setRelationsData([]);
    setProgress(0);
    setResult(null);
    // Re-fetch associations in case they changed
    fetchAssociations();
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
      <div>
        <h2 className="text-2xl font-bold">Select Association</h2>
        <p className="text-muted-foreground">
          Choose which association type to import relations for (includes Contact-Business)
        </p>
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
                      <span className="font-medium">
                        {association.firstObjectLabel} → {association.secondObjectLabel}
                      </span>
                      {association.relationshipName && association.relationshipName !== 'System' && (
                        <span className="text-xs text-muted-foreground">
                          {association.relationshipName}
                        </span>
                      )}
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
    const createdCount = Array.isArray(result?.created) ? result.created.length : 0;
    const skippedCount = Array.isArray(result?.skipped) ? result.skipped.length : 0;
    const errorCount = Array.isArray(result?.errors) ? result.errors.length : 0;
    const hasErrors = errorCount > 0;
    const hasSuccesses = createdCount > 0 || skippedCount > 0;
    const importFailed = hasErrors && !hasSuccesses;
    const importPartial = hasErrors && hasSuccesses;
    
    return (
      <div className="space-y-6">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
              importFailed
                ? "bg-red-100"
                : importPartial
                  ? "bg-yellow-100"
                  : "bg-green-100"
            }`}>
              {importFailed || importPartial ? (
                <AlertTriangle className={`h-8 w-8 ${importFailed ? "text-red-600" : "text-yellow-600"}`} />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              {importFailed
                ? "Relations Import Failed"
                : importPartial
                  ? "Relations Import Completed with Errors"
                  : "Relations Updated Successfully!"}
            </h3>
            <p className="text-muted-foreground">
              {importFailed
                ? "None of the relations were imported. Review the errors below."
                : importPartial
                  ? "Some relations were imported, but some failed. Review the details below."
                  : "Your record relations have been processed successfully."}
            </p>
          </div>

          {result && (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>Import Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-semibold">{result.message}</span>
                </div>
                {result.created && (
                  <div className="flex justify-between">
                    <span className="text-green-600">Created:</span>
                    <span className="font-semibold text-green-600">{Array.isArray(result.created) ? result.created.length : 0}</span>
                  </div>
                )}
                {result.skipped && (
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Skipped:</span>
                    <span className="font-semibold text-yellow-600">{Array.isArray(result.skipped) ? result.skipped.length : 0}</span>
                  </div>
                )}
                {result.errors && (
                  <div className="flex justify-between">
                    <span className="text-red-600">Errors:</span>
                    <span className="font-semibold text-red-600">{Array.isArray(result.errors) ? result.errors.length : 0}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Detailed Results */}
          {result && (result.created || result.skipped || result.errors) && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* Created Relations */}
              {result.created && result.created.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      Created Relations ({result.created.length})
                    </CardTitle>
                    <CardDescription>Relations that were successfully created</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {result.created.map((relation: any, index: number) => (
                        <div key={index} className="text-sm bg-green-50 border border-green-200 rounded p-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-green-800">
                              {relation.fromId && relation.toId 
                                ? `${relation.fromId} → ${relation.toId}`
                                : `Relation ${index + 1}`
                              }
                            </span>
                            <span className="text-green-600 text-xs">Created</span>
                          </div>
                          {relation.details && (
                            <p className="text-green-700 text-xs mt-1">{relation.details}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Skipped Relations */}
              {result.skipped && result.skipped.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-600">
                      <AlertTriangle className="h-5 w-5" />
                      Skipped Relations ({result.skipped.length})
                    </CardTitle>
                    <CardDescription>Relations that were skipped during the import</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {result.skipped.map((relation: any, index: number) => (
                        <div key={index} className="text-sm bg-yellow-50 border border-yellow-200 rounded p-3">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-medium text-yellow-800">
                              {relation.fromId && relation.toId 
                                ? `${relation.fromId} → ${relation.toId}`
                                : `Relation ${index + 1}`
                              }
                            </span>
                            <span className="text-yellow-600 text-xs">Skipped</span>
                          </div>
                          {relation.reason && (
                            <p className="text-yellow-700 text-xs mt-1">{relation.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Failed Relations */}
              {result.errors && result.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Failed Relations ({result.errors.length})
                    </CardTitle>
                    <CardDescription>Relations that failed to import</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {result.errors.map((error: any, index: number) => (
                        <div key={index} className="text-sm bg-red-50 border border-red-200 rounded p-3">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-medium text-red-800">
                              Row {error.recordIndex !== undefined ? error.recordIndex + 2 : index + 2}: {error.name || (error.fromId && error.toId ? `${error.fromId} → ${error.toId}` : 'Unknown')}
                            </span>
                            <span className="text-red-600 text-xs font-medium px-2 py-0.5 bg-red-100 rounded">
                              {error.errorCode || 'Failed'}
                            </span>
                          </div>
                          <p className="text-red-700 text-xs mt-1">{error.error || error.message}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
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
        steps={["Select Association", "Upload", "Preview", "Importing", "Complete"]}
        currentStep={
          currentStep === "selectAssociation" ? 0 :
          currentStep === "upload" ? 1 :
          currentStep === "preview" ? 2 :
          currentStep === "importing" ? 3 : 4
        }
      />

      {currentStep === "selectAssociation" && renderSelectAssociation()}
      {currentStep === "upload" && renderUpload()}
      {currentStep === "preview" && renderPreview()}
      {currentStep === "importing" && renderImporting()}
      {currentStep === "success" && renderSuccess()}
    </div>
  );
}
