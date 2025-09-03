import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthStatus } from "@/components/AuthStatus";
import { Dashboard } from "@/components/Dashboard";
import { ImportObjectsTab } from "@/components/ImportObjectsTab";
import { AddFieldsTab } from "@/components/AddFieldsTab";
import { ImportRecordsTab } from "@/components/ImportRecordsTab";
import { ImportCustomValuesTab } from "@/components/ImportCustomValuesTab";
import { Header } from "@/components/Header";
import { LocationMismatchAlert } from "@/components/LocationMismatchAlert";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import { Toaster } from "@/components/ui/toaster";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { locationMismatch, location } = useAppInitialization();

  // Show location mismatch alert
  if (locationMismatch) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <LocationMismatchAlert />
        <Toaster />
      </div>
    );
  }

  // Show limited UI when no location context
  if (!location) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-4">No Location Context</h2>
            <p className="text-muted-foreground">
              Please ensure you're accessing this app from within a HighLevel location where it's installed.
            </p>
          </div>
        </div>
        
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Page Title */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-foreground">
              Custom Data Importer
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Import custom objects, fields, records, and custom values from CSV.
            </p>
          </div>

          {/* Authentication Status */}
          <AuthStatus />

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="import-objects">Import Objects</TabsTrigger>
              <TabsTrigger value="add-fields">Import Fields</TabsTrigger>
              <TabsTrigger value="import-records">Import Records</TabsTrigger>
              <TabsTrigger value="import-custom-values">Import Custom Values</TabsTrigger>
            </TabsList>
            
            <div className="mt-8">
              <TabsContent value="dashboard" className="mt-0">
                <Dashboard onTabChange={setActiveTab} />
              </TabsContent>
              
              <TabsContent value="import-objects" className="mt-0">
                <ImportObjectsTab />
              </TabsContent>
              
              <TabsContent value="add-fields" className="mt-0">
                <AddFieldsTab />
              </TabsContent>
              
              <TabsContent value="import-records" className="mt-0">
                <ImportRecordsTab />
              </TabsContent>
              
              <TabsContent value="import-custom-values" className="mt-0">
                <ImportCustomValuesTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
      
      <Toaster />
    </div>
  );
};

export default Index;
