import { Building2, User, MessageCircle } from "lucide-react";
import { useAppContext } from "@/hooks/useAppContext";
import { useAgencyBranding } from "@/hooks/useAgencyBranding";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { FeedbackModal } from "@/components/FeedbackModal";

export function Header() {
  const { user, location, loading } = useAppContext();
  const { branding, loading: brandingLoading } = useAgencyBranding();
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

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

  const displayName = branding?.companyName || branding?.locationName || location?.name || 'Data Importer';

  return (
    <>
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Logo or Initials */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
                {branding?.logoUrl || location?.logoUrl ? (
                  <img 
                    src={branding?.logoUrl || location?.logoUrl} 
                    alt={`${displayName} logo`}
                    className="h-full w-full object-contain rounded-lg"
                    onError={(e) => {
                      // Fallback to initials if logo fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.textContent = getInitials(displayName);
                      }
                    }}
                  />
                ) : (
                  getInitials(displayName)
                )}
              </div>
              
              {/* Company/Location Name */}
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {displayName}
                </h1>
              </div>
            </div>

            {/* Connection Status & User Info */}
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  {user && location ? (
                    <>
                      <p className="text-sm font-medium leading-tight text-green-600">Connected</p>
                      {location.id && (
                        <p className="text-xs text-muted-foreground">Location: {location.id}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-medium leading-tight text-red-600">Not Connected</p>
                  )}
                </div>
              </div>

              {/* User Info */}
              {user && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="text-right">
                    <p className="text-sm font-medium leading-tight">{user.name}</p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {user.role}
                    </Badge>
                  </div>
                </div>
              )}
              
              {/* Feedback Button */}
              <Button
                onClick={() => setFeedbackModalOpen(true)}
                variant="outline"
                size="sm"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Questions?
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Feedback Modal */}
      <FeedbackModal 
        open={feedbackModalOpen} 
        onOpenChange={setFeedbackModalOpen} 
      />
    </>
  );
}