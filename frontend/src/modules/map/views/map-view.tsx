"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
import { geofenceAPI, type Geofence, type GeofenceType } from "@/lib/geofence-api";
import { busAPI, type Bus } from "@/lib/bus-api";
import { schoolAPI, type School } from "@/lib/school-api";
import { studentAPI, type Student } from "@/lib/student-api";
import { GoogleMapLocationPicker } from "@/components/google-map-location-picker";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  CircleDot,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FormMode = "create" | "edit";

interface GeofenceFormState {
  id?: number;
  name: string;
  type: GeofenceType;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
  bus_id: number | null;
  school_id: number | null;
  student_id: number | null;
}

const emptyForm: GeofenceFormState = {
  name: "",
  type: "school",
  latitude: null,
  longitude: null,
  radius_meters: 50,
  bus_id: null,
  school_id: null,
  student_id: null,
};

export function MapView() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [tab, setTab] = useState<"geofences" | "locations">("geofences");

  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [buses, setBuses] = useState<Bus[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [filterType, setFilterType] = useState<GeofenceType | "all">("all");
  const [filterBusId, setFilterBusId] = useState<number | "">("");
  const [filterSchoolId, setFilterSchoolId] = useState<number | "">("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<FormMode>("create");
  const [form, setForm] = useState<GeofenceFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showAdvancedLocation, setShowAdvancedLocation] =
    useState<boolean>(false);

  const getToken = () => authClient.getAccessToken() ?? undefined;

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const token = getToken();
      const [busRes, schoolRes] = await Promise.all([
        busAPI
          .getAll(token, { page: 1, pageSize: 200 })
          .then((r) => r.items)
          .catch(() => []),
        schoolAPI.getAll(token).catch(() => []),
      ]);
      setBuses(Array.isArray(busRes) ? busRes : []);
      setSchools(Array.isArray(schoolRes) ? schoolRes : []);

      // Students are primarily needed to show friendly names when geofences are linked to students.
      // We keep this fetch separate so large student lists don't block the core experience.
      const studentsRes = await studentAPI
        .getAll(token)
        .catch(() => [] as Student[]);
      setStudents(Array.isArray(studentsRes) ? studentsRes : []);
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  const loadGeofences = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const filters: Parameters<typeof geofenceAPI.getAll>[1] = {};
        if (filterType !== "all") filters.type = filterType;
        if (filterBusId !== "" && typeof filterBusId === "number") {
          filters.bus_id = filterBusId;
        }
        if (filterSchoolId !== "" && typeof filterSchoolId === "number") {
          filters.school_id = filterSchoolId;
        }

        const result = await geofenceAPI.getAll(token, filters);
        if (signal?.aborted) return;
        setGeofences(Array.isArray(result) ? result : []);
      } catch (err: unknown) {
        if (signal?.aborted) return;
        setError(
          err instanceof Error ? err.message : "Failed to load geofences"
        );
        setGeofences([]);
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [filterType, filterBusId, filterSchoolId]
  );

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    const controller = new AbortController();
    void loadGeofences(controller.signal);
    return () => controller.abort();
  }, [loadGeofences]);

  const filteredGeofences = useMemo(() => {
    return geofences;
  }, [geofences]);

  const openCreate = () => {
    setDialogMode("create");
    setFormError(null);
    setForm({
      ...emptyForm,
      type: filterType !== "all" ? filterType : "school",
      bus_id:
        filterBusId !== "" && typeof filterBusId === "number"
          ? filterBusId
          : null,
      school_id:
        filterSchoolId !== "" && typeof filterSchoolId === "number"
          ? filterSchoolId
          : null,
    });
    setDialogOpen(true);
  };

  const openEdit = (row: Geofence) => {
    setDialogMode("edit");
    setFormError(null);
    setForm({
      id: row.id,
      name: row.name,
      type: row.type,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
      radius_meters:
        row.radius_meters != null ? Number(row.radius_meters) : 50,
      bus_id: row.bus_id ?? null,
      school_id: row.school_id ?? null,
      student_id: row.student_id ?? null,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogMode("create");
    setForm(emptyForm);
    setFormError(null);
    setSubmitLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    if (!name) {
      setFormError("Name is required.");
      return;
    }

    if (form.latitude == null || form.longitude == null) {
      setFormError(
        "Please pick a location on the map or enter latitude and longitude."
      );
      return;
    }

    if (Number.isNaN(form.latitude) || Number.isNaN(form.longitude)) {
      setFormError("Latitude and longitude must be valid numbers.");
      return;
    }

    if (form.radius_meters <= 0) {
      setFormError("Radius must be a positive number.");
      return;
    }

    setSubmitLoading(true);
    try {
      const token = getToken();
      if (dialogMode === "create") {
        await geofenceAPI.create(
          {
            name,
            type: form.type,
            latitude: form.latitude,
            longitude: form.longitude,
            radius_meters: form.radius_meters,
            bus_id: form.bus_id,
            school_id: form.school_id,
            student_id: form.student_id,
          },
          token
        );
      } else if (dialogMode === "edit" && form.id != null) {
        await geofenceAPI.update(
          form.id,
          {
            name,
            type: form.type,
            latitude: form.latitude,
            longitude: form.longitude,
            radius_meters: form.radius_meters,
            bus_id: form.bus_id,
            school_id: form.school_id,
            student_id: form.student_id,
          },
          token
        );
      }

      closeDialog();
      await loadGeofences();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save geofence";
      setFormError(msg);
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
      await geofenceAPI.delete(deleteId, getToken());
      cancelDelete();
      await loadGeofences();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete geofence";
      setError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getBusLabel = (g: Geofence) => {
    if (g.bus?.bus_number) return g.bus.bus_number;
    if (g.bus_id != null) {
      const b = buses.find((x) => x.id === g.bus_id);
      if (b) return b.bus_number;
    }
    return null;
  };

  const getSchoolLabel = (g: Geofence) => {
    if (g.school?.name) return g.school.name;
    if (g.school_id != null) {
      const s = schools.find((x) => x.id === g.school_id);
      if (s) return s.name;
    }
    return null;
  };

  const getStudentLabel = (g: Geofence) => {
    if (g.student?.full_name) return g.student.full_name;
    if (g.student_id != null) {
      const s = students.find((x) => x.id === g.student_id);
      if (s) return s.full_name;
    }
    return null;
  };

  const mapValue =
    form.latitude != null && form.longitude != null
      ? { lat: form.latitude, lng: form.longitude }
      : null;

  // When type + linked school/student change, derive center if possible and
  // the user hasn't opted into manual overrides.
  useEffect(() => {
    if (showAdvancedLocation) return;

    // Derive from school coordinates when type is school
    if (form.type === "school" && form.school_id) {
      const school = schools.find((s) => s.id === form.school_id);
      const anySchool = school as any;
      if (
        anySchool &&
        anySchool.latitude != null &&
        anySchool.longitude != null
      ) {
        setForm((f) => ({
          ...f,
          latitude: Number(anySchool.latitude),
          longitude: Number(anySchool.longitude),
        }));
        return;
      }
    }

    // Derive from student home coordinates when type is home
    if (form.type === "home" && form.student_id) {
      const student = students.find((s) => s.id === form.student_id) as
        | (Student & {
            home_latitude?: number | string | null;
            home_longitude?: number | string | null;
          })
        | undefined;
      if (
        student &&
        student.home_latitude != null &&
        student.home_longitude != null
      ) {
        setForm((f) => ({
          ...f,
          latitude: Number(student.home_latitude),
          longitude: Number(student.home_longitude),
        }));
      }
    }
  }, [form.type, form.school_id, form.student_id, schools, students, showAdvancedLocation]);

  const derivedLabel = useMemo(() => {
    if (form.type === "school" && form.school_id) {
      const school = schools.find((s) => s.id === form.school_id);
      return school?.name ?? null;
    }
    if (form.type === "home" && form.student_id) {
      const student = students.find((s) => s.id === form.student_id);
      return student?.full_name ?? null;
    }
    return null;
  }, [form.type, form.school_id, form.student_id, schools, students]);

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
            <BreadcrumbPage>Map &amp; Geofences</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <MapPin className="size-6 text-primary" aria-hidden />
            Map &amp; Geofences
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define school and home zones and use them to power attendance,
            notifications, and safety workflows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isAdmin && (
            <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs text-muted-foreground">
              <Shield className="size-3.5" />
              Read-only access
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "geofences" | "locations")}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger
            value="locations"
            className="flex items-center gap-2"
          >
            <MapPin className="size-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger
            value="geofences"
            className="flex items-center gap-2"
          >
            <CircleDot className="size-4" />
            Geofences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geofences" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="space-y-4 pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CircleDot className="size-5" />
                    Geofence zones
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    School and home zones used for automatic boarding/exiting
                    detection.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={filterType}
                    onValueChange={(v) =>
                      setFilterType(v as GeofenceType | "all")
                    }
                  >
                    <SelectTrigger className="w-[9rem]" aria-label="Filter by type">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="school">School</SelectItem>
                      <SelectItem value="home">Home</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={
                      filterBusId === "" ? "all" : String(filterBusId)
                    }
                    onValueChange={(v) =>
                      setFilterBusId(v === "all" ? "" : Number(v))
                    }
                    disabled={optionsLoading}
                  >
                    <SelectTrigger className="w-[9rem]" aria-label="Filter by bus">
                      <SelectValue placeholder="Bus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All buses</SelectItem>
                      {buses.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.bus_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={
                      filterSchoolId === "" ? "all" : String(filterSchoolId)
                    }
                    onValueChange={(v) =>
                      setFilterSchoolId(v === "all" ? "" : Number(v))
                    }
                    disabled={optionsLoading}
                  >
                    <SelectTrigger className="w-[10rem]" aria-label="Filter by school">
                      <SelectValue placeholder="School" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All schools</SelectItem>
                      {schools.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isAdmin && (
                    <Button size="sm" onClick={openCreate}>
                      <Plus className="size-4" />
                      <span className="ml-2">Add geofence</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className={cn("h-10 w-full", i === 0 && "rounded-t-lg")}
                    />
                  ))}
                </div>
              ) : filteredGeofences.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  No geofences found.{" "}
                  {isAdmin
                    ? "Use “Add geofence” to create your first zone."
                    : "Contact an administrator to configure zones."}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Linked to</TableHead>
                        <TableHead>Radius</TableHead>
                        <TableHead>Coordinates</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGeofences.map((g) => {
                        const busLabel = getBusLabel(g);
                        const schoolLabel = getSchoolLabel(g);
                        const studentLabel = getStudentLabel(g);
                        const primaryLink =
                          studentLabel || schoolLabel || busLabel;
                        const secondaryLabel =
                          (studentLabel && (schoolLabel || busLabel)) ||
                          (schoolLabel && busLabel);
                        return (
                          <TableRow key={g.id}>
                            <TableCell className="font-medium">
                              {g.name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  g.type === "school" ? "secondary" : "outline"
                                }
                                className="text-xs font-normal"
                              >
                                {g.type === "school" ? "School" : "Home"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {primaryLink || "—"}
                              {secondaryLabel && (
                                <span className="ml-1 text-xs opacity-80">
                                  (+ linked)
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {(g.radius_meters ?? 50) + " m"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {Number(g.latitude).toFixed(5)},{" "}
                              {Number(g.longitude).toFixed(5)}
                            </TableCell>
                            <TableCell className="text-right">
                              {isAdmin && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEdit(g)}
                                    aria-label={`Edit ${g.name}`}
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => confirmDelete(g.id)}
                                    aria-label={`Delete ${g.name}`}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </>
                              )}
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

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              if (!open) closeDialog();
            }}
          >
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === "create" ? "Add geofence" : "Edit geofence"}
                </DialogTitle>
                <DialogDescription>
                  {dialogMode === "create"
                    ? "Create a new geofence zone that will be used by attendance and safety rules."
                    : "Update the geofence details. Existing attendance records will keep their original links."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <Alert variant="destructive">
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="geofence-name">Name *</Label>
                  <Input
                    id="geofence-name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Main School Gate or Home – Grade 5 route"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="geofence-type">Type *</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, type: v as GeofenceType }))
                    }
                  >
                    <SelectTrigger id="geofence-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="school">School</SelectItem>
                      <SelectItem value="home">Home</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Bus (optional)</Label>
                    <Select
                      value={form.bus_id ? String(form.bus_id) : "none"}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          bus_id: v === "none" ? null : Number(v),
                        }))
                      }
                      disabled={optionsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unlinked" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unlinked</SelectItem>
                        {buses.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.bus_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>School (optional)</Label>
                    <Select
                      value={form.school_id ? String(form.school_id) : "none"}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          school_id: v === "none" ? null : Number(v),
                        }))
                      }
                      disabled={optionsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unlinked" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unlinked</SelectItem>
                        {schools.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Student (optional)</Label>
                  <Select
                    value={form.student_id ? String(form.student_id) : "none"}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        student_id: v === "none" ? null : Number(v),
                      }))
                    }
                    disabled={optionsLoading || students.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unlinked" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unlinked</SelectItem>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {students.length === 0 && !optionsLoading && (
                    <p className="text-xs text-muted-foreground">
                      No students loaded yet. You can link this geofence to a
                      student later from the student or geofence pages.
                    </p>
                  )}
                </div>
                <div className="space-y-3 rounded-md border bg-muted/40 p-3">
                  <div>
                    <p className="text-sm font-medium">Geofence zone &amp; location</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Centers are derived from linked school or student pickup/home
                      coordinates when possible. Adjust the radius for how far around
                      that point the zone should apply. Use the advanced override
                      only when you need a custom center.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-muted-foreground">
                      {form.latitude != null && form.longitude != null ? (
                        <>
                          <span className="font-medium text-foreground">
                            Current center:
                          </span>{" "}
                          {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                          {derivedLabel && <> · derived from {derivedLabel}</>}
                        </>
                      ) : (
                        "Center will be derived from the linked school or student route/home when available."
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvancedLocation((prev) => !prev)}
                    >
                      {showAdvancedLocation
                        ? "Hide advanced"
                        : "Advanced: override center"}
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1.6fr,2fr]">
                    <div className="space-y-2">
                      {showAdvancedLocation && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="geofence-lat">Latitude</Label>
                            <Input
                              id="geofence-lat"
                              type="number"
                              step="any"
                              value={form.latitude ?? ""}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  latitude: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                }))
                              }
                              placeholder="Override derived latitude"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="geofence-lng">Longitude</Label>
                            <Input
                              id="geofence-lng"
                              type="number"
                              step="any"
                              value={form.longitude ?? ""}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  longitude: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                }))
                              }
                              placeholder="Override derived longitude"
                            />
                          </div>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label htmlFor="geofence-radius">Radius (meters)</Label>
                        <Input
                          id="geofence-radius"
                          type="number"
                          min={1}
                          value={form.radius_meters}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              radius_meters: e.target.value
                                ? Number(e.target.value)
                                : 50,
                            }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Typical values: 30–80 m. The backend derives centers from
                          linked school / route pickup coordinates or student home
                          locations when possible and enforces coordinate validity.
                        </p>
                      </div>
                    </div>
                    <div>
                      {showAdvancedLocation ? (
                        <GoogleMapLocationPicker
                          value={mapValue}
                          onChange={(coords) =>
                            setForm((f) => ({
                              ...f,
                              latitude: coords?.lat ?? null,
                              longitude: coords?.lng ?? null,
                            }))
                          }
                        />
                      ) : (
                        <div className="flex h-64 w-full items-center justify-center rounded-md border border-dashed bg-muted text-xs text-muted-foreground">
                          Link a school or student to let the backend derive the
                          center automatically, or use the advanced override to pick
                          a custom point on the map.
                        </div>
                      )}
                    </div>
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
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    {dialogMode === "create" ? "Create" : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={deleteId != null}
            onOpenChange={(open) => {
              if (!open) cancelDelete();
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete geofence?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove this geofence. Attendance history
                  will remain, but new events will no longer reference this
                  zone. This action cannot be undone.
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
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="locations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="size-5" />
                Live locations
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Real-time bus tracking will be surfaced here using the same
                location stream that powers speed and alcohol-test monitoring.
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The backend already records GPS updates for every bus and can
                expose current and historical positions. This UI focuses on
                geofence management; a dedicated live-tracking view can be
                layered on top of the same APIs without further backend work.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

