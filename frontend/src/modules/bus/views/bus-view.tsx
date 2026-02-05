'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import {
  busAPI,
  type Bus,
  type CreateBusInput,
  type UpdateBusInput,
} from '@/lib/bus-api';
import { schoolAPI, type School } from '@/lib/school-api';
import { driverAPI, type Driver } from '@/lib/driver-api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bus as BusIcon,
  Building2,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Users,
  Route as RouteIcon,
} from 'lucide-react';

const emptyForm: CreateBusInput = {
  bus_number: '',
  capacity: null,
  driver_id: null,
  school_id: null,
};

interface BusViewProps {
  /** Optional server-fetched buses for initial render */
  initialBuses?: Bus[];
  initialFilters?: {
    search?: string;
    status?: 'all' | 'assigned' | 'unassigned';
    page?: number;
  };
}

function BusCapacityBadge({ capacity }: { capacity?: number | null }) {
  if (capacity == null) {
    return <span className="text-xs text-muted-foreground">–</span>;
  }
  const variant =
    capacity >= 60 ? 'default' : capacity >= 40 ? 'secondary' : 'outline';
  return (
    <Badge variant={variant} className="text-xs font-normal">
      {capacity} seats
    </Badge>
  );
}

function BusDriverSummary({ bus }: { bus: Bus }) {
  if (!bus.driver) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Users className="size-3" />
        Unassigned
      </span>
    );
  }
  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium">{bus.driver.name}</span>
      <span className="text-xs text-muted-foreground">{bus.driver.email}</span>
    </div>
  );
}

export function BusView({ initialBuses = [], initialFilters }: BusViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [buses, setBuses] = useState<Bus[]>(initialBuses);
  const [loading, setLoading] = useState(!initialBuses.length);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialFilters?.search ?? '');
  const [searchInput, setSearchInput] = useState(initialFilters?.search ?? '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>(
    initialFilters?.status ?? 'all'
  );
  const [page, setPage] = useState(initialFilters?.page ?? 1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolFilter, setSchoolFilter] = useState<number | undefined>(undefined);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateBusInput>(emptyForm);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadBuses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items, meta } = await busAPI.getAll(
        authClient.getAccessToken() ?? undefined,
        {
          search,
          status: statusFilter === 'all' ? undefined : statusFilter,
          schoolId: schoolFilter,
          page,
          pageSize,
        }
      );
      setBuses(Array.isArray(items) ? items : []);
      setTotal(meta?.total ?? items.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load buses');
      setBuses([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, schoolFilter, page, pageSize]);

  // Load schools & drivers for selector/filter options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const token = authClient.getAccessToken() ?? undefined;
        const [schoolList, driverList] = await Promise.all([
          schoolAPI.getAll(token),
          driverAPI.getAll(token),
        ]);
        setSchools(schoolList);
        setDrivers(driverList);
      } catch {
        // Ignore for now; selectors will just be limited
      }
    };
    void loadOptions();
  }, []);

  useEffect(() => {
    void loadBuses();
  }, [loadBuses]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: Bus) => {
    setEditingId(row.id);
    setForm({
      bus_number: row.bus_number,
      capacity:
        row.capacity != null ? Number(row.capacity) : emptyForm.capacity,
      driver_id:
        row.driver_id != null ? Number(row.driver_id) : emptyForm.driver_id,
      school_id:
        row.school_id != null ? Number(row.school_id) : emptyForm.school_id,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setSubmitLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    try {
      if (editingId) {
        const payload: UpdateBusInput = {
          bus_number: form.bus_number.trim(),
          capacity:
            form.capacity != null && form.capacity !== 0
              ? Number(form.capacity)
              : null,
          driver_id:
            form.driver_id != null && form.driver_id !== 0
              ? Number(form.driver_id)
              : null,
          school_id:
            form.school_id != null && form.school_id !== 0
              ? Number(form.school_id)
              : null,
        };
        const updated = await busAPI.update(
          editingId,
          payload,
          authClient.getAccessToken() ?? undefined
        );
        // Update the single bus locally instead of full refetch
        setBuses((prev) =>
          prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
        );
      } else {
        const payload: CreateBusInput = {
          bus_number: form.bus_number.trim(),
          capacity:
            form.capacity != null && form.capacity !== 0
              ? Number(form.capacity)
              : null,
          driver_id:
            form.driver_id != null && form.driver_id !== 0
              ? Number(form.driver_id)
              : null,
          school_id:
            form.school_id != null && form.school_id !== 0
              ? Number(form.school_id)
              : null,
        };
        const created = await busAPI.create(
          payload,
          authClient.getAccessToken() ?? undefined
        );
        setBuses((prev) => [...prev, created]);
      }
      closeDialog();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  const confirmDelete = (id: number) => setDeleteId(id);
  const cancelDelete = () => {
    setDeleteId(null);
    setDeleteLoading(false);
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    setDeleteLoading(true);
    setError(null);
    try {
      await busAPI.delete(deleteId, authClient.getAccessToken() ?? undefined);
      // Optimistically update local state instead of full refetch
      setBuses((prev) => prev.filter((b) => b.id !== deleteId));
      cancelDelete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete bus');
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const totalWithDrivers = useMemo(
    () => buses.filter((b) => !!b.driver).length,
    [buses]
  );

  // Keep URL in sync with filters & page (for deep links)
  useEffect(() => {
    const current = searchParams?.toString() ?? '';
    const params = new URLSearchParams(current);
    if (search) params.set('search', search);
    else params.delete('search');

    if (statusFilter !== 'all') params.set('status', statusFilter);
    else params.delete('status');

    if (schoolFilter) params.set('schoolId', String(schoolFilter));
    else params.delete('schoolId');

    if (page > 1) params.set('page', String(page));
    else params.delete('page');

    const query = params.toString();
    if (query === current) return;
    const newUrl = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;
    router.push(newUrl, { scroll: false });
  }, [search, statusFilter, schoolFilter, page, searchParams, router]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BusIcon className="size-6" />
            Fleet
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage school buses, drivers, and capacity.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2">
            <input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
              }}
              placeholder="Search by bus, driver, or school"
              className="h-8 w-48 md:w-64 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <select
              value={schoolFilter ?? ''}
              onChange={(e) =>
                setSchoolFilter(
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className="h-8 rounded-md border bg-background px-2 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All schools</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'assigned' | 'unassigned')
              }
              className="h-8 rounded-md border bg-background px-2 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All buses</option>
              <option value="assigned">With driver</option>
              <option value="unassigned">Without driver</option>
            </select>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(1);
                setSearch(searchInput.trim());
                void loadBuses();
              }}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              <span className="ml-2">Add Bus</span>
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Buses</CardTitle>
          <p className="text-muted-foreground text-sm">
            {total} bus{total !== 1 ? 'es' : ''} in your fleet ·{' '}
            {totalWithDrivers} with drivers assigned
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : total === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <p className="text-muted-foreground">
                No buses yet. Create your first bus to start tracking your fleet.
              </p>
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" />
                <span className="ml-2">Add your first bus</span>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Bus number</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Routes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buses.map((bus) => (
                  <TableRow key={bus.id}>
                    <TableCell className="font-mono text-muted-foreground">
                      {bus.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {bus.bus_number}
                    </TableCell>
                    <TableCell>
                      <BusCapacityBadge capacity={bus.capacity ?? null} />
                    </TableCell>
                    <TableCell>
                      <BusDriverSummary bus={bus} />
                    </TableCell>
                    <TableCell>
                      {bus.school ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="size-3 text-muted-foreground" />
                          <span>{bus.school.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {bus.routes && bus.routes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {bus.routes.slice(0, 3).map((route) => (
                            <Badge
                              key={route.id}
                              variant="outline"
                              className="flex items-center gap-1 text-xs font-normal"
                            >
                              <RouteIcon className="size-3" />
                              {route.name}
                            </Badge>
                          ))}
                          {bus.routes.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{bus.routes.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No routes
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(bus)}
                        aria-label="Edit bus"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(bus.id)}
                        aria-label="Delete bus"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {total > pageSize && (
            <div className="mt-4 flex items-center justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((prev) => Math.max(1, prev - 1));
                      }}
                      aria-disabled={page === 1}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="text-xs text-muted-foreground px-2">
                      Page {page} of {totalPages}
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage((prev) => Math.min(totalPages, prev + 1));
                      }}
                      aria-disabled={page >= totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit bus' : 'Add bus'}
            </DialogTitle>
            <DialogDescription>
              Configure the bus number, capacity, and optional driver/school
              association.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bus_number">Bus number *</Label>
              <Input
                id="bus_number"
                value={form.bus_number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bus_number: e.target.value }))
                }
                placeholder="e.g. BUS-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={form.capacity ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    capacity: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                placeholder="Default 50"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Driver</Label>
                <Select
                  value={form.driver_id ? String(form.driver_id) : 'none'}
                  onValueChange={(val) =>
                    setForm((f) => ({
                      ...f,
                      driver_id: val === 'none' ? null : Number(val),
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name} ({d.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only users with the <code>driver</code> role should be selected here.
                </p>
              </div>
              <div className="space-y-2">
                <Label>School</Label>
                <Select
                  value={form.school_id ? String(form.school_id) : 'none'}
                  onValueChange={(val) =>
                    setForm((f) => ({
                      ...f,
                      school_id: val === 'none' ? null : Number(val),
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Link the bus to a school to appear in school-specific views.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={submitLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading && (
                  <Loader2 className="size-4 animate-spin mr-2" />
                )}
                {editingId ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId != null}
        onOpenChange={(open) => !open && cancelDelete()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bus?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this bus and its assignments. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

