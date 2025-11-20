import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Minus, Trash2 } from "lucide-react";

interface MobileOrderFormProps {
  customerId: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export function MobileOrderForm({ customerId }: MobileOrderFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");

  const { data: customer } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("hidden", false)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user || !customer) throw new Error("Missing user or customer");

      const totalAmount = orderItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          customer_name: customer.name,
          customer_email: customer.email || "",
          total_amount: totalAmount,
          notes: notes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const items = orderItems.map((item) => ({
        order_id: order.id,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(items);

      if (itemsError) throw itemsError;

      return order;
    },
    onSuccess: () => {
      toast.success("Order created successfully");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setOrderItems([]);
      setNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const addProduct = (productId: string) => {
    const product = products?.find((p) => p.id === productId);
    if (!product) return;

    const existing = orderItems.find((item) => item.productId === productId);
    if (existing) {
      setOrderItems(
        orderItems.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    setOrderItems(
      orderItems
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + change) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setOrderItems(orderItems.filter((item) => item.productId !== productId));
  };

  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <Label>Add Products</Label>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {products?.map((product) => (
            <Button
              key={product.id}
              variant="outline"
              className="justify-start"
              onClick={() => addProduct(product.id)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {product.name} - ${product.price.toFixed(2)}
            </Button>
          ))}
        </div>
      </div>

      {orderItems.length > 0 && (
        <div className="space-y-3">
          <Label>Order Items</Label>
          {orderItems.map((item) => (
            <Card key={item.productId} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{item.productName}</div>
                  <div className="text-sm text-muted-foreground">
                    ${item.unitPrice.toFixed(2)} each
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => updateQuantity(item.productId, -1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-semibold">
                    {item.quantity}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => updateQuantity(item.productId, 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => removeItem(item.productId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-right mt-2 font-semibold">
                ${(item.quantity * item.unitPrice).toFixed(2)}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Order Notes</Label>
        <Textarea
          id="notes"
          placeholder="Any special instructions..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {orderItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={() => createOrderMutation.mutate()}
            disabled={createOrderMutation.isPending}
          >
            {createOrderMutation.isPending ? "Creating Order..." : "Create Order"}
          </Button>
        </div>
      )}
    </div>
  );
}