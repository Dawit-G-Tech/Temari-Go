 "use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
import { paymentAPI, type Payment } from "@/lib/payment-api";
import { studentAPI, type Student } from "@/lib/student-api";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, CreditCard, Shield } from "lucide-react";

function formatDate(val: string): string {
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function BillingPage() {
  const { user } = useAuth();

  const [tab, setTab] = useState("payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | "all">(
    "all"
  );

  const [creating, setCreating] = useState(false);

  const getToken = () => authClient.getAccessToken() ?? undefined;

  useEffect(() => {
    // For the admin console, student-scoped billing will be wired to
    // consolidated payment reporting endpoints rather than per-parent views.
    // This hook remains as a placeholder for when we add admin-level filters
    // by student in the ledger.
    void students;
  }, [students]);

  useEffect(() => {
    // Admin-focused payment ledger will later use an admin payments endpoint.
    // For now, leave payments empty and show explanatory copy.
    void user;
  }, [user]);

  const filteredPayments = useMemo(() => {
    if (selectedStudentId === "all") return payments;
    return payments.filter((p) => p.student_id === selectedStudentId);
  }, [payments, selectedStudentId]);

  const handleCreatePayment = async () => {
    // In the admin console we don't initiate parent payments directly.
    // This handler is a placeholder hook for future manual payment creation
    // workflows if needed.
    setCreating(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Billing (Admin)</h1>
          <p className="text-muted-foreground mt-1">
            Monitor transport payments and billing configuration across the
            system.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs text-muted-foreground">
          <Shield className="size-3.5" />
          Admin console — parents use the mobile app for payments.
        </div>
      </div>

      {paymentsError && (
        <Alert variant="destructive">
          <AlertDescription>{paymentsError}</AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Wallet className="size-4" />
            Payment ledger
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="size-4" />
            Plans &amp; Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Payment history</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Historical payment records for all students and routes.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Filters and exports can be added here as reporting needs grow.
              </div>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : filteredPayments.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No payments found yet. Once guardians start paying through the
                  app, records will appear here for reconciliation and audits.
                </p>
              ) : (
                <div className="max-h-[420px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>When</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs">
                            {p.student?.full_name ?? `#${p.student_id}`}
                          </TableCell>
                          <TableCell className="text-xs">
                            {p.amount.toFixed(2)} ETB
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge
                              variant={
                                p.status === "completed"
                                  ? "outline"
                                  : p.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                              }
                              className="text-[10px] font-normal"
                            >
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.payment_method ?? "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {formatDate(p.timestamp)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="size-4" />
                Plans &amp; billing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                placeholder, where admin can later add plan selection and invoicing details.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

