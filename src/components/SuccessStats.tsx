import { CheckCircle, Database, Clock, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SuccessStatsProps {
  stats: {
    totalRecords: number;
    successfulImports: number;
    failedImports: number;
    duration: string;
  };
}

export function SuccessStats({ stats }: SuccessStatsProps) {
  const successRate = Math.round((stats.successfulImports / stats.totalRecords) * 100);

  const statCards = [
    {
      label: "Total Records",
      value: stats.totalRecords.toLocaleString(),
      icon: Database,
      color: "text-primary"
    },
    {
      label: "Successful Imports",
      value: stats.successfulImports.toLocaleString(),
      icon: CheckCircle,
      color: "text-success"
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      icon: Users,
      color: successRate >= 95 ? "text-success" : successRate >= 80 ? "text-warning" : "text-destructive"
    },
    {
      label: "Import Duration",
      value: stats.duration,
      icon: Clock,
      color: "text-muted-foreground"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="shadow-soft">
          <CardContent className="p-4 text-center space-y-2">
            <stat.icon className={`h-6 w-6 mx-auto ${stat.color}`} />
            <div className="space-y-1">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}