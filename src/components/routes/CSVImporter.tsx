import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText } from "lucide-react";
import Papa from 'papaparse';

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

  const importMutation = useMutation({
    mutationFn: async (accounts: any[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('route_accounts').insert(
        accounts.map((acc) => ({
          ...acc,
          user_id: user.id,
          is_active: true,
        }))
      );

      if (error) throw error;
    },
    onSuccess: (_, accounts) => {
      queryClient.invalidateQueries({ queryKey: ['route-accounts'] });
      toast({
        title: "Import successful!",
        description: `Imported ${accounts.length} accounts`,
      });
      setFile(null);
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
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const handleImport = () => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as CSVRow[];
        
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

        importMutation.mutate(accounts);
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <CardTitle>CSV Import</CardTitle>
        </div>
        <CardDescription>
          Import accounts from CSV with business names
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
            <span className="text-sm text-muted-foreground">{file.name}</span>
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={!file || importMutation.isPending}
          className="w-full"
        >
          {importMutation.isPending ? "Importing..." : "Import CSV"}
        </Button>
      </CardContent>
    </Card>
  );
}
