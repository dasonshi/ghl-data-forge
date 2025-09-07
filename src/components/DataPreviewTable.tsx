import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DataPreviewTableProps {
  data: Record<string, string>[];
}

export function DataPreviewTable({ data }: DataPreviewTableProps) {
  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  const previewData = data.slice(0, 5); // Show first 5 rows

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Preview</CardTitle>
        <CardDescription>
          Preview shows first 5 rows of {data.length} total records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md max-h-96 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className="whitespace-nowrap">
                    {column}
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
      </CardContent>
    </Card>
  );
}