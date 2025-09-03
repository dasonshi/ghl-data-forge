import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, Loader2 } from "lucide-react";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import { useToast } from "@/hooks/use-toast";

interface BrandingFormData {
  name: string;
  logo: string;
  domain: string;
  color: string;
}

export function AgencyBrandingSettings() {
  const { userContext, branding } = useAppInitialization();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setSaving] = useState(false);
  const [formData, setFormData] = useState<BrandingFormData>({
    name: '',
    logo: '',
    domain: '',
    color: ''
  });

  // Only show for agency users
  if (!userContext || userContext.type !== 'agency') {
    return null;
  }

  useEffect(() => {
    if (branding) {
      setFormData({
        name: branding.companyName || '',
        logo: branding.companyLogo || '',
        domain: branding.companyDomain || '',
        color: branding.primaryColor || ''
      });
    }
  }, [branding]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get encrypted data from the app initialization logic
      const getEncryptedUserData = async () => {
        if (window.exposeSessionDetails) {
          return await window.exposeSessionDetails('68ae6ca8bb70273ca2ca7e24-metf8pus');
        }

        return await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 5000);
          const handler = ({ data }) => {
            if (data?.message === 'REQUEST_USER_DATA_RESPONSE') {
              clearTimeout(timeout);
              window.removeEventListener('message', handler);
              resolve(data.payload);
            }
          };
          window.addEventListener('message', handler);
          window.parent.postMessage({ message: 'REQUEST_USER_DATA' }, '*');
        });
      };

      const encryptedData = await getEncryptedUserData();
      
      const response = await fetch('https://importer.api.savvysales.ai/api/branding/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          encryptedData,
          name: formData.name.trim() || undefined,
          logo: formData.logo.trim() || undefined,
          domain: formData.domain.trim() || undefined,
          color: formData.color.trim() || undefined
        })
      });

      if (response.ok) {
        toast({
          title: "Branding saved",
          description: "Your agency branding has been updated successfully."
        });
        setIsOpen(false);
        // Refresh the page to see updated branding
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save branding');
      }
    } catch (error) {
      console.error('Failed to save branding:', error);
      toast({
        title: "Error",
        description: "Failed to save branding. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Settings className="h-4 w-4" />
        Agency Branding
        <Badge variant="secondary" className="text-xs">Agency</Badge>
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Agency Branding Settings
          <Badge variant="secondary">Agency Only</Badge>
        </CardTitle>
        <CardDescription>
          Customize how your agency appears across all locations using this app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company-name">Company Name</Label>
          <Input
            id="company-name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Your Agency Name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo-url">Logo URL</Label>
          <Input
            id="logo-url"
            type="url"
            value={formData.logo}
            onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
            placeholder="https://your-domain.com/logo.png"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="domain">Company Domain</Label>
          <Input
            id="domain"
            type="url"
            value={formData.domain}
            onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
            placeholder="https://your-agency.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="primary-color">Primary Color (HSL)</Label>
          <Input
            id="primary-color"
            value={formData.color}
            onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
            placeholder="221 83% 13% (or any HSL values)"
          />
          <p className="text-sm text-muted-foreground">
            Enter HSL values without 'hsl()' wrapper, e.g., '221 83% 13%'
          </p>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={loading} className="gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Branding
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}