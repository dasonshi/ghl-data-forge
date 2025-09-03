import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocationSwitch } from "@/hooks/useLocationSwitch";
import { useAppContext } from "@/hooks/useAppContext";
import { apiFetch } from "@/lib/api";
import { useLocationId } from "@/hooks/useLocationId";

interface AuthData {
  authenticated: boolean;
  locationId?: string;
  tokenStatus?: string;
}

export function AuthStatus() {
  const [authStatus, setAuthStatus] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);
  const { location } = useAppContext();
  const { locationId, refresh } = useLocationId();
  const { toast } = useToast();

  console.log('🔍 AuthStatus: location from context:', location?.id, 'locationId from hook:', locationId);

  // Clear all data when location switches
  useLocationSwitch(async () => {
    console.log('🔄 AuthStatus: Clearing data for location switch');
    setAuthStatus(null);
    setLoading(true);

    const id = await refresh();
    await fetchAuthStatus();
  });

  const fetchAuthStatus = async () => {
    try {
      const response = await apiFetch('/api/auth/status', {}, locationId ?? undefined);
      
      if (response.ok) {
        const data = await response.json();
        setAuthStatus(data);
      } else {
        setAuthStatus(null);
      }
    } catch (error) {
      setAuthStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    const popup = window.open(
      'https://importer.api.savvysales.ai/oauth/install',
      'oauth',
      'width=600,height=600'
    );

    // Listen for auth success
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://importer.api.savvysales.ai') return;
      
      if (event.data.type === 'oauth_success') {
        popup?.close();
        fetchAuthStatus();
        toast({
          title: "Connected",
          description: "Successfully connected to HighLevel.",
        });
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);
  };

  const handleDisconnect = async () => {
    try {
      const response = await apiFetch('/api/auth/disconnect', { 
        method: 'POST'
      }, locationId ?? undefined);
      
      if (response.ok) {
        toast({
          title: "Disconnected",
          description: "Successfully disconnected from HighLevel.",
        });
        await fetchAuthStatus();
      } else {
        throw new Error('Disconnect failed');
      }
    } catch (error) {
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect from HighLevel. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    (async () => {
      const id = await refresh();
      await fetchAuthStatus();
    })();
  }, []);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Checking authentication...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {authStatus?.authenticated ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Connected to Subaccount</span>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      Authenticated
                    </Badge>
                  </div>
                  {location?.id && (
                    <p className="text-sm text-muted-foreground">
                      Location: {location.id}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Not Connected</span>
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                      Authentication Required
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Connect to your subaccount to access import features
                  </p>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {authStatus?.authenticated ? (
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                <LogOut className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            ) : (
              <Button variant="gradient" size="sm" onClick={handleConnect}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Account
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}