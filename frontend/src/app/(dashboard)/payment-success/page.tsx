"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-semibold">Payment completed</h1>
          <p className="text-sm text-muted-foreground">
            The payment was processed successfully. You can return to Payments to
            view the updated ledger.
          </p>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/payments">Back to Payments</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
