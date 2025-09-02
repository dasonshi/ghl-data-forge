import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, User, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AuthData {
  authenticated: boolean;
  locationId?: string;
  tokenStatus?: string;
}

export function AuthStatus() {
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const { toast } = useToast();

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('https://importer.api.savvysales.ai/api/auth/status', {
        credentials: 'include',
      });
      
      if (response.status === 429) {
        console.warn('Rate limit exceeded, skipping auth check');
        return;
      }
      
      const data = await response.json();
      setAuthData(data);
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthData({ authenticated: false });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    const popup = window.open(
      'https://importer.api.savvysales.ai/oauth/install', 
      'oauth', 
      'width=600,height=600'
    );

    // Listen for success message from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://importer.api.savvysales.ai') return;
      
      if (event.data.type === 'oauth_success') {
        console.log('OAuth successful for location:', event.data.locationId);
        popup?.close();
        
        // Refresh auth status
        checkAuthStatus();
        
        toast({
          title: "Authentication Successful",
          description: "You are now connected to your subaccount.",
        });
        
        // Clean up listener
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Clean up if popup is closed manually
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
      }
    }, 1000);
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const response = await fetch('https://importer.api.savvysales.ai/api/auth/disconnect', { 
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        setAuthData({ authenticated: false });
        toast({
          title: "Disconnected",
          description: "You have been disconnected from your subaccount.",
        });
        // Start OAuth flow again
        handleLogin();
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      toast({
        title: "Disconnect Error",
        description: "Failed to disconnect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
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
            {authData?.authenticated ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Connected to Subaccount</span>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      Authenticated
                    </Badge>
                  </div>
                  {authData.locationId && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>Location: {authData.locationId}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-warning" />
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
            {authData?.authenticated ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                ) : (
                  <User className="h-4 w-4 mr-2" />
                )}
                Disconnect
              </Button>
            ) : (
              <Button variant="gradient" size="sm" onClick={handleLogin}>
                <User className="h-4 w-4 mr-2" />
                Connect Account
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}