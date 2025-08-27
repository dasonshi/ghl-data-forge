import { useState } from "react";
import { Download, Database, Upload, FileText, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StepIndicator } from "@/components/StepIndicator";
import { DashboardCard } from "@/components/DashboardCard";
import { FileUploadZone } from "@/components/FileUploadZone";
import { DataPreviewTable } from "@/components/DataPreviewTable";
import { SuccessStats } from "@/components/SuccessStats";
import { useToast } from "@/hooks/use-toast";

type Step = "dashboard" | "upload" | "mapping" | "success";

const Index = () => {
  const [currentStep, setCurrentStep] = useState<Step>("dashboard");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const steps = ["Setup", "Upload", "Map & Confirm", "Complete"];
  const stepIndex = {
    dashboard: 0,
    upload: 1,
    mapping: 2,
    success: 3
  };

  // Mock data for demo
  const availableFields = [
    "firstName",
    "lastName", 
    "email",
    "phone",
    "company",
    "customField1",
    "customField2",
    "customField3"
  ];

  const mockStats = {
    totalRecords: 1247,
    successfulImports: 1201,
    failedImports: 46,
    duration: "2m 34s"
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    // Mock CSV parsing
    const mockData = [
      { name: "John Doe", email: "john@example.com", phone: "555-0123", company: "Acme Corp" },
      { name: "Jane Smith", email: "jane@example.com", phone: "555-0124", company: "Tech Inc" },
      { name: "Bob Johnson", email: "bob@example.com", phone: "555-0125", company: "StartupCo" },
    ];
    setCsvData(mockData);
    setCurrentStep("mapping");
  };

  const handleMappingChange = (column: string, field: string) => {
    setFieldMapping(prev => ({ ...prev, [column]: field }));
  };

  const handleDownloadTemplate = () => {
    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded to your computer.",
    });
  };

  const handleFetchSchema = () => {
    toast({
      title: "Schema Fetched",
      description: "Custom object schema retrieved successfully.",
    });
  };

  const handleStartUpload = () => {
    setCurrentStep("upload");
  };

  const handleConfirmMapping = () => {
    setCurrentStep("success");
    toast({
      title: "Import Started",
      description: "Your data is being imported to GHL.",
    });
  };

  const handleStartOver = () => {
    setCurrentStep("dashboard");
    setUploadedFile(null);
    setCsvData([]);
    setFieldMapping({});
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Custom Object Importer
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Import custom objects and fields into GoHighLevel with precision mapping and validation
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <DashboardCard
          title="Fetch Schema"
          description="Get your subaccount's custom object schema to identify available fields and their IDs"
          icon={<Database className="h-5 w-5" />}
          action={{
            label: "Fetch Schema",
            onClick: handleFetchSchema,
            variant: "outline"
          }}
        />
        
        <DashboardCard
          title="Download Template"
          description="Get a properly formatted CSV template with all required headers and sample data"
          icon={<Download className="h-5 w-5" />}
          action={{
            label: "Download Template",
            onClick: handleDownloadTemplate,
            variant: "outline"
          }}
        />
        
        <DashboardCard
          title="Upload Data"
          description="Upload your CSV file to start the import process with field mapping and validation"
          icon={<Upload className="h-5 w-5" />}
          action={{
            label: "Start Upload",
            onClick: handleStartUpload,
            variant: "gradient"
          }}
        />
      </div>
    </div>
  );

  const renderUpload = () => (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Upload Your CSV File</h2>
        <p className="text-muted-foreground">
          Select your formatted CSV file to begin the import process
        </p>
      </div>
      
      <FileUploadZone
        onFileSelect={handleFileSelect}
        acceptedTypes=".csv"
        maxSize={10}
      />
      
      <div className="flex justify-center">
        <Button 
          variant="ghost" 
          onClick={() => setCurrentStep("dashboard")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );

  const renderMapping = () => (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Map Your Data Fields</h2>
        <p className="text-muted-foreground">
          Review your data and map CSV columns to GHL custom fields
        </p>
      </div>
      
      <DataPreviewTable
        data={csvData}
        mapping={fieldMapping}
        onMappingChange={handleMappingChange}
        availableFields={availableFields}
      />
      
      <div className="flex justify-between">
        <Button 
          variant="ghost" 
          onClick={() => setCurrentStep("upload")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Upload
        </Button>
        
        <Button 
          variant="gradient"
          onClick={handleConfirmMapping}
          className="flex items-center gap-2"
        >
          Confirm & Import
          <CheckCircle2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-8 max-w-4xl mx-auto text-center">
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-success/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
        </div>
        <h2 className="text-3xl font-bold">Import Completed Successfully!</h2>
        <p className="text-xl text-muted-foreground">
          Your custom objects have been imported into GoHighLevel
        </p>
      </div>
      
      <SuccessStats stats={mockStats} />
      
      <div className="space-y-4">
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Import Summary
            </CardTitle>
            <CardDescription>
              Review the details of your successful import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File:</span>
              <span className="font-medium">{uploadedFile?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mapped Fields:</span>
              <span className="font-medium">{Object.keys(fieldMapping).filter(k => fieldMapping[k]).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Import Type:</span>
              <span className="font-medium">Custom Objects</span>
            </div>
          </CardContent>
        </Card>
        
        <Button 
          variant="gradient" 
          onClick={handleStartOver}
          className="w-full"
        >
          Start New Import
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <StepIndicator 
          steps={steps}
          currentStep={stepIndex[currentStep]}
          className="mb-8"
        />
        
        {currentStep === "dashboard" && renderDashboard()}
        {currentStep === "upload" && renderUpload()}
        {currentStep === "mapping" && renderMapping()}
        {currentStep === "success" && renderSuccess()}
      </div>
    </div>
  );
};

export default Index;
