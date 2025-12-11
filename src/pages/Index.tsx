import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthStatus } from "@/components/AuthStatus";
import { Dashboard } from "@/components/Dashboard";
import { ImportObjectsTab } from "@/components/ImportObjectsTab";
import { AddFieldsTab } from "@/components/AddFieldsTab";
import { ImportRecordsTab } from "@/components/ImportRecordsTab";
import { UpdateRecordsTab } from "@/components/UpdateRecordsTab";
import { ExportRecordsTab } from "@/components/ExportRecordsTab";
import { ImportCustomValuesTab } from "@/components/ImportCustomValuesTab";
import { UploadAssociationsTab } from "@/components/UploadAssociationsTab";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/hooks/useAppContext";
import { useAgencyBranding } from "@/hooks/useAgencyBranding";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ExternalLink, MessageCircle, KeyRound } from "lucide-react";
import { API_BASE } from "@/lib/api";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [manualLocationId, setManualLocationId] = useState("");
  const [isSubmittingLocation, setIsSubmittingLocation] = useState(false);
  const { loading, error, refreshContext } = useAppContext();
  const { branding } = useAgencyBranding();

  // Handle manual location ID submission
  const handleManualLocationSubmit = async () => {
    const trimmedId = manualLocationId.trim();
    if (!trimmedId) return;

    setIsSubmittingLocation(true);
    try {
      // Store in localStorage and refresh
      localStorage.setItem('currentLocationId', trimmedId);
      console.log('📝 Manual locationId saved:', trimmedId);

      // Refresh the context to try auth with the new locationId
      await refreshContext();
    } finally {
      setIsSubmittingLocation(false);
    }
  };

  // Update document title when branding changes
  useEffect(() => {
    const companyName = branding?.companyName || 'CRM';
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

  // DEBUG: Run localStorage.setItem('test_auth_error', '1') in console, then refresh
  // This check is FIRST so it overrides everything for testing
  const testAuthError = localStorage.getItem('test_auth_error') === '1';
  if (testAuthError && !loading) {
    return (
      <div className="w-full h-full bg-gradient-subtle">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl pb-16">
          <div className="flex justify-center items-center min-h-[400px]">
            <Card className="max-w-lg w-full">
              <CardContent className="p-6 space-y-6">
                <div className="text-center space-y-2">
                  <KeyRound className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-semibold">Unable to Detect Location</h3>
                  <p className="text-sm text-muted-foreground">
                    We couldn't automatically detect your location. This can happen due to browser privacy settings.
                  </p>
                  <p className="text-xs text-yellow-600 font-mono">(DEBUG MODE - remove test_auth_error from localStorage)</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Enter Your Location ID</label>
                    <p className="text-xs text-muted-foreground">
                      You can find this in your browser's address bar. Look for the ID after "/location/" in the URL.
                    </p>
                    <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                      Example: app.example.com/v2/location/<span className="text-primary font-bold">abc123XYZ</span>/...
                    </p>
                    <Input
                      placeholder="Enter location ID (e.g., abc123XYZ)"
                      value={manualLocationId}
                      onChange={(e) => setManualLocationId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualLocationSubmit()}
                      disabled={isSubmittingLocation}
                    />
                  </div>

                  <Button
                    onClick={handleManualLocationSubmit}
                    variant="gradient"
                    className="w-full"
                    disabled={!manualLocationId.trim() || isSubmittingLocation}
                  >
                    {isSubmittingLocation ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        Connecting...
                      </>
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </div>

                <div className="text-center pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    If you continue to have issues, please contact support.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Handle different error types
  if (error === 'app_not_installed') {
    return (
      <div className="w-full h-full bg-gradient-subtle">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl pb-16">
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
      <div className="w-full h-full bg-gradient-subtle">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl pb-16">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No location ID found. Please access this app from within your CRM.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Handle authentication_required - show manual locationId entry
  if (error === 'authentication_required') {
    return (
      <div className="w-full h-full bg-gradient-subtle">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl pb-16">
          <div className="flex justify-center items-center min-h-[400px]">
            <Card className="max-w-lg w-full">
              <CardContent className="p-6 space-y-6">
                <div className="text-center space-y-2">
                  <KeyRound className="h-12 w-12 text-muted-foreground mx-auto" />
                  <h3 className="text-lg font-semibold">Unable to Detect Location</h3>
                  <p className="text-sm text-muted-foreground">
                    We couldn't automatically detect your location. This can happen due to browser privacy settings.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Enter Your Location ID</label>
                    <p className="text-xs text-muted-foreground">
                      You can find this in your browser's address bar. Look for the ID after "/location/" in the URL.
                    </p>
                    <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                      Example: app.example.com/v2/location/<span className="text-primary font-bold">abc123XYZ</span>/...
                    </p>
                    <Input
                      placeholder="Enter location ID (e.g., abc123XYZ)"
                      value={manualLocationId}
                      onChange={(e) => setManualLocationId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualLocationSubmit()}
                      disabled={isSubmittingLocation}
                    />
                  </div>

                  <Button
                    onClick={handleManualLocationSubmit}
                    variant="gradient"
                    className="w-full"
                    disabled={!manualLocationId.trim() || isSubmittingLocation}
                  >
                    {isSubmittingLocation ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        Connecting...
                      </>
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </div>

                <div className="text-center pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    If you continue to have issues, please contact support.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  // Show loading state while initializing
  if (loading) {
    return (
      <div className="w-full h-full bg-gradient-subtle">
        <Header />
        <div className="container mx-auto px-4 py-8 max-w-7xl pb-16">
          <div className="text-center space-y-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">Loading application...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-subtle">
      {/* Header */}
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-7xl pb-16">
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="objects-fields">Objects & Fields</TabsTrigger>
              <TabsTrigger value="records">Records</TabsTrigger>
              <TabsTrigger value="custom-values">Custom Values</TabsTrigger>
            </TabsList>
            
            <div className="mt-8">
              <TabsContent value="dashboard" className="mt-0">
                <Dashboard />
              </TabsContent>
              
              <TabsContent value="objects-fields" className="mt-0">
                <Tabs defaultValue="import-objects" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="import-objects">Import Objects</TabsTrigger>
                    <TabsTrigger value="add-fields">Import Fields</TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-6">
                    <TabsContent value="import-objects" className="mt-0">
                      <ImportObjectsTab />
                    </TabsContent>
                    
                    <TabsContent value="add-fields" className="mt-0">
                      <AddFieldsTab />
                    </TabsContent>
                  </div>
                </Tabs>
              </TabsContent>
              
              <TabsContent value="records" className="mt-0">
                <Tabs defaultValue="import-records" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="import-records">Import Records</TabsTrigger>
                    <TabsTrigger value="update-records">Update Records</TabsTrigger>
                    <TabsTrigger value="export-records">Export Records</TabsTrigger>
                    <TabsTrigger value="upload-associations">Import Record Relations</TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-6">
                    <TabsContent value="import-records" className="mt-0">
                      <ImportRecordsTab />
                    </TabsContent>
                    
                    <TabsContent value="update-records" className="mt-0">
                      <UpdateRecordsTab />
                    </TabsContent>
                    
                    <TabsContent value="export-records" className="mt-0">
                      <ExportRecordsTab />
                    </TabsContent>
                    
                    <TabsContent value="upload-associations" className="mt-0">
                      <UploadAssociationsTab />
                    </TabsContent>
                  </div>
                </Tabs>
              </TabsContent>
              
              <TabsContent value="custom-values" className="mt-0">
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
