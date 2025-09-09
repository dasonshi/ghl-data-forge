import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Link } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";

interface Association {
  id: string;
  key: string;
  description: string;
  relationTo: string;
  isFirst: boolean;
  firstObjectLabel?: string;
  firstObjectKey?: string;
  secondObjectLabel?: string;
  secondObjectKey?: string;
  associationType?: string;
}

interface AssociationsTableProps {
  associations: Association[];
  loading?: boolean;
}

export function AssociationsTable({ associations, loading }: AssociationsTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Available Associations
          </CardTitle>
          <CardDescription>
            Loading associations...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!associations || associations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Available Associations
          </CardTitle>
          <CardDescription>
            No associations found for this location.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Available Associations
        </CardTitle>
        <CardDescription>
          Association types available for your records. Click to copy keys or IDs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Association ID</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>From Object</TableHead>
              <TableHead>To Object</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {associations.map((association) => (
              <TableRow key={association.id}>
                <TableCell 
                  className="font-mono text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => copyToClipboard(association.id, "Association ID")}
                >
                  {association.id}
                </TableCell>
                <TableCell>{association.description}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{association.firstObjectLabel}</div>
                    {association.firstObjectKey && (
                      <div className="text-xs text-muted-foreground font-mono">
                        {association.firstObjectKey}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{association.secondObjectLabel}</div>
                    {association.secondObjectKey && (
                      <div className="text-xs text-muted-foreground font-mono">
                        {association.secondObjectKey}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(association.key, "Association key")}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Key
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(association.id, "Association ID")}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      ID
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}