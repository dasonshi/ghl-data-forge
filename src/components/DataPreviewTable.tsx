import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DataPreviewTableProps {
  data: Record<string, string>[];
  errorRows?: number[];
}

export function DataPreviewTable({ data, errorRows = [] }: DataPreviewTableProps) {
  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  const previewData = data.slice(0, 50); // Show first 50 rows

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Preview</CardTitle>
        <CardDescription>
          Preview shows first 5 rows of {data.length} total records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-96 w-full overflow-auto border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className="whitespace-nowrap min-w-[150px]">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.map((row, index) => (
                <TableRow 
                  key={index} 
                  className={errorRows.includes(index) ? 'bg-destructive/10 hover:bg-destructive/20' : ''}
                >
                  {columns.map((column) => (
                    <TableCell key={column} className="min-w-[150px] whitespace-nowrap">
                      {row[column] || '-'}
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
