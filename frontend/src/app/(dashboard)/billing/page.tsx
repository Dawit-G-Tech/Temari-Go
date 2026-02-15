"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
import { paymentAPI, type Payment } from "@/lib/payment-api";
import { invoiceAPI, type Invoice } from "@/lib/invoice-api";
import { studentAPI, type Student } from "@/lib/student-api";
import { userAPI, type Parent } from "@/lib/user-api";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wallet, CreditCard, Shield, Plus, MoreHorizontal, Loader2, RefreshCw, FileText, Send } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

function formatDate(val: string): string {
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatDueDate(val: string): string {
  if (!val) return "—";
  const d = new Date(val + "T12:00:00");
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleDateString();
}

const STATUS_OPTIONS: Array<"pending" | "completed" | "failed"> = [
  "pending",
  "completed",
  "failed",
];

const BILLING_PAGE_SIZE = 50;

export default function BillingPage() {
  const { user } = useAuth();
  const getToken = () => authClient.getAccessToken() ?? undefined;

  const [tab, setTab] = useState("payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [bulkPeriodLabel, setBulkPeriodLabel] = useState("");
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkSelectedStudentIds, setBulkSelectedStudentIds] = useState<Set<number>>(new Set());
  const [bulkNotifyParent, setBulkNotifyParent] = useState(true);
  const [bulkSkipDuplicates, setBulkSkipDuplicates] = useState(true);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [allStudentsForBulk, setAllStudentsForBulk] = useState<Student[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const options: Parameters<typeof paymentAPI.listAllForAdmin>[0] = {
        accessToken: getToken(),
        limit: BILLING_PAGE_SIZE,
      };
      if (statusFilter !== "all") {
        options.status = statusFilter as "pending" | "completed" | "failed";
      }
      if (startDate) options.startDate = startDate;
      if (endDate) options.endDate = endDate;
      const result = await paymentAPI.listAllForAdmin(options);
      setPayments(result.payments);
    } catch (e) {
      setPaymentsError(e instanceof Error ? e.message : "Failed to load payments");
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, [statusFilter, startDate, endDate]);

  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const opts: Parameters<typeof invoiceAPI.list>[0] = {
        accessToken: getToken(),
        limit: BILLING_PAGE_SIZE,
      };
      if (invoiceStatusFilter !== "all") opts.status = invoiceStatusFilter as Invoice["status"];
      const result = await invoiceAPI.list(opts);
      setInvoices(result.invoices);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load invoices");
      setInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  }, [invoiceStatusFilter]);

  useEffect(() => {
    void user;
    fetchPayments();
  }, [fetchPayments, user]);

  useEffect(() => {
    if (tab === "invoices") fetchInvoices();
  }, [tab, fetchInvoices]);

  const handleCreatePayment = async () => {
    const parentId = selectedParentId;
    const studentId = selectedStudentId;
    if (!parentId || !studentId || !amount.trim() || !email.trim()) {
      toast.error("Please select parent, student, amount, and email.");
      return;
    }
    const numAmount = parseFloat(amount);
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    setCreating(true);
    try {
      const { checkout_url } = await paymentAPI.initializePayment({
        parent_id: parentId,
        student_id: studentId,
        amount: numAmount,
        email: email.trim(),
        full_name: fullName.trim() || undefined,
        currency: "ETB",
        accessToken: getToken(),
      });
      toast.success("Redirecting to payment gateway…");
      window.location.href = checkout_url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start payment");
      setCreating(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedParentId(null);
    setSelectedStudentId(null);
    setAmount("");
    setEmail("");
    setFullName("");
    setStudents([]);
    setCreateOpen(true);
  };

  const openCreateDialogFromInvoice = (invoice: Invoice) => {
    setSelectedParentId(invoice.parent_id);
    setSelectedStudentId(invoice.student_id);
    setAmount(String(Number(invoice.amount)));
    if (invoice.parent) {
      setEmail(invoice.parent.email);
      setFullName(invoice.parent.name.trim());
      setParents([invoice.parent]);
    } else {
      setEmail("");
      setFullName("");
    }
    setStudents(
      invoice.student
        ? [{ ...invoice.student, parent_id: invoice.parent_id } as Student]
        : []
    );
    setCreateOpen(true);
  };

  const handleBulkCreate = async () => {
    if (!bulkPeriodLabel.trim() || !bulkDueDate || !bulkAmount.trim()) {
      toast.error("Enter period label, due date, and amount.");
      return;
    }
    const numAmount = parseFloat(bulkAmount);
    if (Number.isNaN(numAmount) || numAmount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (bulkSelectedStudentIds.size === 0) {
      toast.error("Select at least one student.");
      return;
    }
    const items = allStudentsForBulk
      .filter((s) => bulkSelectedStudentIds.has(s.id))
      .map((s) => ({
        parent_id: s.parent_id,
        student_id: s.id,
        amount: numAmount,
        due_date: bulkDueDate,
        period_label: bulkPeriodLabel.trim(),
      }));
    setBulkCreating(true);
    try {
      const result = await invoiceAPI.createBulk(items, {
        notifyParent: bulkNotifyParent,
        skipDuplicates: bulkSkipDuplicates,
        accessToken: getToken(),
      });
      toast.success(`Created ${result.created} invoice(s).${result.errors.length ? ` ${result.errors.length} errors.` : ""}`);
      if (result.errors.length) result.errors.forEach((e) => toast.error(e));
      setBulkOpen(false);
      setBulkPeriodLabel("");
      setBulkDueDate("");
      setBulkAmount("");
      setBulkSelectedStudentIds(new Set());
      fetchInvoices();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create invoices");
    } finally {
      setBulkCreating(false);
    }
  };

  useEffect(() => {
    if (!createOpen) return;
    userAPI.getParents(getToken()).then(setParents).catch(() => setParents([]));
  }, [createOpen]);

  useEffect(() => {
    if (!bulkOpen) return;
    studentAPI.getAll(getToken()).then(setAllStudentsForBulk).catch(() => setAllStudentsForBulk([]));
  }, [bulkOpen]);

  useEffect(() => {
    if (!selectedParentId) {
      setStudents([]);
      setSelectedStudentId(null);
      return;
    }
    studentAPI
      .getAll(getToken(), { parentId: selectedParentId })
      .then((list) => {
        setStudents(list);
        setSelectedStudentId(null);
      })
      .catch(() => setStudents([]));
  }, [selectedParentId]);

  const onSelectParent = (parentId: string) => {
    const id = parentId === "" ? null : parseInt(parentId, 10);
    setSelectedParentId(id);
    if (id) {
      const p = parents.find((x) => x.id === id);
      if (p) {
        setEmail(p.email);
        setFullName(p.name.trim());
      }
    }
  };

  const handleUpdateStatus = async (
    paymentId: number,
    status: "pending" | "completed" | "failed"
  ) => {
    setUpdatingStatusId(paymentId);
    try {
      await paymentAPI.updatePaymentStatus(paymentId, status, getToken());
      toast.success("Status updated");
      await fetchPayments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleVerify = async (paymentId: number) => {
    setVerifyingId(paymentId);
    try {
      await paymentAPI.verifyPayment(paymentId, getToken());
      toast.success("Payment verified with gateway");
      await fetchPayments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Billing (Admin)</h1>
          <p className="text-muted-foreground mt-1">
            Create payments and monitor the payment ledger. Parents complete
            payment on the Chapa gateway.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-md border px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
            <Shield className="size-3.5" />
            Admin only
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="size-4" />
            Create payment
          </Button>
        </div>
      </div>

      {paymentsError && (
        <Alert variant="destructive">
          <AlertDescription>{paymentsError}</AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Wallet className="size-4" />
            Payment ledger
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="size-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <CreditCard className="size-4" />
            Plans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Payment history</CardTitle>
                <p className="text-xs text-muted-foreground">
                  All payments across parents and students. Filter and refresh as
                  needed.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  className="h-8 w-[140px] text-xs"
                  placeholder="From"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  className="h-8 w-[140px] text-xs"
                  placeholder="To"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={fetchPayments}
                  disabled={paymentsLoading}
                >
                  <RefreshCw className={`size-3.5 ${paymentsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : payments.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No payments found. Use &quot;Create payment&quot; to send a
                  parent to the Chapa checkout, or wait for payments from the
                  app.
                </p>
              ) : (
                <>
                <p className="text-xs text-muted-foreground mb-2">
                  Showing latest {payments.length}. Use filters and Refresh for more.
                </p>
                <div className="max-h-[420px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Parent</TableHead>
                        <TableHead className="text-xs">Student</TableHead>
                        <TableHead className="text-xs">Amount</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Method</TableHead>
                        <TableHead className="text-xs">When</TableHead>
                        <TableHead className="w-[70px] text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs">
                            {p.parent
                              ? `${p.parent.name} (${p.parent.email})`
                              : `#${p.parent_id}`}
                          </TableCell>
                          <TableCell className="text-xs">
                            {p.student?.full_name ?? `#${p.student_id}`}
                          </TableCell>
                          <TableCell className="text-xs">
                            {Number(p.amount).toFixed(2)} ETB
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
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={
                                    updatingStatusId === p.id ||
                                    verifyingId === p.id
                                  }
                                >
                                  {updatingStatusId === p.id ||
                                  verifyingId === p.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="size-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {p.status === "pending" && (
                                  <DropdownMenuItem
                                    onClick={() => handleVerify(p.id)}
                                  >
                                    Verify with Chapa
                                  </DropdownMenuItem>
                                )}
                                {STATUS_OPTIONS.map((status) => (
                                  <DropdownMenuItem
                                    key={status}
                                    onClick={() =>
                                      handleUpdateStatus(p.id, status)
                                    }
                                    disabled={p.status === status}
                                  >
                                    Set to {status}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Bulk send invoices</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Create many invoices at once. Parents see due dates and can pay in the app or via link.
                </p>
              </div>
              <Button onClick={() => setBulkOpen(true)} className="gap-2">
                <Send className="size-4" />
                Bulk create invoices
              </Button>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Invoice ledger</CardTitle>
                <p className="text-xs text-muted-foreground">
                  All invoices with due dates. Use &quot;Pay&quot; to open Chapa checkout for a pending invoice.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={fetchInvoices} disabled={invoicesLoading}>
                  <RefreshCw className={`size-3.5 ${invoicesLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No invoices yet. Use &quot;Bulk create invoices&quot; to send invoices to parents. They can see due dates in the app.
                </p>
              ) : (
                <>
                <p className="text-xs text-muted-foreground mb-2">
                  Showing latest {invoices.length}. Use filters and Refresh for more.
                </p>
                <div className="max-h-[420px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Parent</TableHead>
                        <TableHead className="text-xs">Student</TableHead>
                        <TableHead className="text-xs">Amount</TableHead>
                        <TableHead className="text-xs">Due date</TableHead>
                        <TableHead className="text-xs">Period</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="w-[80px] text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="text-xs">
                            {inv.parent ? `${inv.parent.name} (${inv.parent.email})` : `#${inv.parent_id}`}
                          </TableCell>
                          <TableCell className="text-xs">
                            {inv.student?.full_name ?? `#${inv.student_id}`}
                          </TableCell>
                          <TableCell className="text-xs">
                            {Number(inv.amount).toFixed(2)} ETB
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDueDate(inv.due_date)}
                          </TableCell>
                          <TableCell className="text-xs">{inv.period_label}</TableCell>
                          <TableCell className="text-xs">
                            <Badge
                              variant={
                                inv.status === "paid"
                                  ? "outline"
                                  : inv.status === "overdue"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-[10px] font-normal"
                            >
                              {inv.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(inv.status === "pending" || inv.status === "overdue") && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => openCreateDialogFromInvoice(inv)}
                              >
                                Pay
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                </>
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
                Placeholder for plan selection and invoicing configuration.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Create payment</DialogTitle>
            <DialogDescription>
              Select parent and student, then enter amount and parent contact.
              You will be redirected to Chapa to complete the payment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Parent</Label>
              <Select
                value={selectedParentId?.toString() ?? ""}
                onValueChange={onSelectParent}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent" />
                </SelectTrigger>
                <SelectContent>
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} — {p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Student</Label>
              <Select
                value={selectedStudentId?.toString() ?? ""}
                onValueChange={(v) =>
                  setSelectedStudentId(v ? parseInt(v, 10) : null)
                }
                disabled={!selectedParentId || students.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.full_name}
                      {s.grade ? ` (${s.grade})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Amount (ETB)</Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Email (for Chapa)</Label>
              <Input
                type="email"
                placeholder="parent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Full name (for Chapa)</Label>
              <Input
                placeholder="Parent or payer full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePayment} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Starting…
                </>
              ) : (
                "Continue to payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Bulk create invoices</DialogTitle>
            <DialogDescription>
              Set one amount and due date for all selected students. Parents will see due dates and can pay in the app.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Period label (e.g. January 2025)</Label>
              <Input
                placeholder="January 2025 Transport"
                value={bulkPeriodLabel}
                onChange={(e) => setBulkPeriodLabel(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={bulkDueDate}
                  onChange={(e) => setBulkDueDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Amount (ETB)</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={bulkAmount}
                  onChange={(e) => setBulkAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Select students</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setBulkSelectedStudentIds(new Set(allStudentsForBulk.map((s) => s.id)))
                    }
                  >
                    Select all
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setBulkSelectedStudentIds(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="max-h-[220px] overflow-auto rounded-md border p-2 space-y-1">
                {allStudentsForBulk.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Loading students…</p>
                ) : (
                  allStudentsForBulk.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={bulkSelectedStudentIds.has(s.id)}
                        onCheckedChange={(checked) => {
                          setBulkSelectedStudentIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(s.id);
                            else next.delete(s.id);
                            return next;
                          });
                        }}
                      />
                      <span>{s.full_name}{s.grade ? ` (${s.grade})` : ""}</span>
                      <span className="text-muted-foreground text-xs">Parent #{s.parent_id}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {bulkSelectedStudentIds.size} student(s) selected
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={bulkNotifyParent}
                onCheckedChange={(c) => setBulkNotifyParent(!!c)}
              />
              <span className="text-sm">Notify parents (push notification when invoice is created)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={bulkSkipDuplicates}
                onCheckedChange={(c) => setBulkSkipDuplicates(!!c)}
              />
              <span className="text-sm">Skip duplicates (same student + period already invoiced)</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkCreating}>
              Cancel
            </Button>
            <Button onClick={handleBulkCreate} disabled={bulkCreating}>
              {bulkCreating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating…
                </>
              ) : (
                `Create ${bulkSelectedStudentIds.size || 0} invoice(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
