import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Folder } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FolderMappingCardProps {
  folders: Array<{
    parentId: string;
    name: string;
  }>;
}

export function FolderMappingCard({ folders }: FolderMappingCardProps) {
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      // Try the modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Copied to clipboard",
          description: `${label} copied successfully.`,
        });
      } else {
        // Fallback for iframe/insecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            toast({
              title: "Copied to clipboard",
              description: `${label} copied successfully.`,
            });
          } else {
            // If even the fallback fails, show the text for manual copying
            toast({
              title: "Copy this manually",
              description: `${label}: ${text}`,
            });
          }
        } catch (err) {
          toast({
            title: "Copy manually",
            description: `${label}: ${text}`,
            variant: "destructive",
          });
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      // Final fallback - show the text
      toast({
        title: "Copy this manually",
        description: `${label}: ${text}`,
      });
      console.error('Clipboard copy failed:', err);
    }
  };

  if (!folders || folders.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          Folder Mapping
        </CardTitle>
        <CardDescription>
          Available folders for this object. Click to copy the parentId or name.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {folders.map((folder, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-1">
                <p className="font-medium">{folder.name}</p>
                <p className="text-sm text-muted-foreground font-mono">{folder.parentId}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(folder.name, "Folder name")}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Name
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(folder.parentId, "Parent ID")}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  ID
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}