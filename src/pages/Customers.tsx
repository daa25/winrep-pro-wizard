import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, MapPin, Mail, Phone } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const parseGPX = async (gpxText: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, "text/xml");
    const waypoints = xmlDoc.getElementsByTagName("wpt");
    const parsedCustomers = [];

    for (let i = 0; i < waypoints.length; i++) {
      const wpt = waypoints[i];
      const lat = parseFloat(wpt.getAttribute("lat") || "0");
      const lon = parseFloat(wpt.getAttribute("lon") || "0");
      const name = wpt.getElementsByTagName("name")[0]?.textContent || "";
      const desc = wpt.getElementsByTagName("desc")[0]?.textContent || "";

      parsedCustomers.push({
        name,
        address: desc,
        latitude: lat,
        longitude: lon,
      });
    }

    return parsedCustomers;
  };

  const importGPXAddresses = async () => {
    setImporting(true);
    try {
      // Fetch the GPX file from public folder
      const response = await fetch("/New_List.gpx");
      const gpxText = await response.text();

      const parsedCustomers = await parseGPX(gpxText);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert customers into database
      const customersToInsert = parsedCustomers.map(customer => ({
        ...customer,
        user_id: user.id,
      }));

      const { error } = await supabase
        .from("customers")
        .insert(customersToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${parsedCustomers.length} addresses from GPX file`,
      });

      fetchCustomers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Customer Addresses</h1>
          <p className="text-muted-foreground">
            Manage your customer locations and contact information
          </p>
        </div>
        <Button onClick={importGPXAddresses} disabled={importing}>
          <Upload className="mr-2 h-4 w-4" />
          {importing ? "Importing..." : "Import GPX Addresses"}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading customers...</div>
      ) : customers.length === 0 ? (
        <Card className="p-12 text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No customers yet</h3>
          <p className="text-muted-foreground mb-4">
            Import your GPX file to get started
          </p>
          <Button onClick={importGPXAddresses} disabled={importing}>
            <Upload className="mr-2 h-4 w-4" />
            {importing ? "Importing..." : "Import GPX Addresses"}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <Card key={customer.id} className="p-4 hover:shadow-lg transition-shadow">
              <h3 className="font-semibold text-lg mb-3">{customer.name}</h3>
              
              {customer.address && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{customer.address}</span>
                </div>
              )}

              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span>{customer.email}</span>
                </div>
              )}

              {customer.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>{customer.phone}</span>
                </div>
              )}

              {customer.latitude && customer.longitude && (
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  Coordinates: {customer.latitude.toFixed(6)}, {customer.longitude.toFixed(6)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Customers;
