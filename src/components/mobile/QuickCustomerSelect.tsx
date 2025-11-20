import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface QuickCustomerSelectProps {
  onCustomerSelect: (customerId: string) => void;
  selectedCustomerId: string | null;
}

export function QuickCustomerSelect({ onCustomerSelect, selectedCustomerId }: QuickCustomerSelectProps) {
  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, city, state")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-10" />;
  }

  return (
    <Select value={selectedCustomerId || undefined} onValueChange={onCustomerSelect}>
      <SelectTrigger>
        <SelectValue placeholder="Search or select customer..." />
      </SelectTrigger>
      <SelectContent>
        {customers?.map((customer) => (
          <SelectItem key={customer.id} value={customer.id}>
            {customer.name}
            {customer.city && ` - ${customer.city}`}
            {customer.state && `, ${customer.state}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}