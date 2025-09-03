import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/DashboardCard";
import { SuccessStats } from "@/components/SuccessStats";
import { Database, FileText, Plus, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { useLocationId } from "@/hooks/useLocationId";

interface DashboardStats {
  totalObjects: number;
  totalFields: number;
  totalRecords: number;
  recentImports: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { locationId, refresh } = useLocationId();
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch objects
      const objectsResponse = await apiFetch('/api/objects', {}, locationId ?? undefined);
      
      if (objectsResponse.ok) {
        const data = await objectsResponse.json();
        const objects = data.objects || data || [];
        
        // Fetch fields
        const fieldsResponse = await apiFetch('/api/fields', {}, locationId ?? undefined);
        
        let totalFields = 0;
        if (fieldsResponse.ok) {
          const fieldsData = await fieldsResponse.json();
          totalFields = fieldsData.fields ? fieldsData.fields.length : 0;
        }
        
        // Fetch records
        const recordsResponse = await apiFetch('/api/records', {}, locationId ?? undefined);
        
        let totalRecords = 0;
        if (recordsResponse.ok) {
          const recordsData = await recordsResponse.json();
          totalRecords = recordsData.records ? recordsData.records.length : 0;
        }

        setStats({
          totalObjects: objects.length,
          totalFields,
          totalRecords,
          recentImports: 0, // This would come from a dedicated endpoint
        });
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
      setStats({
        totalObjects: 0,
        totalFields: 0,
        totalRecords: 0,
        recentImports: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const id = await refresh();
      await fetchStats();
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Dashboard
        </h2>
        <p className="text-muted-foreground">
          Overview of your data import system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Custom Objects"
          value={loading ? "..." : stats?.totalObjects.toString() || "0"}
          description="Total objects"
          icon={Database}
        />
        <DashboardCard
          title="Custom Fields"
          value={loading ? "..." : stats?.totalFields.toString() || "0"}
          description="Total fields"
          icon={FileText}
        />
        <DashboardCard
          title="Records"
          value={loading ? "..." : stats?.totalRecords.toString() || "0"}
          description="Total records"
          icon={Plus}
        />
        <DashboardCard
          title="Recent Imports"
          value={stats?.recentImports.toString() || "0"}
          description="Last 7 days"
          icon={Upload}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Import Objects</h3>
                <p className="text-sm text-muted-foreground">Create custom objects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Import Fields</h3>
                <p className="text-sm text-muted-foreground">Add custom fields</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Import Records</h3>
                <p className="text-sm text-muted-foreground">Add data records</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Import Values</h3>
                <p className="text-sm text-muted-foreground">Custom field values</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <SuccessStats />
    </div>
  );
}