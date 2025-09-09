import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SuccessStats } from "@/components/SuccessStats";
import { Database, FileText, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, API_BASE } from "@/lib/api";
import { useAppContext } from "@/hooks/useAppContext";
import { copyToClipboard } from "@/lib/clipboard";
import { HelpDocumentation } from "@/components/HelpDocumentation";

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
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());
  const { currentLocationId, location } = useAppContext();
  const { toast } = useToast();
  
  // Use ref to track if we're fetching to prevent duplicates
  const fetchingRef = useRef(false);
  const lastLocationIdRef = useRef<string | null>(null);

  const fetchData = async () => {
    // Prevent duplicate fetches
    if (fetchingRef.current) {
      console.log('Dashboard: Already fetching, skipping...');
      return;
    }
    
    // Don't fetch if we don't have a location
    if (!currentLocationId) {
      console.log('Dashboard: No location ID, skipping fetch');
      setLoading(false);
      return;
    }
    
    // Don't re-fetch if location hasn't changed
    if (lastLocationIdRef.current === currentLocationId && objects.length > 0) {
      console.log('Dashboard: Same location, data already loaded');
      return;
    }
    
    fetchingRef.current = true;
    lastLocationIdRef.current = currentLocationId;
    
    try {
      setLoading(true);
      console.log('🔍 Dashboard: Fetching data for location:', currentLocationId);
      
      // Fetch objects with location ID
      const objectsResponse = await apiFetch('/api/objects', {}, currentLocationId);
      
      if (objectsResponse.ok) {
        const data = await objectsResponse.json();
        const fetchedObjects = data.objects || data || [];
        setObjects(fetchedObjects);
        
        // Fetch schema for each object (includes all fields)
        const fieldsMap: Record<string, CustomField[]> = {};
        for (const obj of fetchedObjects) {
          try {
            // Extract raw key (e.g., "test" from "custom_objects.test")
            const rawKey = obj.key.includes('.') ? obj.key.split('.').pop() : obj.key;
            
            // Fetch schema with locationId
            const schemaResponse = await fetch(
              `${API_BASE}/api/objects/${rawKey}/schema?fetchProperties=true&locationId=${currentLocationId}`,
              {
                credentials: 'include',
                cache: 'no-store'
              }
            );
            
            if (schemaResponse.ok) {
              const schema = await schemaResponse.json();
              // Extract fields from schema
              const fields = schema.properties || schema.fields || [];
              fieldsMap[obj.key] = Array.isArray(fields) ? fields : Object.values(fields);
            } else {
              console.warn(`Failed to fetch schema for object ${obj.key}:`, schemaResponse.status);
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
      fetchingRef.current = false;
    }
  };

  const handleRefresh = async () => {
    // Force refresh by clearing the last location ID
    lastLocationIdRef.current = null;
    await fetchData();
  };

  // Fetch data when location changes
  useEffect(() => {
    if (currentLocationId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [currentLocationId]); // Only depend on currentLocationId

  // Listen for auth success events only
  useEffect(() => {
    const handleAuthSuccess = () => {
      console.log('🔄 Dashboard: Auth success detected, refreshing data');
      lastLocationIdRef.current = null; // Force refresh
      fetchData();
    };

    window.addEventListener('auth-success', handleAuthSuccess);
    
    return () => {
      window.removeEventListener('auth-success', handleAuthSuccess);
    };
  }, []);

  const totalFields = Object.values(allFields).reduce((sum, fields) => sum + fields.length, 0);

  const toggleObjectExpanded = (objectKey: string) => {
    setExpandedObjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(objectKey)) {
        newSet.delete(objectKey);
      } else {
        newSet.add(objectKey);
      }
      return newSet;
    });
  };

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
        <Button onClick={handleRefresh} disabled={loading} variant="outline">
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

      {/* Custom Objects with Expandable Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Custom Objects & Fields ({objects.length} objects, {totalFields} fields)
          </CardTitle>
          <CardDescription>
            All custom objects and their fields. Click to expand and view fields.
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
            <div className="space-y-2">
              {objects.map((object) => {
                const objectFields = allFields[object.key] || [];
                const isExpanded = expandedObjects.has(object.key);
                
                return (
                  <Collapsible key={object.id} open={isExpanded} onOpenChange={() => toggleObjectExpanded(object.key)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="text-left">
                            <h3 className="font-medium">{object.labels.singular}</h3>
                            <p 
                              className="text-sm text-muted-foreground cursor-pointer hover:text-primary transition-colors" 
                              onClick={async (e) => {
                                e.stopPropagation();
                                await copyToClipboard(object.key, `Object key "${object.key}"`);
                              }}
                              title="Click to copy"
                            >
                              {object.key}
                            </p>
                            {object.description && (
                              <p className="text-xs text-muted-foreground mt-1">{object.description}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {objectFields.length} fields
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="ml-8 mr-4 mb-2">
                        {objectFields.length === 0 ? (
                          <div className="py-4 text-center text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No fields found for this object</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {objectFields.map((field, index) => (
                              <div key={index} className="flex items-center justify-between p-3 rounded border-l-2 border-muted bg-muted/20">
                                <div>
                                   <p className="text-sm font-medium">{field.name}</p>
                                    <p 
                                      className="text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors" 
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        await copyToClipboard(field.fieldKey, `Field key "${field.fieldKey}"`);
                                      }}
                                      title="Click to copy"
                                    >
                                      {field.fieldKey}
                                    </p>
                                  {field.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {field.dataType}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Documentation Section */}
      <HelpDocumentation />
    </div>
  );
}
