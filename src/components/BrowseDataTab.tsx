import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Database, Eye, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  key: string;
  name: string;
  type: string;
  required?: boolean;
}

export function BrowseDataTab() {
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const { toast } = useToast();

  const fetchObjects = async () => {
    setLoadingObjects(true);
    try {
      const response = await fetch('https://importer.savvysales.ai/api/objects', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setObjects(data);
      } else {
        throw new Error('Failed to fetch objects');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load custom objects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingObjects(false);
    }
  };

  const fetchFields = async (objectKey: string) => {
    setLoadingFields(true);
    try {
      const response = await fetch(`https://importer.savvysales.ai/api/objects/custom_objects.${objectKey}/fields`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setFields(data);
      } else {
        throw new Error('Failed to fetch fields');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load custom fields. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingFields(false);
    }
  };

  const handleViewFields = (objectKey: string) => {
    setSelectedObject(objectKey);
    fetchFields(objectKey);
  };

  useEffect(() => {
    fetchObjects();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Browse Custom Objects</h2>
          <p className="text-muted-foreground">
            View your existing custom objects and their field structures
          </p>
        </div>
        <Button onClick={fetchObjects} disabled={loadingObjects}>
          <Database className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Custom Objects List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Custom Objects
          </CardTitle>
          <CardDescription>
            {objects.length} custom object{objects.length !== 1 ? 's' : ''} found in your location
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingObjects ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : objects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No custom objects found</p>
              <p className="text-sm">Create custom objects in your subaccount to see them here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {objects.map((object) => (
                <Collapsible key={object.id}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-0 h-auto">
                            {selectedObject === object.key ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <div>
                          <h3 className="font-medium">{object.labels.singular}</h3>
                          <p className="text-sm text-muted-foreground">{object.key}</p>
                          {object.description && (
                            <p className="text-sm text-muted-foreground mt-1">{object.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewFields(object.key)}
                      disabled={loadingFields && selectedObject === object.key}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Fields
                    </Button>
                  </div>
                  
                  <CollapsibleContent>
                    {selectedObject === object.key && (
                      <div className="mt-3 pl-7">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Custom Fields</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {loadingFields ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                              </div>
                            ) : fields.length === 0 ? (
                              <p className="text-muted-foreground text-center py-4">
                                No custom fields found for this object
                              </p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Field Name</TableHead>
                                    <TableHead>Key</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Required</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {fields.map((field) => (
                                    <TableRow key={field.id}>
                                      <TableCell className="font-medium">{field.name}</TableCell>
                                      <TableCell className="font-mono text-sm">{field.key}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline">{field.type}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        {field.required ? (
                                          <Badge variant="secondary">Required</Badge>
                                        ) : (
                                          <span className="text-muted-foreground">Optional</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}