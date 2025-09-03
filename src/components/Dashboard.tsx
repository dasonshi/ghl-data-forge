import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SuccessStats } from "@/components/SuccessStats";
import { Database, FileText, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { useLocationId } from "@/hooks/useLocationId";

interface CustomObject {
  id: string;
  key: string;
  labels: {
    singular: string;
    plural: string;
  };
  description?: string;
}

interface CustomField {
  id: string;
  fieldKey: string;
  name: string;
  dataType: string;
  description?: string;
}

export function Dashboard() {
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [allFields, setAllFields] = useState<Record<string, CustomField[]>>({});
  const [loading, setLoading] = useState(true);
  const { locationId, refresh } = useLocationId();
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Dashboard: fetchData with locationId:', locationId);
      
      // Fetch objects with location ID
      const objectsResponse = await apiFetch('/api/objects', {}, locationId ?? undefined);
      
      if (objectsResponse.ok) {
        const data = await objectsResponse.json();
        const objects = data.objects || data || [];
        setObjects(objects);
        
        // Fetch schema for each object (includes all fields)
        const fieldsMap: Record<string, CustomField[]> = {};
        for (const obj of objects) {
          try {
            const schemaResponse = await apiFetch(`/api/objects/${obj.key}/schema?fetchProperties=true`, {}, locationId ?? undefined);
            if (schemaResponse.ok) {
              const schema = await schemaResponse.json();
              // Extract fields from schema
              const fields = schema.properties || schema.fields || [];
              fieldsMap[obj.key] = Array.isArray(fields) ? fields : Object.values(fields);
            } else {
              fieldsMap[obj.key] = [];
            }
          } catch (error) {
            console.warn(`Failed to fetch schema for object ${obj.key}:`, error);
            fieldsMap[obj.key] = [];
          }
        }
        setAllFields(fieldsMap);
      } else {
        throw new Error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      });
      setObjects([]);
      setAllFields({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const id = await refresh();
      await fetchData();
    })();
  }, []);

  const totalFields = Object.values(allFields).reduce((sum, fields) => sum + fields.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Dashboard
          </h2>
          <p className="text-muted-foreground">
            Overview of your custom objects and fields
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Custom Objects</p>
                <p className="text-2xl font-bold">{loading ? "..." : objects.length}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Custom Fields</p>
                <p className="text-2xl font-bold">{loading ? "..." : totalFields}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>    
      </div>

      {/* Custom Objects List */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Custom Objects ({objects.length})
            </CardTitle>
            <CardDescription>
              All custom objects in your location
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : objects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No custom objects found</p>
                <p className="text-sm">Create custom objects in HighLevel first</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {objects.map((object) => (
                  <div key={object.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <h3 className="font-medium">{object.labels.singular}</h3>
                      <p className="text-sm text-muted-foreground">{object.key}</p>
                      {object.description && (
                        <p className="text-xs text-muted-foreground mt-1">{object.description}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {allFields[object.key]?.length || 0} fields
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom Fields List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Custom Fields ({totalFields})
            </CardTitle>
            <CardDescription>
              All custom fields across all objects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : totalFields === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No custom fields found</p>
                <p className="text-sm">Create custom fields in your objects first</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(allFields).map(([objectKey, fields]) => (
                  fields.length > 0 && (
                    <div key={objectKey} className="space-y-2">
                      <h4 className="font-medium text-sm text-primary">
                        {objects.find(obj => obj.key === objectKey)?.labels.singular || objectKey}
                      </h4>
                      <div className="space-y-1 pl-4">
                        {fields.map((field, index) => (
                          <div key={index} className="flex items-center justify-between p-2 rounded border-l-2 border-muted">
                            <div>
                              <p className="text-sm font-medium">{field.name}</p>
                              <p className="text-xs text-muted-foreground">{field.fieldKey}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {field.dataType}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}