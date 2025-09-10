import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle, ExternalLink, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/hooks/useAppContext";
import { apiFetch, API_BASE } from "@/lib/api";
import { useAgencyBranding } from "@/hooks/useAgencyBranding";
import { isOriginAllowed } from "@/lib/security";

export function AuthStatus() {
  const { user, location, loading, refreshContext } = useAppContext();
  const { branding } = useAgencyBranding();
  const { toast } = useToast();

  // Connected if we have both user and location data
  const isConnected = !!(user && location);

  const handleConnect = () => {
    console.log('🔐 Opening OAuth popup...');
    const popup = window.open(
      `${API_BASE}/oauth/install`,
      'oauth',
      'width=600,height=600'
    );

    // Listen for auth success
    const handleMessage = (event: MessageEvent) => {
      console.log('📨 Received message:', event.origin, event.data);
      
      // Use security utility for origin validation
      if (!isOriginAllowed(event.origin)) {
        console.log('❌ Message from unauthorized origin:', event.origin);
        return;
      }
      
      if (event.data && typeof event.data === 'object' && event.data.type === 'oauth_success') {
        console.log('✅ OAuth success received, refreshing context...');
        popup?.close();
        refreshContext();
        
        // Trigger dashboard refresh after successful auth
        window.dispatchEvent(new CustomEvent('auth-success'));
        
        toast({
          title: "Connected",
          description: "Successfully connected to HighLevel.",
        });
        window.removeEventListener('message', handleMessage);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Also listen for popup close without success
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        console.log('🔒 OAuth popup closed');
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
      }
    }, 1000);
  };

  const handleDisconnect = async () => {
    try {
      const response = await apiFetch('/api/auth/disconnect', { 
        method: 'POST'
      }, location?.id);
      
      if (response.ok) {
        toast({
          title: "Disconnected",
          description: "Successfully disconnected from HighLevel.",
        });
        refreshContext();
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
            {isConnected ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div className="space-y-1">
                   <div className="flex items-center gap-2">
                     <span className="font-medium">Connected to {branding?.companyName || 'HighLevel'}</span>
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
            {isConnected ? (
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