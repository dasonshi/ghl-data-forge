import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Database, Eye, Layers, Folder, Settings } from "lucide-react";
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
  fieldKey: string;
  name: string;
  dataType: string;
  description?: string;
  parentId?: string;
  folderName?: string;
}

interface CustomValue {
  id: string;
  name: string;
  value: string;
  fieldKey?: string;
}

export function BrowseDataTab() {
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [customValues, setCustomValues] = useState<CustomValue[]>([]);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [loadingCustomValues, setLoadingCustomValues] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchCustomValues = async () => {
    setLoadingCustomValues(true);
    try {
      const response = await fetch('https://importer.savvysales.ai/api/custom-values', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCustomValues(data.customValues || []);
      } else {
        throw new Error('Failed to fetch custom values');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load custom values. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingCustomValues(false);
    }
  };

  const fetchObjects = async () => {
    setLoadingObjects(true);
    try {
      const response = await fetch('https://importer.savvysales.ai/api/objects', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setObjects(data.objects || []);
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
      const response = await fetch(`https://importer.savvysales.ai/api/objects/${objectKey}/fields`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const fieldsData = data.fields || [];
        
        // Process fields to include folder information
        const processedFields = fieldsData.map((field: any) => ({
          id: field.id,
          fieldKey: field.fieldKey || field.key,
          name: field.name,
          dataType: field.dataType || field.type,
          description: field.description,
          parentId: field.parentId,
          folderName: field.folder?.field?.name || null
        }));
        
        setFields(processedFields);
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

  const handleToggleExpansion = (objectKey: string) => {
    const newExpandedObjects = new Set(expandedObjects);
    if (expandedObjects.has(objectKey)) {
      newExpandedObjects.delete(objectKey);
    } else {
      newExpandedObjects.add(objectKey);
      // Load fields when expanding
      if (selectedObject !== objectKey) {
        handleViewFields(objectKey);
      }
    }
    setExpandedObjects(newExpandedObjects);
  };

  useEffect(() => {
    fetchObjects();
    fetchCustomValues();
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
        <Button onClick={() => { fetchObjects(); fetchCustomValues(); }} disabled={loadingObjects || loadingCustomValues}>
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
              <p className="font-medium">No custom objects found</p>
              <p className="text-sm">Create custom objects in HighLevel first, then import data here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {objects.map((object) => (
                <Collapsible 
                  key={object.id} 
                  open={expandedObjects.has(object.key)}
                  onOpenChange={() => handleToggleExpansion(object.key)}
                >
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-0 h-auto">
                            {expandedObjects.has(object.key) ? (
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
                                    <TableHead>Folder</TableHead>
                                    <TableHead>Description</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {fields.map((field) => (
                                    <TableRow key={field.id}>
                                      <TableCell className="font-medium">{field.name}</TableCell>
                                      <TableCell className="font-mono text-sm">{field.fieldKey}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline">{field.dataType}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        {field.folderName ? (
                                          <div className="flex items-center gap-1 text-sm">
                                            <Folder className="h-3 w-3" />
                                            <span>{field.folderName}</span>
                                            {field.parentId && (
                                              <Badge variant="secondary" className="text-xs ml-2">
                                                {field.parentId}
                                              </Badge>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground text-sm">No folder</span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-muted-foreground">
                                          {field.description || 'No description'}
                                        </span>
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

      {/* Custom Values */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Custom Values
          </CardTitle>
          <CardDescription>
            {customValues.length} custom value{customValues.length !== 1 ? 's' : ''} found in your location
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCustomValues ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : customValues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No custom values found</p>
              <p className="text-sm">Create custom values in HighLevel first, then view them here</p>
            </div>
          ) : (
            <div className="rounded-md border max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key Name</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>Field Key</TableHead>
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
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {cv.fieldKey || '-'}
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
    </div>
  );
}