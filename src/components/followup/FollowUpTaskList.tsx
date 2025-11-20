import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, Mail, MessageSquare, MapPin, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";

interface FollowUpTaskListProps {
  status: string;
}

const TASK_ICONS = {
  call: Phone,
  email: Mail,
  sms: MessageSquare,
  visit: MapPin,
  other: MoreHorizontal,
};

const PRIORITY_COLORS = {
  low: "secondary",
  medium: "default",
  high: "destructive",
  urgent: "destructive",
} as const;

export function FollowUpTaskList({ status }: FollowUpTaskListProps) {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["follow-up-tasks", status],
    queryFn: async () => {
      let query = supabase
        .from("follow_up_tasks")
        .select(`
          *,
          customers(name),
          orders(order_date)
        `)
        .order("due_date");

      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No tasks found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const Icon = TASK_ICONS[task.task_type as keyof typeof TASK_ICONS];
        const isOverdue = new Date(task.due_date) < new Date() && task.status === "pending";
        
        return (
          <div
            key={task.id}
            className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <Checkbox
              checked={task.status === "completed"}
              className="mt-1"
            />
            <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{task.title}</h3>
                  {task.customers && (
                    <p className="text-sm text-muted-foreground">
                      {task.customers.name}
                    </p>
                  )}
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}>
                    {task.priority}
                  </Badge>
                  {isOverdue && (
                    <Badge variant="destructive">Overdue</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>Due: {format(new Date(task.due_date), "MMM d, yyyy")}</span>
                <span>•</span>
                <span className="capitalize">{task.task_type}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}