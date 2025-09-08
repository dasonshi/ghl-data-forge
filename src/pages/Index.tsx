import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthStatus } from "@/components/AuthStatus";
import { Dashboard } from "@/components/Dashboard";
import { ImportObjectsTab } from "@/components/ImportObjectsTab";
import { AddFieldsTab } from "@/components/AddFieldsTab";
import { ImportRecordsTab } from "@/components/ImportRecordsTab";
import { ImportCustomValuesTab } from "@/components/ImportCustomValuesTab";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/hooks/useAppContext";
import { useAgencyBranding } from "@/hooks/useAgencyBranding";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ExternalLink, MessageCircle } from "lucide-react";
import { API_BASE } from "@/lib/api";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const { loading, error, refreshContext } = useAppContext();
  const { branding } = useAgencyBranding();

  // Update document title when branding changes
  useEffect(() => {
    const companyName = branding?.companyName || 'HighLevel';
    document.title = `${companyName} - Data Importer`;
  }, [branding]);

  const handleConnect = () => {
    console.log('🔐 Opening OAuth popup...');
    const popup = window.open(
      `${API_BASE}/oauth/install`,
      'oauth',
      'width=600,height=600'
    );

    // Listen for auth success
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://importer.api.savvysales.ai') return;
      
      if (event.data.type === 'oauth_success') {
        console.log('✅ OAuth success received, refreshing context...');
        popup?.close();
        refreshContext();
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);
  };

  // Handle different error types
  if (error === 'app_not_installed') {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex justify-center items-center min-h-[400px]">
            <Card className="max-w-md w-full">
              <CardContent className="p-6 text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-warning mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">App Not Installed</h3>
                  <p className="text-sm text-muted-foreground">
                    This app needs to be installed for the current location.
                  </p>
                </div>
                <Button onClick={handleConnect} variant="gradient" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Install App
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error === 'missing_location') {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No location ID found. Please access this app from within HighLevel.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }
  // Show loading state while initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="text-center space-y-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Loading application...</p>
          </div>
        </div>
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
                <Dashboard />
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
      

      {/* Feedback Modal */}
      <FeedbackModal 
        open={feedbackModalOpen} 
        onOpenChange={setFeedbackModalOpen} 
      />
      
      <Toaster />
    </div>
  );
};

export default Index;
