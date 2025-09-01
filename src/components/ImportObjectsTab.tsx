import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Database, Info, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ImportObjectsTab() {
  const { toast } = useToast();

  const downloadObjectsTemplate = async () => {
    try {
      const response = await fetch('https://importer.savvysales.ai/templates/objects', {
        credentials: 'include',
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'objects-template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Template Downloaded",
          description: "Objects CSV template downloaded successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download template. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Import Custom Objects</h2>
        <p className="text-muted-foreground">
          Download the objects template to create custom objects in your system
        </p>
      </div>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          Use this template to define new custom objects with their properties and labels.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Objects Template
            </CardTitle>
            <CardDescription>
              Download the CSV template to define your custom objects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={downloadObjectsTemplate}
              className="w-full"
              size="lg"
            >
              <Database className="h-4 w-4 mr-2" />
              Download Objects Template
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Template Guide
            </CardTitle>
            <CardDescription>
              Instructions for filling out the objects template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">1</div>
                <p className="text-sm">Download the objects CSV template</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">2</div>
                <p className="text-sm">Fill in the required fields for each custom object</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">3</div>
                <p className="text-sm">Submit the completed CSV through your HighLevel system</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Required Fields
              </h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><code className="bg-muted px-1 rounded">key</code> - Unique identifier for the object</p>
                <p><code className="bg-muted px-1 rounded">singular</code> - Singular label (e.g., "Lead")</p>
                <p><code className="bg-muted px-1 rounded">plural</code> - Plural label (e.g., "Leads")</p>
                <p><code className="bg-muted px-1 rounded">description</code> - Brief description of the object</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}