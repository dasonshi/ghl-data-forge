import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database } from "lucide-react";
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

export function UploadAssociationsTab() {
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [associations, setAssociations] = useState<Association[]>([]);
  const { location, refreshContext } = useAppContext();
  const { toast } = useToast();

  // Clear all data when location switches
  useLocationSwitch(async () => {
    console.log('🔄 UploadAssociationsTab: Clearing data for location switch');
    setObjects([]);
    setSelectedObject("");
    setAssociations([]);
    
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

  const fetchAssociations = async (objectKey: string) => {
    try {
      console.log('🔍 Fetching associations for object:', objectKey);
      const res = await apiFetch(`/api/objects/${objectKey}/associations`, {}, location?.id ?? undefined);
      if (res.ok) {
        const data = await res.json();
        console.log('📊 Associations response:', data);
        // Map the API response to our interface structure
        const mappedAssociations = (data.associations || []).map((assoc: any) => ({
          id: assoc.id,
          key: assoc.key,
          description: assoc.description,
          relationTo: assoc.relationTo,
          isFirst: assoc.isFirst,
          firstObjectLabel: assoc.firstObjectLabel || assoc.firstObject?.label,
          firstObjectKey: assoc.firstObjectKey || assoc.firstObject?.key,
          secondObjectLabel: assoc.secondObjectLabel || assoc.secondObject?.label,
          secondObjectKey: assoc.secondObjectKey || assoc.secondObject?.key,
          associationType: assoc.associationType || assoc.type
        }));
        console.log('🗂️ Mapped associations:', mappedAssociations);
        setAssociations(mappedAssociations);
      } else {
        console.log('❌ Failed to fetch associations, status:', res.status);
        setAssociations([]);
      }
    } catch (error) {
      console.error('💥 Error fetching associations:', error);
      setAssociations([]);
    }
  };

  const handleObjectSelect = (objectKey: string) => {
    setSelectedObject(objectKey);
    fetchAssociations(objectKey);
  };

  useEffect(() => {
    fetchObjects();
  }, [location?.id]);

  const selectedObjectData = objects.find(obj => obj.key === selectedObject);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Upload Associations</h2>
        <p className="text-muted-foreground">
          View and manage associations between custom objects
        </p>
      </div>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          Select a custom object to view its available associations. Associations define relationships between different custom objects.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Select Custom Object</CardTitle>
          <CardDescription>
            Choose a custom object to view its associations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedObject} onValueChange={handleObjectSelect}>
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
              No custom objects found. Create custom objects first before viewing associations.
            </p>
          )}

          {selectedObject && associations.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Available Associations</h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {associations.map((association) => (
                  <div key={association.id} className="p-4 border rounded-lg bg-card">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Association ID</span>
                        <span className="font-mono text-sm">{association.id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Type</span>
                        <span className="text-sm">{association.associationType || 'N/A'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground block mb-1">First Object</span>
                          <div className="text-sm">{association.firstObjectLabel || 'N/A'}</div>
                          <div className="font-mono text-xs text-muted-foreground">{association.firstObjectKey || 'N/A'}</div>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground block mb-1">Second Object</span>
                          <div className="text-sm">{association.secondObjectLabel || 'N/A'}</div>
                          <div className="font-mono text-xs text-muted-foreground">{association.secondObjectKey || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedObject && associations.length === 0 && (
            <div className="mt-6 text-center py-8">
              <p className="text-sm text-muted-foreground">
                No associations found for {selectedObjectData?.labels.singular || 'this object'}.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}