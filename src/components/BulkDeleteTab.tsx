import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadZone } from "@/components/FileUploadZone";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { StepIndicator } from "@/components/StepIndicator";
import { Trash2, AlertTriangle, CheckCircle2, ArrowLeft, AlertCircle } from "lucide-react";
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

type DeleteStep = "select" | "upload" | "mapping" | "preview" | "deleting" | "success";

interface DeleteResult {
  success: boolean;
  message: string;
  objectKey: string;
  deleted: Array<{ id: string; action: string; rowIndex: number }>;
  notFound: Array<{ id: string; rowIndex: number; reason: string }>;
  errors: Array<{ recordIndex: number; id: string; error: string; errorCode?: string; statusCode?: number }>;
  summary: {
    total: number;
    deleted: number;
    notFound: number;
    failed: number;
  };
}

const ID_COLUMN_CANDIDATES = ['id', 'record_id', 'recordid', 'record id', '_id'];

export function BulkDeleteTab() {
  const [currentStep, setCurrentStep] = useState<DeleteStep>("select");

  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");

  const [recordsFile, setRecordsFile] = useState<File | null>(null);
  const [recordsData, setRecordsData] = useState<Record<string, string>[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [selectedIdColumn, setSelectedIdColumn] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<DeleteResult | null>(null);

  const { location, refreshContext } = useAppContext();
  const { toast } = useToast();

  // Clear all data when location switches
  useLocationSwitch(async () => {
    setCurrentStep("select");
    setObjects([]);
    setSelectedObject("");
    setRecordsFile(null);
    setRecordsData([]);
    setCsvColumns([]);
    setSelectedIdColumn("");
    setProgress(0);
    setResult(null);
    await refreshContext();
    await fetchObjects();
  });

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

  // Load objects on mount
  useEffect(() => {
    fetchObjects();
  }, []);

  const handleObjectSelect = (objectKey: string) => {
    setSelectedObject(objectKey);
  };

  const handleContinueToUpload = () => {
    setCurrentStep("upload");
  };

  const selectedObjectData = objects.find(o => o.key === selectedObject);

  const handleFileSelect = (file: File) => {
    setRecordsFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          const criticalErrors = results.errors.filter(e => e.type === 'FieldMismatch' || e.type === 'Quotes');
          if (criticalErrors.length > 0) {
            toast({
              title: "CSV Parse Error",
              description: criticalErrors[0].message,
              variant: "destructive",
            });
            return;
          }
        }

        const data = results.data as Record<string, string>[];

        if (data.length === 0) {
          toast({
            title: "Empty File",
            description: "The CSV file appears to be empty.",
            variant: "destructive",
          });
          return;
        }

        // Filter out empty column names (from trailing commas)
        const columns = Object.keys(data[0]).filter(col => col.trim() !== '');

        setRecordsData(data);
        setCsvColumns(columns);

        // Auto-detect ID column
        let detectedIdColumn = "";
        for (const candidate of ID_COLUMN_CANDIDATES) {
          if (columns.some(col => col.toLowerCase() === candidate)) {
            detectedIdColumn = columns.find(col => col.toLowerCase() === candidate) || "";
            break;
          }
        }

        // If only one column, use it as the ID column
        if (!detectedIdColumn && columns.length === 1) {
          detectedIdColumn = columns[0];
        }

        setSelectedIdColumn(detectedIdColumn);

        // If auto-detected or single column, skip mapping step
        if (detectedIdColumn) {
          setCurrentStep("preview");
        } else {
          setCurrentStep("mapping");
        }
      },
      error: (error) => {
        toast({
          title: "Error",
          description: `Failed to parse CSV: ${error.message}`,
          variant: "destructive",
        });
      }
    });
  };

  const handleContinueToPreview = () => {
    if (!selectedIdColumn) {
      toast({
        title: "No ID Column Selected",
        description: "Please select which column contains the record IDs.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep("preview");
  };

  const getRecordIds = () => {
    return recordsData
      .map(row => String(row[selectedIdColumn] || '').trim())
      .filter(id => id !== '');
  };

  const handleDelete = async () => {
    if (!recordsFile || !selectedObject) return;

    setCurrentStep("deleting");
    setProgress(0);

    try {
      // Create a new CSV with just the ID column renamed to 'id'
      const idsOnly = recordsData.map(row => ({
        id: String(row[selectedIdColumn] || '').trim()
      })).filter(row => row.id !== '');

      const csvContent = Papa.unparse(idsOnly);
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });

      const formData = new FormData();
      formData.append('records', csvBlob, 'delete-records.csv');

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 90));
      }, 500);

      // Strip custom_objects. prefix if present (Express doesn't match dots in path params)
      const cleanObjectKey = selectedObject.replace(/^custom_objects\./, '');

      const response = await apiFetch(`/api/objects/${cleanObjectKey}/records/delete`, {
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
          title: "Deletion Complete",
          description: `Successfully deleted ${result.summary?.deleted || 0} records.`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Delete Failed",
          description: errorData.message || "Failed to delete records.",
          variant: "destructive",
        });
        setCurrentStep("preview");
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "An error occurred while deleting records.",
        variant: "destructive",
      });
      setCurrentStep("preview");
    }
  };

  const handleStartOver = () => {
    setCurrentStep("select");
    setSelectedObject("");
    setRecordsFile(null);
    setRecordsData([]);
    setCsvColumns([]);
    setSelectedIdColumn("");
    setProgress(0);
    setResult(null);
  };

  const steps = [
    { id: "select", label: "Choose Object" },
    { id: "upload", label: "Upload CSV" },
    ...(csvColumns.length > 1 && !ID_COLUMN_CANDIDATES.some(c => csvColumns.map(col => col.toLowerCase()).includes(c))
      ? [{ id: "mapping", label: "Select ID Column" }]
      : []),
    { id: "preview", label: "Confirm Delete" },
    { id: "deleting", label: "Deleting" },
    { id: "success", label: "Complete" }
  ];

  const renderSelect = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Custom Object</CardTitle>
          <CardDescription>
            Choose which custom object you want to delete records from.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedObject} onValueChange={handleObjectSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select a custom object" />
            </SelectTrigger>
            <SelectContent>
              {objects
                .filter((obj) => !['contact', 'opportunity', 'business'].includes(obj.key))
                .map((object) => (
                  <SelectItem key={object.id} value={object.key}>
                    {object.labels.singular} ({object.key})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {objects.filter((obj) => !['contact', 'opportunity', 'business'].includes(obj.key)).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No custom objects found.
            </p>
          )}

          {selectedObject && (
            <Button
              onClick={handleContinueToUpload}
              className="w-full"
              variant="gradient"
            >
              Continue
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderUpload = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Delete Records from: {selectedObjectData?.labels.singular}
          </h3>
          <p className="text-sm text-muted-foreground">
            Upload a CSV file containing the record IDs to delete
          </p>
        </div>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Warning:</strong> Deleted records cannot be recovered. Make sure you have a backup if needed.
        </AlertDescription>
      </Alert>

      <FileUploadZone
        onFileSelect={handleFileSelect}
        acceptedTypes=".csv"
        description="CSV with record IDs (column named 'id' or similar)"
      />

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("select")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    </div>
  );

  const renderMapping = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Select ID Column</h3>
          <p className="text-sm text-muted-foreground">
            Choose which column contains the record IDs to delete
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={selectedIdColumn} onValueChange={setSelectedIdColumn}>
            <SelectTrigger>
              <SelectValue placeholder="Select the ID column" />
            </SelectTrigger>
            <SelectContent>
              {csvColumns.map((column) => (
                <SelectItem key={column} value={column}>
                  {column}
                  {recordsData[0] && (
                    <span className="text-muted-foreground ml-2">
                      (e.g., {String(recordsData[0][column] || '').substring(0, 30)})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep("upload")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button variant="gradient" onClick={handleContinueToPreview} disabled={!selectedIdColumn}>
          Continue to Preview
        </Button>
      </div>
    </div>
  );

  const renderPreview = () => {
    const recordIds = getRecordIds();

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              Confirm Deletion: {selectedObjectData?.labels.singular}
            </h3>
            <p className="text-sm text-muted-foreground">
              Review the records that will be permanently deleted
            </p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>This action cannot be undone!</strong> You are about to permanently delete {recordIds.length} record{recordIds.length !== 1 ? 's' : ''}.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Records to Delete ({recordIds.length})</CardTitle>
            <CardDescription>
              Using column "{selectedIdColumn}" as record ID
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Row</th>
                    <th className="text-left p-2 font-medium">Record ID</th>
                  </tr>
                </thead>
                <tbody>
                  {recordIds.slice(0, 100).map((id, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2 text-muted-foreground">{index + 2}</td>
                      <td className="p-2 font-mono text-xs">{id}</td>
                    </tr>
                  ))}
                  {recordIds.length > 100 && (
                    <tr className="border-t">
                      <td colSpan={2} className="p-2 text-center text-muted-foreground">
                        ... and {recordIds.length - 100} more records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(csvColumns.length > 1 ? "mapping" : "upload")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete {recordIds.length} Records
          </Button>
        </div>
      </div>
    );
  };

  const renderDeleting = () => (
    <div className="space-y-6 text-center">
      <div className="space-y-4">
        <Trash2 className="h-16 w-16 mx-auto text-destructive animate-pulse" />
        <h3 className="text-xl font-semibold">Deleting Records...</h3>
        <p className="text-muted-foreground">
          Please wait while we delete records from {selectedObjectData?.labels.singular}
        </p>
      </div>

      <div className="space-y-2 max-w-md mx-auto">
        <Progress value={progress} />
        <p className="text-sm text-muted-foreground">{progress}% complete</p>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-6">
      {result && (
        <>
          <div className="text-center space-y-4">
            {result.summary.failed === 0 ? (
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
            ) : (
              <AlertCircle className="h-16 w-16 mx-auto text-amber-500" />
            )}
            <h3 className="text-xl font-semibold">
              {result.summary.failed === 0 ? "Deletion Complete" : "Deletion Completed with Errors"}
            </h3>
            <p className="text-muted-foreground">{result.message}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{result.summary.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">{result.summary.deleted}</p>
                  <p className="text-sm text-muted-foreground">Deleted</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-500">{result.summary.notFound}</p>
                  <p className="text-sm text-muted-foreground">Not Found</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{result.summary.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {result.notFound && result.notFound.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-amber-600">Records Not Found ({result.notFound.length})</CardTitle>
                <CardDescription>These record IDs did not exist in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[200px] overflow-auto">
                  <div className="flex flex-wrap gap-2">
                    {result.notFound.slice(0, 50).map((item, index) => (
                      <span key={index} className="text-xs font-mono bg-amber-50 text-amber-700 px-2 py-1 rounded">
                        {item.id}
                      </span>
                    ))}
                    {result.notFound.length > 50 && (
                      <span className="text-xs text-muted-foreground">
                        +{result.notFound.length - 50} more
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {result.errors && result.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Failed Deletions ({result.errors.length})</CardTitle>
                <CardDescription>These records could not be deleted</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[200px] overflow-auto">
                  {result.errors.slice(0, 20).map((error, index) => (
                    <div key={index} className="text-sm p-2 bg-red-50 rounded">
                      <span className="font-mono">{error.id}</span>
                      <span className="text-red-600 ml-2">- {error.error}</span>
                    </div>
                  ))}
                  {result.errors.length > 20 && (
                    <p className="text-sm text-muted-foreground">
                      +{result.errors.length - 20} more errors
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center">
            <Button onClick={handleStartOver} variant="gradient">
              Delete More Records
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "select": return renderSelect();
      case "upload": return renderUpload();
      case "mapping": return renderMapping();
      case "preview": return renderPreview();
      case "deleting": return renderDeleting();
      case "success": return renderSuccess();
      default: return renderSelect();
    }
  };

  // Convert steps to string array and find current index for StepIndicator
  const stepLabels = steps.map(s => s.label);
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="space-y-8">
      <StepIndicator
        steps={stepLabels}
        currentStep={currentStepIndex >= 0 ? currentStepIndex : 0}
      />
      {renderCurrentStep()}
    </div>
  );
}
