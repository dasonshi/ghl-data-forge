import { Building2 } from "lucide-react";
import { useAgencyBranding } from "@/hooks/useAgencyBranding";
import { Skeleton } from "@/components/ui/skeleton";

export function Header() {
  const { branding, loading } = useAgencyBranding();

  if (loading) {
    return (
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </header>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Logo or Initials */}
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
              {branding?.logoUrl ? (
                <img 
                  src={branding.logoUrl} 
                  alt={`${branding.companyName} logo`}
                  className="h-full w-full object-contain rounded-lg"
                  onError={(e) => {
                    // Fallback to initials if logo fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.textContent = getInitials(branding.companyName);
                    }
                  }}
                />
              ) : (
                getInitials(branding?.companyName || 'SS')
              )}
            </div>
            
            {/* Company Name */}
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {branding?.companyName || 'Savvy Sales'}
              </h1>
              {branding?.locationName && (
                <p className="text-sm text-muted-foreground">
                  {branding.locationName}
                </p>
              )}
            </div>
          </div>

          {/* Location Info */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>ID: {branding?.locationId || 'Unknown'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}