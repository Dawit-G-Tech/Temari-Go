'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
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
  Bus as BusIcon,
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

const emptyRouteForm: CreateRouteInput = {
  bus_id: 0,
  name: '',
  start_time: null,
  end_time: null,
};

export function RouteView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busFilter, setBusFilter] = useState<number | undefined>(() => {
    const busId = searchParams?.get('busId');
    return busId ? Number(busId) : undefined;
  });

  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [routeForm, setRouteForm] = useState<CreateRouteInput>(emptyRouteForm);
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

  const accessToken = authClient.getAccessToken() ?? undefined;

  const loadOptions = useCallback(async () => {
    try {
      const token = accessToken;
      const [busResult, studentResult] = await Promise.all([
        busAPI.getAll(token, { page: 1, pageSize: 100 }),
        studentAPI.getAll(token),
      ]);
      setBuses(busResult.items);
      setStudents(studentResult);
    } catch (err) {
      console.error('Failed to load buses/students', err);
    }
  }, [accessToken]);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await routeAPI.getAll(accessToken, {
        bus_id: busFilter,
      });
      setRoutes(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load routes');
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, busFilter]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    void loadRoutes();
  }, [loadRoutes]);

  useEffect(() => {
    const current = searchParams?.toString() ?? '';
    const params = new URLSearchParams(current);

    if (busFilter) params.set('busId', String(busFilter));
    else params.delete('busId');

    const query = params.toString();
    if (query === current) return;
    const newUrl = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;
    router.push(newUrl, { scroll: false });
  }, [busFilter, router, searchParams]);

  const openCreateRoute = () => {
    setEditingRouteId(null);
    setRouteForm({
      ...emptyRouteForm,
      bus_id: buses[0]?.id ?? 0,
    });
    setRouteDialogOpen(true);
  };

  const openEditRoute = (route: Route) => {
    setEditingRouteId(route.id);
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
    setRouteSubmitLoading(false);
  };

  const handleRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeForm.bus_id || !routeForm.name.trim()) return;

    setRouteSubmitLoading(true);
    setError(null);

    try {
      const payload: CreateRouteInput | UpdateRouteInput = {
        bus_id: Number(routeForm.bus_id),
        name: routeForm.name.trim(),
        start_time: routeForm.start_time || null,
        end_time: routeForm.end_time || null,
      };

      if (editingRouteId) {
        const updated = await routeAPI.update(
          editingRouteId,
          payload,
          accessToken,
        );
        setRoutes((prev) =>
          prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
        );
      } else {
        const created = await routeAPI.create(
          payload as CreateRouteInput,
          accessToken,
        );
        setRoutes((prev) => [...prev, created]);
      }
      closeRouteDialog();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Route save failed');
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
      await routeAPI.delete(deleteRouteId, accessToken);
      setRoutes((prev) => prev.filter((r) => r.id !== deleteRouteId));
      cancelDeleteRoute();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete route');
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
      const data = await routeAssignmentAPI.getByRouteId(route.id, accessToken);
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load route assignments',
      );
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

      const created = await routeAssignmentAPI.create(payload, accessToken);
      setAssignments((prev) => [...prev, created]);
      setAssignmentForm((prev) => ({
        ...prev,
        route_id: selectedRouteForAssignments.id,
        student_id: 0,
        pickup_latitude: null,
        pickup_longitude: null,
      }));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to assign student',
      );
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
      await routeAssignmentAPI.delete(deleteAssignmentId, accessToken);
      setAssignments((prev) =>
        prev.filter((a) => a.id !== deleteAssignmentId),
      );
      cancelDeleteAssignment();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to remove assignment',
      );
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
        accessToken,
      );
      const updatedRoute = result.route ?? result;
      setRoutes((prev) =>
        prev.map((r) => (r.id === updatedRoute.id ? { ...r, ...updatedRoute } : r)),
      );
      if (selectedRouteForAssignments && selectedRouteForAssignments.id === route.id) {
        // Optimizer may update pickup_order; refetch assignments for fresh ordering
        const refreshed = await routeAssignmentAPI.getByRouteId(
          route.id,
          accessToken,
        );
        setAssignments(Array.isArray(refreshed) ? refreshed : []);
      }
      setOptimizeMessage('Route optimized successfully. Pickup order updated.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to optimize route');
    } finally {
      setOptimizeLoadingRouteId(null);
    }
  };

  const handleGetDirections = async (route: Route) => {
    setDirectionsLoadingRouteId(route.id);
    setDirectionsSummary(null);
    setError(null);
    try {
      const result = await routeAPI.getDirections(route.id, {}, accessToken);
      const summaryText =
        (result as any).summary ||
        'Directions retrieved. Open the native map view in your mobile app to see the polyline.';
      setDirectionsSummary(summaryText);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch directions',
      );
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <RouteIcon className="size-6" />
            Routes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Plan, optimize, and assign students to bus routes.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2">
            <select
              value={busFilter ?? ''}
              onChange={(e) =>
                setBusFilter(e.target.value ? Number(e.target.value) : undefined)
              }
              className="h-8 rounded-md border bg-background px-2 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All buses</option>
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id}>
                  {bus.bus_number}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadRoutes()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
            <Button size="sm" onClick={openCreateRoute}>
              <Plus className="size-4" />
              <span className="ml-2">New route</span>
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
          <CardTitle>Routes</CardTitle>
          <p className="text-muted-foreground text-sm">
            {routes.length} route{routes.length !== 1 ? 's' : ''} configured
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : routes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
              <p>No routes yet. Create a route to start assigning students.</p>
              <Button size="sm" onClick={openCreateRoute}>
                <Plus className="size-4" />
                <span className="ml-2">Create your first route</span>
              </Button>
            </div>
          ) : (
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openAssignments(route)}
                            title="Manage assignments"
                          >
                            <Users className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOptimizeRoute(route)}
                            disabled={
                              optimizeLoadingRouteId === route.id ||
                              directionsLoadingRouteId === route.id
                            }
                            title="Optimize route"
                          >
                            {optimizeLoadingRouteId === route.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Wand2 className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleGetDirections(route)}
                            disabled={
                              directionsLoadingRouteId === route.id ||
                              optimizeLoadingRouteId === route.id
                            }
                            title="Get directions summary"
                          >
                            {directionsLoadingRouteId === route.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Map className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditRoute(route)}
                            aria-label="Edit route"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDeleteRoute(route.id)}
                            aria-label="Delete route"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRouteId ? 'Edit route' : 'New route'}
            </DialogTitle>
            <DialogDescription>
              Link the route to a bus and define its operating window.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRouteSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="route_name">Route name *</Label>
              <Input
                id="route_name"
                value={routeForm.name}
                onChange={(e) =>
                  setRouteForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Morning run for BUS-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Bus *</Label>
              <select
                value={routeForm.bus_id || ''}
                onChange={(e) =>
                  setRouteForm((f) => ({
                    ...f,
                    bus_id: e.target.value ? Number(e.target.value) : 0,
                  }))
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="">Select bus</option>
                {buses.map((bus) => (
                  <option key={bus.id} value={bus.id}>
                    {bus.bus_number}
                  </option>
                ))}
              </select>
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
                <Loader2 className="size-4 animate-spin" />
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage assignments · {selectedRouteForAssignments?.name}
            </DialogTitle>
            <DialogDescription>
              Assign students to this route and configure their pickup
              locations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Users className="size-4" />
                Assigned students
              </h3>
              {assignmentsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No students assigned yet. Use the form below to add the first
                  student.
                </p>
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

            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-medium">Add student to route</h3>
              <form onSubmit={handleAssignmentSubmit} className="space-y-3">
                <div className="space-y-2">
                  <Label>Student *</Label>
                  <select
                    value={assignmentForm.student_id || ''}
                    onChange={(e) =>
                      setAssignmentForm((f) => ({
                        ...f,
                        student_id: e.target.value ? Number(e.target.value) : 0,
                      }))
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Select student</option>
                    {unassignedStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                        {s.grade ? ` (${s.grade})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Only students not already assigned to this route are listed.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pickup coordinates will default to the student&apos;s saved home
                  location if available.
                </p>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={assignmentSubmitLoading || !assignmentForm.student_id}
                  >
                    {assignmentSubmitLoading && (
                      <Loader2 className="size-4 animate-spin mr-2" />
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
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

