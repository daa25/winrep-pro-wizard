import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileOrderForm } from "@/components/mobile/MobileOrderForm";
import { QuickCustomerSelect } from "@/components/mobile/QuickCustomerSelect";
import { useState } from "react";

export default function MobileOrderEntry() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Mobile Order Entry</h1>
          <p className="text-muted-foreground mt-1">
            Quick order entry optimized for mobile and in-field use
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Customer</CardTitle>
            <CardDescription>
              Choose a customer to create an order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuickCustomerSelect 
              onCustomerSelect={setSelectedCustomerId}
              selectedCustomerId={selectedCustomerId}
            />
          </CardContent>
        </Card>

        {selectedCustomerId && (
          <Card>
            <CardHeader>
              <CardTitle>Create Order</CardTitle>
              <CardDescription>
                Add products and complete the order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MobileOrderForm customerId={selectedCustomerId} />
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}