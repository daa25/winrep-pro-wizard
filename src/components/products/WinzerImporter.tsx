import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Package, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Winzer product catalog extracted from inventory tracker
const WINZER_PRODUCTS = [
  // Storage Drawer (with Inserts) - Assortment A & B
  { external_id: "953.904.12", name: "Storage Drawer Insert 12", category: "Storage Drawer (with Inserts)", assortment: "A/B" },
  { external_id: "953.904.16", name: "Storage Drawer Insert 16", category: "Storage Drawer (with Inserts)", assortment: "A/B" },
  { external_id: "953.904.20", name: "Storage Drawer Insert 20", category: "Storage Drawer (with Inserts)", assortment: "A/B" },
  { external_id: "953.904.21", name: "Storage Drawer Insert 21", category: "Storage Drawer (with Inserts)", assortment: "A/B" },
  { external_id: "953.904.24", name: "Storage Drawer Insert 24", category: "Storage Drawer (with Inserts)", assortment: "A/B" },
  { external_id: "953.904.32", name: "Storage Drawer Insert 32", category: "Storage Drawer (with Inserts)", assortment: "A/B" },
  
  // Flat Face O-Ring Union
  { external_id: "682.13.44", name: "Flat Face O-Ring Union 4x4", category: "Flat Face O-Ring Union", assortment: "A" },
  { external_id: "682.13.66", name: "Flat Face O-Ring Union 6x6", category: "Flat Face O-Ring Union", assortment: "B" },
  { external_id: "682.13.86", name: "Flat Face O-Ring Union 8x6", category: "Flat Face O-Ring Union", assortment: "A" },
  { external_id: "682.13.1010", name: "Flat Face O-Ring Union 10x10", category: "Flat Face O-Ring Union", assortment: "B" },
  { external_id: "682.13.1212", name: "Flat Face O-Ring Union 12x12", category: "Flat Face O-Ring Union", assortment: "A" },
];

interface WinzerProduct {
  external_id: string;
  name: string;
  category: string;
  assortment: string;
}

interface WinzerImporterProps {
  existingProductIds: string[];
  onImportComplete: () => void;
}

export const WinzerImporter = ({ existingProductIds, onImportComplete }: WinzerImporterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter out products that already exist
  const availableProducts = WINZER_PRODUCTS.filter(
    (p) => !existingProductIds.includes(p.external_id)
  );

  const alreadyImported = WINZER_PRODUCTS.filter(
    (p) => existingProductIds.includes(p.external_id)
  );

  const importMutation = useMutation({
    mutationFn: async (products: WinzerProduct[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const productsToInsert = products.map((p) => ({
        external_id: p.external_id,
        name: p.name,
        category: p.category,
        long_description: `Winzer ${p.category} - Assortment ${p.assortment}`,
        price: 0, // Default price, to be updated
        inventory: 0, // Default inventory
        unit_of_measure: "each",
        hidden: false,
        user_id: user.id,
      }));

      const { error } = await supabase.from("products").insert(productsToInsert);
      if (error) throw error;

      return products.length;
    },
    onSuccess: (count) => {
      toast({
        title: "Winzer Products Imported",
        description: `Successfully imported ${count} products from Winzer catalog.`,
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsOpen(false);
      setSelectedProducts(new Set());
      onImportComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleProduct = (externalId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(externalId)) {
      newSelected.delete(externalId);
    } else {
      newSelected.add(externalId);
    }
    setSelectedProducts(newSelected);
  };

  const selectAll = () => {
    if (selectedProducts.size === availableProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(availableProducts.map((p) => p.external_id)));
    }
  };

  const handleImport = () => {
    const productsToImport = availableProducts.filter((p) =>
      selectedProducts.has(p.external_id)
    );
    if (productsToImport.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to import.",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate(productsToImport);
  };

  // Group products by category
  const productsByCategory = availableProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, WinzerProduct[]>);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import Winzer Catalog
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Import Winzer Products
          </DialogTitle>
          <DialogDescription>
            Select products from the Winzer catalog to import into your inventory.
            Products already in your catalog are marked as imported.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              {alreadyImported.length} already imported
            </span>
            <span className="flex items-center gap-1">
              <Package className="w-4 h-4 text-muted-foreground" />
              {availableProducts.length} available
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={selectAll}>
            {selectedProducts.size === availableProducts.length ? "Deselect All" : "Select All"}
          </Button>
        </div>

        <ScrollArea className="h-[400px] border rounded-md">
          {Object.entries(productsByCategory).map(([category, products]) => (
            <div key={category} className="p-4 border-b last:border-b-0">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                {category}
                <Badge variant="secondary">{products.length}</Badge>
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Assortment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.external_id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.has(product.external_id)}
                          onCheckedChange={() => toggleProduct(product.external_id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.external_id}</Badge>
                      </TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.assortment}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}

          {alreadyImported.length > 0 && (
            <div className="p-4 bg-muted/50">
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Already Imported
              </h3>
              <div className="flex flex-wrap gap-2">
                {alreadyImported.map((product) => (
                  <Badge key={product.external_id} variant="outline" className="opacity-60">
                    {product.external_id}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {availableProducts.length === 0 && (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">All Winzer Products Imported!</p>
              <p className="text-sm text-muted-foreground">
                Your catalog already includes all products from the Winzer inventory.
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between items-center pt-4">
          <p className="text-sm text-muted-foreground">
            {selectedProducts.size} product{selectedProducts.size !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedProducts.size === 0 || importMutation.isPending}
            >
              {importMutation.isPending ? "Importing..." : `Import ${selectedProducts.size} Products`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
