import { Building2, User } from "lucide-react";
import { useAppInitialization } from "@/hooks/useAppInitialization";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { location, userContext, loading } = useAppInitialization();

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
    if (!name) return 'SS';
    return name
      .split(' ')
      .map(word => word?.[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'SS';
  };

  return (
    <header className="border-b bg-card shadow-sm">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Logo or Initials */}
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
              {location?.logoUrl ? (
                <img 
                  src={location.logoUrl} 
                  alt={`${location?.companyName || 'Company'} logo`}
                  className="h-full w-full object-contain rounded-lg"
                  onError={(e) => {
                    // Fallback to initials if logo fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.textContent = getInitials(location?.companyName || 'SS');
                    }
                  }}
                />
              ) : (
                getInitials(location?.companyName || 'SS')
              )}
            </div>
            
            {/* Company Name & Title */}
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {location?.companyName || 'Agency'} - Data Importer
              </h1>
              {location?.name && (
                <p className="text-sm text-muted-foreground">
                  {location.name}
                </p>
              )}
            </div>
          </div>

          {/* User & Location Info */}
          <div className="flex items-center space-x-4">
            {userContext?.name ? (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="text-right">
                  <p className="text-sm font-medium">Welcome, {userContext.name}!</p>
                  <Badge variant="secondary" className="text-xs">
                    {userContext.role || 'User'}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Welcome!</p>
              </div>
            )}
            {location?.id && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>ID: {location.id}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}