'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useAuth } from '@/hooks/use-auth';
import { busAPI, type Bus } from '@/lib/bus-api';
import { studentAPI, type Student } from '@/lib/student-api';
import {
  routeAPI,
  type Route,
  type CreateRouteInput,
  type UpdateRouteInput,
} from '@/lib/route-api';
import {
  routeAssignmentAPI,
  type RouteAssignment,
  type CreateRouteAssignmentInput,
} from '@/lib/route-assignment-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Bus as BusIcon,
  Info,
  Loader2,
  Map,
  Pencil,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Trash2,
  Users,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const emptyRouteForm: CreateRouteInput = {
  bus_id: 0,
  name: '',
  start_time: null,
  end_time: null,
};

export function RouteView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busFilter, setBusFilter] = useState<string>(() => {
    const busId = searchParams?.get('busId');
    return busId ?? '';
  });

  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [routeForm, setRouteForm] = useState<CreateRouteInput>(emptyRouteForm);
  const [routeFormError, setRouteFormError] = useState<string | null>(null);
  const [routeSubmitLoading, setRouteSubmitLoading] = useState(false);

  const [deleteRouteId, setDeleteRouteId] = useState<number | null>(null);
  const [deleteRouteLoading, setDeleteRouteLoading] = useState(false);

  const [selectedRouteForAssignments, setSelectedRouteForAssignments] =
    useState<Route | null>(null);
  const [assignments, setAssignments] = useState<RouteAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState<CreateRouteAssignmentInput>({
    route_id: 0,
    student_id: 0,
    pickup_latitude: null,
    pickup_longitude: null,
  });
  const [assignmentSubmitLoading, setAssignmentSubmitLoading] = useState(false);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<number | null>(
    null,
  );
  const [deleteAssignmentLoading, setDeleteAssignmentLoading] = useState(false);

  const [optimizeLoadingRouteId, setOptimizeLoadingRouteId] = useState<
    number | null
  >(null);
  const [optimizeMessage, setOptimizeMessage] = useState<string | null>(null);

  const [directionsLoadingRouteId, setDirectionsLoadingRouteId] = useState<
    number | null
  >(null);
  const [directionsSummary, setDirectionsSummary] = useState<string | null>(
    null,
  );

  const token = accessToken ?? undefined;
  const busFilterId = busFilter ? Number(busFilter) : undefined;

  useEffect(() => {
    setAccessToken(authClient.getAccessToken());
  }, [user]);

  const loadOptions = useCallback(async () => {
    try {
      const [busResult, studentResult] = await Promise.all([
        busAPI.getAll(token, { page: 1, pageSize: 100 }),
        studentAPI.getAll(token),
      ]);
      setBuses(Array.isArray(busResult?.items) ? busResult.items : []);
      setStudents(Array.isArray(studentResult) ? studentResult : []);
    } catch (err) {
      console.error('Failed to load buses/students', err);
    }
  }, [token]);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await routeAPI.getAll(token, {
        bus_id: busFilterId,
      });
      setRoutes(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load routes';
      setError(msg);
      setRoutes([]);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, busFilterId]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    void loadRoutes();
  }, [loadRoutes]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (busFilter) params.set('busId', busFilter);
    const query = params.toString();
    const desired = query ? `/routes?${query}` : '/routes';
    router.replace(desired, { scroll: false });
  }, [busFilter, router]);

  const openCreateRoute = () => {
    setEditingRouteId(null);
    setRouteFormError(null);
    setRouteForm({
      ...emptyRouteForm,
      bus_id: buses[0]?.id ?? 0,
    });
    setRouteDialogOpen(true);
  };

  const openEditRoute = (route: Route) => {
    setEditingRouteId(route.id);
    setRouteFormError(null);
    setRouteForm({
      bus_id: route.bus_id,
      name: route.name,
      start_time: route.start_time ?? null,
      end_time: route.end_time ?? null,
    });
    setRouteDialogOpen(true);
  };

  const closeRouteDialog = () => {
    setRouteDialogOpen(false);
    setEditingRouteId(null);
    setRouteForm(emptyRouteForm);
    setRouteFormError(null);
    setRouteSubmitLoading(false);
  };

  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRouteFormError(null);
    const name = routeForm.name?.trim();
    if (!name) {
      setRouteFormError('Route name is required.');
      return;
    }
    const busId = Number(routeForm.bus_id);
    if (!busId || !buses.some((b) => b.id === busId)) {
      setRouteFormError('Please select a valid bus.');
      return;
    }

    setRouteSubmitLoading(true);
    setError(null);

    try {
      const payload: CreateRouteInput | UpdateRouteInput = {
        bus_id: busId,
        name,
        start_time: routeForm.start_time || null,
        end_time: routeForm.end_time || null,
      };

      if (editingRouteId) {
        const updated = await routeAPI.update(
          editingRouteId,
          payload,
          token,
        );
        setRoutes((prev) =>
          prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
        );
        toast.success('Route updated');
      } else {
        const created = await routeAPI.create(
          payload as CreateRouteInput,
          token,
        );
        setRoutes((prev) => [...prev, created]);
        toast.success('Route created');
      }
      closeRouteDialog();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Route save failed';
      setRouteFormError(msg);
      toast.error(msg);
    } finally {
      setRouteSubmitLoading(false);
    }
  };

  const confirmDeleteRoute = (id: number) => setDeleteRouteId(id);
  const cancelDeleteRoute = () => {
    setDeleteRouteId(null);
    setDeleteRouteLoading(false);
  };

  const handleDeleteRoute = async () => {
    if (deleteRouteId == null) return;
    setDeleteRouteLoading(true);
    setError(null);
    try {
      await routeAPI.delete(deleteRouteId, token);
      setRoutes((prev) => prev.filter((r) => r.id !== deleteRouteId));
      cancelDeleteRoute();
      toast.success('Route deleted');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete route';
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleteRouteLoading(false);
    }
  };

  const openAssignments = async (route: Route) => {
    setSelectedRouteForAssignments(route);
    setAssignments([]);
    setAssignmentsLoading(true);
    setOptimizeMessage(null);
    setDirectionsSummary(null);
    try {
      const data = await routeAssignmentAPI.getByRouteId(route.id, token);
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to load route assignments';
      setError(msg);
      toast.error(msg);
    } finally {
      setAssignmentsLoading(false);
    }
    setAssignmentForm((prev) => ({
      ...prev,
      route_id: route.id,
      student_id: 0,
      pickup_latitude: null,
      pickup_longitude: null,
    }));
  };

  const closeAssignments = () => {
    setSelectedRouteForAssignments(null);
    setAssignments([]);
    setAssignmentSubmitLoading(false);
    setDeleteAssignmentId(null);
    setDeleteAssignmentLoading(false);
  };

  const unassignedStudents = useMemo(() => {
    if (!selectedRouteForAssignments) return [];
    const assignedIds = new Set(
      assignments.map((a) => a.student_id).filter(Boolean),
    );
    return students.filter((s) => !assignedIds.has(s.id));
  }, [assignments, selectedRouteForAssignments, students]);

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteForAssignments) return;
    if (!assignmentForm.student_id) return;

    setAssignmentSubmitLoading(true);
    setError(null);

    try {
      const student = students.find((s) => s.id === assignmentForm.student_id);
      const homeLat =
        student && student.home_latitude != null
          ? Number(student.home_latitude)
          : null;
      const homeLng =
        student && student.home_longitude != null
          ? Number(student.home_longitude)
          : null;

      const payload: CreateRouteAssignmentInput = {
        route_id: selectedRouteForAssignments.id,
        student_id: Number(assignmentForm.student_id),
        pickup_latitude: homeLat,
        pickup_longitude: homeLng,
      };

      const created = await routeAssignmentAPI.create(payload, token);
      setAssignments((prev) => [...prev, created]);
      setAssignmentForm((prev) => ({
        ...prev,
        route_id: selectedRouteForAssignments.id,
        student_id: 0,
        pickup_latitude: null,
        pickup_longitude: null,
      }));
      toast.success('Student added to route');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to assign student';
      setError(msg);
      toast.error(msg);
    } finally {
      setAssignmentSubmitLoading(false);
    }
  };

  const confirmDeleteAssignment = (id: number) => setDeleteAssignmentId(id);
  const cancelDeleteAssignment = () => {
    setDeleteAssignmentId(null);
    setDeleteAssignmentLoading(false);
  };

  const handleDeleteAssignment = async () => {
    if (deleteAssignmentId == null) return;
    setDeleteAssignmentLoading(true);
    setError(null);
    try {
      await routeAssignmentAPI.delete(deleteAssignmentId, token);
      setAssignments((prev) =>
        prev.filter((a) => a.id !== deleteAssignmentId),
      );
      cancelDeleteAssignment();
      toast.success('Student removed from route');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to remove assignment';
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleteAssignmentLoading(false);
    }
  };

  const handleOptimizeRoute = async (route: Route) => {
    setOptimizeLoadingRouteId(route.id);
    setOptimizeMessage(null);
    setError(null);
    try {
      const result = await routeAPI.optimize(
        route.id,
        { zone_radius_km: 0.5 },
        token,
      );
      const updatedRoute = result.route ?? result;
      setRoutes((prev) =>
        prev.map((r) => (r.id === updatedRoute.id ? { ...r, ...updatedRoute } : r)),
      );
      if (selectedRouteForAssignments && selectedRouteForAssignments.id === route.id) {
        const refreshed = await routeAssignmentAPI.getByRouteId(
          route.id,
          token,
        );
        setAssignments(Array.isArray(refreshed) ? refreshed : []);
      }
      setOptimizeMessage('Route optimized successfully. Pickup order updated.');
      toast.success('Route optimized');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to optimize route';
      setError(msg);
      toast.error(msg);
    } finally {
      setOptimizeLoadingRouteId(null);
    }
  };

  const handleGetDirections = async (route: Route) => {
    setDirectionsLoadingRouteId(route.id);
    setDirectionsSummary(null);
    setError(null);
    try {
      const result = await routeAPI.getDirections(route.id, {}, token);
      const summaryText =
        (result as { summary?: string })?.summary ||
        'Directions retrieved. Open the map view to see the route.';
      setDirectionsSummary(summaryText);
      toast.success('Directions loaded');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to fetch directions';
      setError(msg);
      toast.error(msg);
    } finally {
      setDirectionsLoadingRouteId(null);
    }
  };

  const findBusById = (id: number | undefined) =>
    buses.find((b) => b.id === id) ?? null;

  const totalAssignmentsForRoute = (route: Route) =>
    route.routeAssignments?.length ??
    assignments.filter((a) => a.route_id === route.id).length ??
    0;

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/home">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Routes</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <RouteIcon className="size-6 text-primary" aria-hidden />
            Routes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan, optimize, and assign students to bus routes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={busFilter || 'all'}
            onValueChange={(v) => setBusFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger
              id="route-bus-filter"
              className="h-9 w-[140px]"
              aria-label="Filter by bus"
            >
              <SelectValue placeholder="All buses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All buses</SelectItem>
              {buses.map((bus) => (
                <SelectItem key={bus.id} value={String(bus.id)}>
                  {bus.bus_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadRoutes()}
            disabled={loading}
            aria-label="Refresh routes"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4" aria-hidden />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
          <Button size="sm" onClick={openCreateRoute} aria-label="Create new route">
            <Plus className="size-4" aria-hidden />
            <span className="ml-2">New route</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <RouteIcon className="size-5" />
              All Routes
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {loading
                ? 'Loading…'
                : `${routes.length} route${routes.length !== 1 ? 's' : ''} configured`}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className={cn('h-12 w-full', i === 0 && 'rounded-t-lg')}
                />
              ))}
            </div>
          ) : routes.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RouteIcon className="size-6 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>No routes yet</EmptyTitle>
                <EmptyDescription>
                  Create a route linked to a bus, then assign students and use
                  optimize to order pickup stops.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" onClick={openCreateRoute}>
                  <Plus className="size-4" />
                  Create your first route
                </Button>
              </EmptyContent>
            </Empty>
          ) : isMobile ? (
            <div className="space-y-3">
              {routes.map((route) => {
                const bus = route.bus ?? findBusById(route.bus_id);
                const total = totalAssignmentsForRoute(route);
                return (
                  <Card key={route.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{route.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            {bus && (
                              <span className="flex items-center gap-1">
                                <BusIcon className="size-3" />
                                {bus.bus_number}
                              </span>
                            )}
                            {(route.start_time || route.end_time) && (
                              <span>
                                {route.start_time ?? '—'} – {route.end_time ?? '—'}
                              </span>
                            )}
                          </div>
                          <Badge variant="secondary" className="mt-2 font-normal">
                            {total} student{total !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <TooltipProvider>
                          <div className="flex shrink-0 gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openAssignments(route)}
                                  aria-label="Manage assignments"
                                >
                                  <Users className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Manage assignments</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOptimizeRoute(route)}
                                  disabled={
                                    optimizeLoadingRouteId === route.id ||
                                    directionsLoadingRouteId === route.id
                                  }
                                  aria-label="Optimize route"
                                >
                                  {optimizeLoadingRouteId === route.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Wand2 className="size-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Optimize pickup order</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleGetDirections(route)}
                                  disabled={
                                    directionsLoadingRouteId === route.id ||
                                    optimizeLoadingRouteId === route.id
                                  }
                                  aria-label="Get directions"
                                >
                                  {directionsLoadingRouteId === route.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Map className="size-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Get directions</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditRoute(route)}
                                  aria-label="Edit route"
                                >
                                  <Pencil className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit route</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => confirmDeleteRoute(route.id)}
                                  aria-label="Delete route"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete route</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Bus</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.map((route) => {
                  const bus = route.bus ?? findBusById(route.bus_id);
                  const total = totalAssignmentsForRoute(route);
                  return (
                    <TableRow key={route.id}>
                      <TableCell className="font-mono text-muted-foreground">
                        {route.id}
                      </TableCell>
                      <TableCell className="font-medium">{route.name}</TableCell>
                      <TableCell>
                        {bus ? (
                          <div className="flex items-center gap-1 text-sm">
                            <BusIcon className="size-3 text-muted-foreground" />
                            <span>{bus.bus_number}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Unlinked
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {route.start_time || route.end_time ? (
                          <span className="text-sm">
                            {route.start_time ?? '—'} – {route.end_time ?? '—'}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <Users className="size-3 text-muted-foreground" />
                          {total} student{total === 1 ? '' : 's'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openAssignments(route)}
                                  aria-label="Manage assignments"
                                >
                                  <Users className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Manage assignments</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOptimizeRoute(route)}
                                  disabled={
                                    optimizeLoadingRouteId === route.id ||
                                    directionsLoadingRouteId === route.id
                                  }
                                  aria-label="Optimize route"
                                >
                                  {optimizeLoadingRouteId === route.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Wand2 className="size-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Optimize pickup order</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleGetDirections(route)}
                                  disabled={
                                    directionsLoadingRouteId === route.id ||
                                    optimizeLoadingRouteId === route.id
                                  }
                                  aria-label="Get directions"
                                >
                                  {directionsLoadingRouteId === route.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Map className="size-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Get directions</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditRoute(route)}
                                  aria-label="Edit route"
                                >
                                  <Pencil className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit route</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => confirmDeleteRoute(route.id)}
                                  aria-label="Delete route"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete route</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={routeDialogOpen} onOpenChange={(open) => !open && closeRouteDialog()}>
        <DialogContent className="sm:max-w-md" aria-describedby="route-form-desc">
          <DialogHeader>
            <DialogTitle>
              {editingRouteId ? 'Edit route' : 'New route'}
            </DialogTitle>
            <DialogDescription id="route-form-desc">
              Link the route to a bus and define its operating window.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRouteSubmit} className="space-y-4">
            {routeFormError && (
              <Alert variant="destructive">
                <AlertDescription>{routeFormError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="route_name">Route name *</Label>
              <Input
                id="route_name"
                value={routeForm.name}
                onChange={(e) =>
                  setRouteForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Morning run – BUS-001"
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="route_bus">Bus *</Label>
              <Select
                value={routeForm.bus_id ? String(routeForm.bus_id) : ''}
                onValueChange={(v) =>
                  setRouteForm((f) => ({
                    ...f,
                    bus_id: v ? Number(v) : 0,
                  }))
                }
                required
                disabled={buses.length === 0}
              >
                <SelectTrigger id="route_bus" aria-label="Select bus">
                  <SelectValue placeholder="Select bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.map((bus) => (
                    <SelectItem key={bus.id} value={String(bus.id)}>
                      {bus.bus_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {buses.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No buses available. Add a bus first.
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={routeForm.start_time ?? ''}
                  onChange={(e) =>
                    setRouteForm((f) => ({
                      ...f,
                      start_time: e.target.value || null,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={routeForm.end_time ?? ''}
                  onChange={(e) =>
                    setRouteForm((f) => ({
                      ...f,
                      end_time: e.target.value || null,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeRouteDialog}
                disabled={routeSubmitLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={routeSubmitLoading}>
                {routeSubmitLoading && (
                  <Loader2 className="size-4 animate-spin mr-2" />
                )}
                {editingRouteId ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteRouteId != null}
        onOpenChange={(open) => !open && cancelDeleteRoute()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete route?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this route and its assignments. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRouteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoute}
              disabled={deleteRouteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRouteLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!selectedRouteForAssignments}
        onOpenChange={(open) => !open && closeAssignments()}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="assignments-desc">
          <DialogHeader>
            <DialogTitle>
              Manage assignments · {selectedRouteForAssignments?.name}
            </DialogTitle>
            <DialogDescription id="assignments-desc">
              Assign students to this route. Pickup coordinates default to the
              student&apos;s home location. Use &quot;Optimize&quot; on the route to reorder stops.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Users className="size-4" />
                Assigned students
              </h3>
              {assignmentsLoading ? (
                <div className="space-y-2 rounded-md border p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : assignments.length === 0 ? (
                <Empty className="rounded-md border border-dashed py-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Users className="size-6 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No students on this route</EmptyTitle>
                    <EmptyDescription>
                      Add students below. Only unassigned students are listed.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="max-h-60 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Pickup coords</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments
                        .slice()
                        .sort(
                          (a, b) =>
                            (a.pickup_order ?? Number.MAX_SAFE_INTEGER) -
                            (b.pickup_order ?? Number.MAX_SAFE_INTEGER),
                        )
                        .map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">
                              {a.student?.full_name ?? `Student #${a.student_id}`}
                              {a.student?.grade && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({a.student.grade})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {a.pickup_latitude != null &&
                              a.pickup_longitude != null
                                ? `${Number(a.pickup_latitude).toFixed(4)}, ${Number(
                                    a.pickup_longitude,
                                  ).toFixed(4)}`
                                : 'Not set'}
                            </TableCell>
                            <TableCell>
                              {a.pickup_order != null ? (
                                <span className="text-xs">
                                  Stop {Number(a.pickup_order) + 1}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Un-ordered
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmDeleteAssignment(a.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-medium">Add student to route</h3>
              <form onSubmit={handleAssignmentSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="assignment-student">Student *</Label>
                  <Select
                    value={assignmentForm.student_id ? String(assignmentForm.student_id) : ''}
                    onValueChange={(v) =>
                      setAssignmentForm((f) => ({
                        ...f,
                        student_id: v ? Number(v) : 0,
                      }))
                    }
                    disabled={unassignedStudents.length === 0}
                  >
                    <SelectTrigger id="assignment-student" aria-label="Select student to add">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedStudents.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.full_name}
                          {s.grade ? ` (${s.grade})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {unassignedStudents.length === 0
                      ? 'All students are already assigned to this route.'
                      : 'Pickup coordinates default to the student&apos;s home location.'}
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={assignmentSubmitLoading || !assignmentForm.student_id || unassignedStudents.length === 0}
                  >
                    {assignmentSubmitLoading && (
                      <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
                    )}
                    Add to route
                  </Button>
                </DialogFooter>
              </form>
            </div>

            {(optimizeMessage || directionsSummary) && (
              <div className="border-t pt-3 space-y-2 text-xs text-muted-foreground">
                {optimizeMessage && <p>{optimizeMessage}</p>}
                {directionsSummary && (
                  <p className="flex items-center gap-1">
                    <Map className="size-3" />
                    <span>{directionsSummary}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteAssignmentId != null}
        onOpenChange={(open) => !open && cancelDeleteAssignment()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove student from route?</AlertDialogTitle>
            <AlertDialogDescription>
              This student will no longer be part of the selected route. You can
              always re-add them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAssignmentLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssignment}
              disabled={deleteAssignmentLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAssignmentLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-muted/50 bg-muted/30">
        <CardContent className="flex gap-3 p-4">
          <Info className="size-5 shrink-0 text-muted-foreground" />
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">About routes</p>
            <ul className="list-inside list-disc space-y-0.5">
              <li>Create a route per bus and set its time window (start/end).</li>
              <li>Assign students from the list; pickup order can be optimized.</li>
              <li>Use &quot;Optimize&quot; to reorder stops by proximity and reduce drive time.</li>
              <li>Get directions to see the full route on the map.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

