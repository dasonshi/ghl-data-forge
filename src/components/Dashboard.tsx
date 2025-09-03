import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  Database, 
  Eye, 
  Layers, 
  Folder, 
  Settings, 
  TrendingUp,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardCard } from "./DashboardCard";
import { useAppInitialization } from "@/hooks/useAppInitialization";

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

interface DashboardStats {
  totalObjects: number;
  totalFields: number;
  totalCustomValues: number;
  recentImports: number;
}


interface DashboardProps {
  onTabChange?: (tab: string) => void;
}

export function Dashboard({ onTabChange }: DashboardProps) {
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [customValues, setCustomValues] = useState<CustomValue[]>([]);
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalObjects: 0,
    totalFields: 0,
    totalCustomValues: 0,
    recentImports: 0
  });
  
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [loadingCustomValues, setLoadingCustomValues] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { userContext, location } = useAppInitialization();

  const fetchCustomValues = async () => {
    setLoadingCustomValues(true);
    try {
      const response = await fetch('https://importer.api.savvysales.ai/api/custom-values', {
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
      const response = await fetch('https://importer.api.savvysales.ai/api/objects', {
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
      const response = await fetch(`https://importer.api.savvysales.ai/api/objects/${objectKey}/fields`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const fieldsData = data.fields || [];
        
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
      if (selectedObject !== objectKey) {
        handleViewFields(objectKey);
      }
    }
    setExpandedObjects(newExpandedObjects);
  };

  const refreshData = () => {
    fetchObjects();
    fetchCustomValues();
  };

  useEffect(() => {
    fetchObjects();
    fetchCustomValues();
  }, []);

  // Update stats when data changes
  useEffect(() => {
    const totalFields = fields.length;
    setStats({
      totalObjects: objects.length,
      totalFields,
      totalCustomValues: customValues.length,
      recentImports: 3 // This could be calculated from actual import history
    });
  }, [objects, customValues, fields]);

  return (
    <div className="space-y-6">
      {/* Personalized Welcome Section */}
      <div className="text-center py-8 bg-gradient-subtle rounded-lg border">
        <div className="mx-auto max-w-md">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {userContext 
              ? `Hi ${userContext.name}, ready to import data for ${location?.companyName || 'your agency'}?`
              : `Welcome to ${location?.companyName || 'Your Agency'}'s Data Dashboard`
            }
          </h2>
          <p className="text-muted-foreground mb-6">
            Manage your custom objects, fields, and values all in one place. Get started by exploring your data or importing new records.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <DashboardCard
              title="Import Objects"
              description="Create and manage custom objects"
              icon={<Layers className="h-5 w-5" />}
              action={{
                label: "Get Started",
                onClick: () => onTabChange?.('import-objects'),
                variant: "default"
              }}
              className="flex-1 max-w-xs"
            />
            <DashboardCard
              title="Import Records"
              description="Upload data to your objects"
              icon={<Database className="h-5 w-5" />}
              action={{
                label: "Upload Data",
                onClick: () => onTabChange?.('import-records'),
                variant: "outline"
              }}
              className="flex-1 max-w-xs"
            />
          </div>
        </div>
      </div>

      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Data Overview
          </h3>
          <p className="text-muted-foreground">
            Current status of your data import system
          </p>
        </div>
        <Button onClick={refreshData} disabled={loadingObjects || loadingCustomValues}>
          <Database className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="group hover:shadow-medium transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Custom Objects</p>
                <p className="text-2xl font-bold">{loadingObjects ? <Skeleton className="h-8 w-12" /> : stats.totalObjects}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-medium transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Custom Fields</p>
                <p className="text-2xl font-bold">{loadingFields ? <Skeleton className="h-8 w-12" /> : stats.totalFields}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-medium transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Custom Values</p>
                <p className="text-2xl font-bold">{loadingCustomValues ? <Skeleton className="h-8 w-12" /> : stats.totalCustomValues}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-medium transition-all duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recent Imports</p>
                <p className="text-2xl font-bold">{stats.recentImports}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
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