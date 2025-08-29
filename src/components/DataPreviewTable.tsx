import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataPreviewTableProps {
  data: Record<string, string>[];
  mapping: Record<string, string>;
  onMappingChange: (column: string, field: string) => void;
  availableFields: string[];
}

export function DataPreviewTable({ data, mapping, onMappingChange, availableFields }: DataPreviewTableProps) {
  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  const previewData = data.slice(0, 5); // Show first 5 rows

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Preview & Field Mapping</CardTitle>
        <CardDescription>
          Map your CSV columns to GHL custom fields. Preview shows first 5 rows of {data.length} total records.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mapping Controls */}
        <div className="space-y-3">
          <h4 className="font-medium">Field Mapping</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {columns.map((column) => (
              <div key={column} className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  {column}
                  <Badge variant="outline" className="text-xs">
                    CSV Column
                  </Badge>
                </label>
                <Select
                  value={mapping[column] || "__UNMAPPED__"}
                  onValueChange={(value) => onMappingChange(column, value === "__UNMAPPED__" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select GHL field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__UNMAPPED__">Don't map</SelectItem>
                    {availableFields.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* Data Preview */}
        <div className="space-y-3">
          <h4 className="font-medium">Data Preview</h4>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column} className="whitespace-nowrap">
                      <div className="space-y-1">
                        <div>{column}</div>
                        {mapping[column] && (
                          <Badge variant="secondary" className="text-xs">
                            → {mapping[column]}
                          </Badge>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    {columns.map((column) => (
                      <TableCell key={column} className="max-w-[200px] truncate">
                        {row[column]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}