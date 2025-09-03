import { AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface LocationMismatchAlertProps {
  onReconnect?: () => void;
}

export function LocationMismatchAlert({ onReconnect }: LocationMismatchAlertProps) {
  const handleReconnect = () => {
    if (onReconnect) {
      onReconnect();
    } else {
      // Redirect to OAuth install page
      window.location.href = '/oauth/install';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Location Mismatch</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-4">
            This app is not installed for your current HighLevel location context. 
            Please switch to the correct location in HighLevel or reconnect the app.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleReconnect} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect App
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}