import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  action: {
    label: string;
    onClick: () => void;
    variant?: "default" | "gradient" | "outline";
  };
  className?: string;
}

export function DashboardCard({ title, description, icon, action, className }: DashboardCardProps) {
  return (
    <Card className={cn("transition-all duration-200 hover:shadow-medium group cursor-pointer", className)}>
      <CardHeader className="space-y-2">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
            {icon}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription className="text-sm leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          variant={action.variant || "default"}
          onClick={action.onClick}
          className="w-full"
        >
          {action.label}
        </Button>
      </CardContent>
    </Card>
  );
}