import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Papa from 'papaparse';

// Security limits
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_RECORDS = 500;
const CONFIRMATION_THRESHOLD = 100;

interface CSVRow {
  name?: string;
  business_name?: string;
  full_address?: string;
  address?: string;
  city?: string;
}

export default function CSVImporter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [pendingAccounts, setPendingAccounts] = useState<any[] | null>(null);

  const importMutation = useMutation({
    mutationFn: async (accounts: any[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Chunk large imports to prevent timeouts
      const chunkSize = 100;
      for (let i = 0; i < accounts.length; i += chunkSize) {
        const chunk = accounts.slice(i, i + chunkSize);
        const { error } = await supabase.from('route_accounts').insert(
          chunk.map((acc) => ({
            ...acc,
            user_id: user.id,
            is_active: true,
          }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-accounts'] });
      toast({
        title: "Import successful!",
        description: `Imported ${pendingAccounts?.length || 0} accounts`,
      });
      setFile(null);
      setPreviewCount(null);
      setPendingAccounts(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setPreviewCount(null);
    setPendingAccounts(null);
    
    if (!selectedFile) return;
    
    // Check file type
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB`,
        variant: "destructive",
      });
      return;
    }
    
    setFile(selectedFile);
  };

  const parseAndValidate = () => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as CSVRow[];
        
        // Check record count
        if (rows.length > MAX_RECORDS) {
          toast({
            title: "Too many records",
            description: `Maximum ${MAX_RECORDS} records per import. Your file has ${rows.length} records. Please split into smaller files.`,
            variant: "destructive",
          });
          return;
        }
        
        const accounts = rows
          .filter((row) => row.full_address || row.address)
          .map((row) => {
            const address = row.full_address || row.address || '';
            const businessName = row.business_name || row.name;
            const city = row.city || extractCity(address);

            return {
              business_name: businessName,
              name: businessName || address.split(',')[0],
              address: address,
              region: mapCityToRegion(city),
              priority: 'medium',
              frequency: city.toLowerCase().includes('villages') ? 'weekly' : 'weekly',
              tags: getSpecialTags(businessName || ''),
              notes: null,
              priority_score: 1.0,
            };
          });

        if (accounts.length === 0) {
          toast({
            title: "No valid accounts found",
            description: "CSV must have 'full_address' or 'address' column",
            variant: "destructive",
          });
          return;
        }

        setPreviewCount(accounts.length);
        setPendingAccounts(accounts);
        
        // Auto-import if under threshold
        if (accounts.length <= CONFIRMATION_THRESHOLD) {
          importMutation.mutate(accounts);
        }
      },
      error: (error) => {
        toast({
          title: "CSV parse error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const confirmImport = () => {
    if (pendingAccounts) {
      importMutation.mutate(pendingAccounts);
    }
  };

  const extractCity = (address: string): string => {
    const parts = address.split(',');
    return parts.length >= 2 ? parts[parts.length - 2].trim() : '';
  };

  const mapCityToRegion = (city: string): string => {
    const cityLower = city.toLowerCase();
    
    if (cityLower.includes('the villages') || cityLower.includes('wildwood') || 
        cityLower.includes('lady lake') || cityLower.includes('fruitland') ||
        cityLower.includes('summerfield')) {
      return 'Villages';
    }
    if (cityLower.includes('tampa') || cityLower.includes('temple terrace') ||
        cityLower.includes('riverview') || cityLower.includes('clearwater') ||
        cityLower.includes('wesley chapel') || cityLower.includes('lutz') ||
        cityLower.includes('ruskin') || cityLower.includes('wimauma')) {
      return 'Tampa';
    }
    if (cityLower.includes('ocala') || cityLower.includes('san antonio') ||
        cityLower.includes('homosassa')) {
      return 'Ocala';
    }
    if (cityLower.includes('orlando') || cityLower.includes('kissimmee') ||
        cityLower.includes('winter garden') || cityLower.includes('clermont')) {
      return 'Orlando';
    }
    if (cityLower.includes('haines city')) {
      return 'HainesCity';
    }
    
    return 'Lakeland'; // default
  };

  const getSpecialTags = (name: string): string[] => {
    const tags: string[] = [];
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('celebration golf')) tags.push('firstStop');
    if (nameLower.includes('mystic dunes')) tags.push('lastStop');
    if (nameLower.includes('juliet') || nameLower.includes('juliette')) tags.push('julietFalls');
    
    return tags;
  };

  const needsConfirmation = previewCount !== null && previewCount > CONFIRMATION_THRESHOLD;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <CardTitle>CSV Import</CardTitle>
        </div>
        <CardDescription>
          Import accounts from CSV with business names (max {MAX_RECORDS} records, {MAX_FILE_SIZE_MB}MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Expected CSV Format:</Label>
          <div className="p-3 bg-muted rounded-lg text-sm font-mono">
            <div>name,business_name,full_address,city</div>
            <div className="text-muted-foreground">
              DTE Mt Dora,DTE Mt Dora,15607 SW 13th Cir Ocala FL,Ocala
            </div>
            <div className="text-muted-foreground">
              Celebration Golf,Celebration Golf,4050 Celebration Blvd...,Kissimmee
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Required: <strong>full_address</strong> or <strong>address</strong> column<br />
            Optional: <strong>name</strong>, <strong>business_name</strong>, <strong>city</strong>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="csv-file">Select CSV File</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
          />
        </div>

        {file && (
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>
        )}

        {needsConfirmation && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You're about to import <strong>{previewCount}</strong> accounts. 
              This is a large import. Please confirm to proceed.
            </AlertDescription>
          </Alert>
        )}

        {needsConfirmation ? (
          <div className="flex gap-2">
            <Button
              onClick={confirmImport}
              disabled={importMutation.isPending}
              className="flex-1"
            >
              {importMutation.isPending ? "Importing..." : `Confirm Import (${previewCount} accounts)`}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setPreviewCount(null);
                setPendingAccounts(null);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            onClick={parseAndValidate}
            disabled={!file || importMutation.isPending}
            className="w-full"
          >
            {importMutation.isPending ? "Importing..." : "Import CSV"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
