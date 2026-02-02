"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, CreditCard } from "lucide-react";

export default function BillingPage() {
  const [tab, setTab] = useState("payments");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Payments and subscription plans.
        </p>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Wallet className="size-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="size-4" />
            Plans & Billing
          </TabsTrigger>
        </TabsList>
        <TabsContent value="payments" className="mt-6">
          <p className="text-muted-foreground">
            View and manage payment records. (Content coming soon.)
          </p>
        </TabsContent>
        <TabsContent value="plans" className="mt-6">
          <p className="text-muted-foreground">
            Manage subscription plans and billing. (Content coming soon.)
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
