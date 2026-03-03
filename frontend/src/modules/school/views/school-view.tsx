"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  schoolAPI,
  type School,
  type CreateSchoolInput,
  type UpdateSchoolInput,
} from "@/lib/school-api";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { GoogleMapLocationPicker } from "@/components/google-map-location-picker";
import { School as SchoolIcon, MapPin, Plus, Pencil, Trash2, Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type SchoolWithLocation = School & {
  latitude?: number | null;
  longitude?: number | null;
};

const emptyForm: CreateSchoolInput = {
  name: "",
  address: "",
  latitude: null,
  longitude: null,
};

export function SchoolView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [schools, setSchools] = useState<SchoolWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialSearch = searchParams?.get("q") ?? "";
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateSchoolInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isAdmin = user?.role === "admin";
  const isMobile = useIsMobile();
  const getToken = () => authClient.getAccessToken() ?? undefined;

  const loadSchools = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await schoolAPI.getAll(getToken());
      // Backend may or may not send coordinates; normalise.
      const withLocation: SchoolWithLocation[] = list.map((s: any) => ({
        ...s,
        latitude:
          s.latitude != null
            ? Number(s.latitude)
            : s.lat != null
            ? Number(s.lat)
            : null,
        longitude:
          s.longitude != null
            ? Number(s.longitude)
            : s.lng != null
            ? Number(s.lng)
            : null,
      }));
      setSchools(withLocation);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load schools"
      );
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchools();
  }, [loadSchools]);

  // Keep URL in sync for deep-linkable search
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    const query = params.toString();
    const base = "/schools";
    const desired = query ? `${base}?${query}` : base;
    const current = `${window.location.pathname}${
      window.location.search || ""
    }`;
    if (current !== desired) {
      router.replace(desired, { scroll: false });
    }
  }, [searchQuery, router]);

  const filteredSchools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter((s) => {
      const name = s.name?.toLowerCase() ?? "";
      const address = (s.address ?? "").toLowerCase();
      return name.includes(q) || address.includes(q);
    });
  }, [schools, searchQuery]);

  const openCreate = () => {
    setEditingId(null);
    setFormError(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: SchoolWithLocation) => {
    setEditingId(row.id);
    setFormError(null);
    setForm({
      name: row.name ?? "",
      address: row.address ?? "",
      latitude:
        row.latitude != null ? Number(row.latitude) : null,
      longitude:
        row.longitude != null ? Number(row.longitude) : null,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setSubmitLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const name = form.name.trim();
    if (!name) {
      setFormError("School name is required.");
      return;
    }

    const payload: CreateSchoolInput = {
      name,
      address: form.address?.trim() || null,
      latitude:
        form.latitude != null ? Number(form.latitude) : null,
      longitude:
        form.longitude != null ? Number(form.longitude) : null,
    };

    setSubmitLoading(true);
    try {
      if (editingId) {
        const updated = await schoolAPI.update(
          editingId,
          payload as UpdateSchoolInput,
          getToken()
        );
        const normalisedUpdated: SchoolWithLocation = {
          ...updated,
          latitude:
            updated.latitude != null ? Number(updated.latitude) : null,
          longitude:
            updated.longitude != null ? Number(updated.longitude) : null,
        };
        setSchools((prev) =>
          prev.map((s) => (s.id === updated.id ? normalisedUpdated : s))
        );
        toast.success("School updated");
      } else {
        const created = await schoolAPI.create(payload, getToken());
        const normalisedCreated: SchoolWithLocation = {
          ...created,
          latitude:
            created.latitude != null ? Number(created.latitude) : null,
          longitude:
            created.longitude != null ? Number(created.longitude) : null,
        };
        setSchools((prev) => [...prev, normalisedCreated]);
        toast.success("School created");
      }
      closeDialog();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      setFormError(msg);
      toast.error(msg);
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
      await schoolAPI.delete(deleteId, getToken());
      setSchools((prev) => prev.filter((s) => s.id !== deleteId));
      toast.success("School deleted");
      cancelDelete();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete school";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

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
            <BreadcrumbPage>Schools</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <SchoolIcon className="size-6 text-primary" aria-hidden />
            Schools
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage school records and their locations. These power bus
            assignments, routes, and reporting.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadSchools()}
            disabled={loading}
            aria-label="Refresh school list"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4" aria-hidden />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={openCreate} aria-label="Add school">
              <Plus className="size-4" aria-hidden />
              <span className="ml-2">Add School</span>
            </Button>
          )}
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
              <MapPin className="size-5" />
              All Schools
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredSchools.length} school
              {filteredSchools.length !== 1 ? "s" : ""}
              {filteredSchools.length !== schools.length
                ? ` (filtered from ${schools.length})`
                : ""}
            </span>
          </div>

          <div className="flex flex-1 items-center gap-2 sm:max-w-xs">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or address…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setSearchQuery(searchInput.trim());
                  }
                }}
                className="pl-9 pr-8"
                aria-label="Search schools"
              />
              {searchInput && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground"
                  onClick={clearSearch}
                  aria-label="Clear search"
                >
                  ×
                </Button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => setSearchQuery(searchInput.trim())}
              aria-label="Apply search"
            >
              <Search className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredSchools.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SchoolIcon className="size-6 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>
                  {searchQuery.trim()
                    ? "No schools match your search"
                    : "No schools yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {searchQuery.trim()
                    ? "Try adjusting your search or clearing it."
                    : "Add your first school to start assigning buses and routes."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {searchQuery.trim() ? (
                  <Button variant="outline" size="sm" onClick={clearSearch}>
                    Clear search
                  </Button>
                ) : (
                  isAdmin && (
                    <Button size="sm" onClick={openCreate}>
                      <Plus className="size-4" />
                      Add School
                    </Button>
                  )
                )}
              </EmptyContent>
            </Empty>
          ) : isMobile ? (
            <div className="space-y-3">
              {filteredSchools.map((row) => (
                <Card
                  key={row.id}
                  className={cn(
                    isAdmin &&
                      "cursor-pointer transition-colors hover:bg-muted/50"
                  )}
                  onClick={() => isAdmin && openEdit(row)}
                >
                  <CardContent className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{row.name}</p>
                      {row.address && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {row.address}
                        </p>
                      )}
                      {row.latitude != null &&
                        row.longitude != null && (
                          <p className="mt-1 text-[11px] text-muted-foreground font-mono">
                            {row.latitude.toFixed(5)},{" "}
                            {row.longitude.toFixed(5)}
                          </p>
                        )}
                    </div>
                    {isAdmin && (
                      <div
                        className="flex shrink-0 gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(row)}
                          aria-label={`Edit ${row.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(row.id)}
                          aria-label={`Delete ${row.name}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[4rem]">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchools.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(
                        isAdmin && "cursor-pointer hover:bg-muted/50"
                      )}
                      onClick={() => isAdmin && openEdit(row)}
                    >
                      <TableCell
                        className="font-mono text-muted-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.name}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {row.address || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {row.latitude != null && row.longitude != null ? (
                          <>
                            {row.latitude.toFixed(5)},{" "}
                            {row.longitude.toFixed(5)}
                          </>
                        ) : (
                          "Not set"
                        )}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(row)}
                              aria-label={`Edit ${row.name}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(row.id)}
                              aria-label={`Delete ${row.name}`}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent
          className="sm:max-w-lg"
          aria-describedby="school-form-desc"
        >
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit School" : "Add School"}
            </DialogTitle>
            <DialogDescription id="school-form-desc">
              {editingId
                ? "Update school details and location."
                : "Create a new school to link buses and routes."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="school-name">School name *</Label>
              <Input
                id="school-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Greenwood International School"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-address">Address</Label>
              <Input
                id="school-address"
                value={form.address ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Street, city, region (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school-lat">Latitude</Label>
                <Input
                  id="school-lat"
                  type="number"
                  step="any"
                  value={
                    form.latitude != null ? form.latitude : ""
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      latitude: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-lng">Longitude</Label>
                <Input
                  id="school-lng"
                  type="number"
                  step="any"
                  value={
                    form.longitude != null ? form.longitude : ""
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      longitude: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>School location on map</Label>
              <GoogleMapLocationPicker
                value={
                  form.latitude != null && form.longitude != null
                    ? {
                        lat: form.latitude,
                        lng: form.longitude,
                      }
                    : null
                }
                onChange={(coords) =>
                  setForm((f) => ({
                    ...f,
                    latitude: coords?.lat ?? null,
                    longitude: coords?.lng ?? null,
                  }))
                }
              />
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
                  <Loader2
                    className="mr-2 size-4 animate-spin"
                    aria-hidden
                  />
                )}
                {editingId ? "Save" : "Create"}
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
            <AlertDialogTitle>Delete school?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this school. This may impact
              buses and routes linked to it and cannot be undone.
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
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

