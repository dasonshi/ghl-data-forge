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
  const { toast } = useToast();

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('https://importer.savvysales.ai/api/auth/status', {
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
    // Redirect to OAuth install in the same window
    window.location.href = 'https://importer.savvysales.ai/oauth/install';
  };

  const handleLogout = async () => {
    try {
      await fetch('https://importer.savvysales.ai/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
      });
      setAuthData({ authenticated: false });
      toast({
        title: "Logged Out",
        description: "You have been disconnected from your subaccount.",
      });
    } catch (error) {
      toast({
        title: "Logout Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
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
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <User className="h-4 w-4 mr-2" />
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