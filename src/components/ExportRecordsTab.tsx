import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Download, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocationSwitch } from "@/hooks/useLocationSwitch";
import { apiFetch } from '@/lib/api';
import { useAppContext } from '@/hooks/useAppContext';

interface CustomObject {
  id: string;
  key: string;
  labels: {
    singular: string;
    plural: string;
  };
}

export function ExportRecordsTab() {
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const { location, refreshContext } = useAppContext();
  const { toast } = useToast();

  // Clear all data when location switches
  useLocationSwitch(async () => {
    console.log('🔄 ExportRecordsTab: Clearing data for location switch');
    setObjects([]);
    setSelectedObject("");
    setIsExporting(false);

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

  const handleExport = async () => {
    if (!selectedObject) {
      toast({
        title: "No Object Selected",
        description: "Please select a custom object first.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      // Placeholder API call - this endpoint is being built
      const response = await apiFetch(`/api/objects/${selectedObject}/records/export`, {
        method: 'GET',
      }, location?.id ?? undefined);

      if (response.ok) {
        const csvText = await response.text();
        
        // Create and download the file
        const blob = new Blob([csvText], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedObject}-records-export.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Export Successful",
          description: `Records exported successfully for ${selectedObjectData?.labels.singular}.`,
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "This feature is currently being built. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    fetchObjects();
  }, [location?.id]);

  const selectedObjectData = objects.find(obj => obj.key === selectedObject);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Export Records</h2>
        <p className="text-muted-foreground">
          Export records from custom objects to CSV format
        </p>
      </div>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          Select a custom object to export all its records to a CSV file.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Select Custom Object</CardTitle>
          <CardDescription>
            Choose the custom object you want to export records from
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedObject} onValueChange={setSelectedObject}>
            <SelectTrigger>
              <SelectValue placeholder="Select a custom object" />
            </SelectTrigger>
            <SelectContent>
              {objects.map((object) => (
                <SelectItem key={object.id} value={object.key}>
                  {object.labels.singular} ({object.key})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {objects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No custom objects found. Create custom objects first before exporting records.
            </p>
          )}

          {selectedObject && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This will export all records from {selectedObjectData?.labels.singular} including all custom fields.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleExport}
                disabled={isExporting}
                className="w-full"
                variant="gradient"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : `Export ${selectedObjectData?.labels.singular} Records`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}