import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";

interface EdgeFunctionLog {
  id: string;
  function_name: string;
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
  method: string | null;
}

interface LogExportProps {
  logs: EdgeFunctionLog[] | undefined;
}

export default function LogExport({ logs }: LogExportProps) {
  const { toast } = useToast();

  const exportToCSV = () => {
    if (!logs || logs.length === 0) {
      toast({ title: "No logs to export", variant: "destructive" });
      return;
    }

    const headers = ['Function Name', 'Method', 'Status Code', 'Response Time (ms)', 'Error Message', 'Timestamp'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        log.function_name,
        log.method || '',
        log.status_code || '',
        log.response_time_ms || '',
        log.error_message ? `"${log.error_message.replace(/"/g, '""')}"` : '',
        new Date(log.created_at).toISOString(),
      ].join(','))
    ].join('\n');

    downloadFile(csvContent, 'edge-function-logs.csv', 'text/csv');
    toast({ title: "Logs exported as CSV" });
  };

  const exportToJSON = () => {
    if (!logs || logs.length === 0) {
      toast({ title: "No logs to export", variant: "destructive" });
      return;
    }

    const jsonContent = JSON.stringify(logs, null, 2);
    downloadFile(jsonContent, 'edge-function-logs.json', 'application/json');
    toast({ title: "Logs exported as JSON" });
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          <CardTitle>Export Logs</CardTitle>
        </div>
        <CardDescription>
          Download logs for external analysis and reporting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export as CSV
          </Button>
          <Button onClick={exportToJSON} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export as JSON
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Exporting {logs?.length || 0} log entries
        </p>
      </CardContent>
    </Card>
  );
}
