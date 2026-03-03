"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/use-auth";
import {
  studentAPI,
  type Student,
  type CreateStudentInput,
  type UpdateStudentInput,
  type StudentListFilters,
} from "@/lib/student-api";
import { userAPI, type Parent } from "@/lib/user-api";
import { busAPI, type Bus } from "@/lib/bus-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
  Filter,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { GoogleMapLocationPicker } from "@/components/google-map-location-picker";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const emptyForm: CreateStudentInput = {
  full_name: "",
  grade: "",
  parent_id: 0,
  home_latitude: null,
  home_longitude: null,
};

const COMMON_GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export function StudentView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [parents, setParents] = useState<Parent[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterGrade, setFilterGrade] = useState<string>(() => searchParams?.get("grade") ?? "");
  const [filterParentId, setFilterParentId] = useState<number | "">(() => {
    const p = searchParams?.get("parentId");
    if (p == null || p === "") return "";
    const n = Number(p);
    return Number.isNaN(n) ? "" : n;
  });
  const [filterBusId, setFilterBusId] = useState<number | "">(() => {
    const b = searchParams?.get("busId");
    if (b == null || b === "") return "";
    const n = Number(b);
    return Number.isNaN(n) ? "" : n;
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateStudentInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [sortBy, setSortBy] = useState<"name" | "grade">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const isAdmin = user?.role === "admin";
  const isMobile = useIsMobile();
  const getToken = () => authClient.getAccessToken() ?? undefined;

  const apiFilters = useMemo((): StudentListFilters => {
    const f: StudentListFilters = {};
    if (filterGrade) f.grade = filterGrade;
    if (filterParentId !== "" && typeof filterParentId === "number") f.parentId = filterParentId;
    if (filterBusId !== "" && typeof filterBusId === "number") f.busId = filterBusId;
    return f;
  }, [filterGrade, filterParentId, filterBusId]);

  const loadOptions = useCallback(async () => {
    if (!isAdmin) return;
    setOptionsLoading(true);
    try {
      const token = getToken();
      const [parentsRes, busesRes] = await Promise.all([
        userAPI.getParents(token),
        busAPI.getAll(token, { page: 1, pageSize: 200 }).then((r) => r.items),
      ]);
      setParents(Array.isArray(parentsRes) ? parentsRes : []);
      setBuses(Array.isArray(busesRes) ? busesRes : []);
    } catch (err) {
      console.error("Failed to load parents/buses", err);
    } finally {
      setOptionsLoading(false);
    }
  }, [isAdmin]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentAPI.getAll(getToken(), apiFilters);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load students");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [apiFilters]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterGrade) params.set("grade", filterGrade);
    if (filterParentId !== "" && typeof filterParentId === "number")
      params.set("parentId", String(filterParentId));
    if (filterBusId !== "" && typeof filterBusId === "number")
      params.set("busId", String(filterBusId));
    const query = params.toString();
    const newUrl = query ? `/student?${query}` : "/student";
    const current = `${window.location.pathname}${window.location.search || ""}`;
    const desired = query ? `/student?${query}` : "/student";
    if (current !== desired) {
      router.replace(desired, { scroll: false });
    }
  }, [filterGrade, filterParentId, filterBusId, router]);

  const parentMap = useMemo(() => {
    const m: Record<number, string> = {};
    parents.forEach((p) => {
      m[p.id] = p.name || p.email;
    });
    return m;
  }, [parents]);

  const filteredStudents = useMemo(() => {
    let list = students;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((s) => s.full_name.toLowerCase().includes(q));
    }
    const sorted = [...list].sort((a, b) => {
      if (sortBy === "name") {
        const cmp = (a.full_name ?? "").localeCompare(b.full_name ?? "");
        return sortDir === "asc" ? cmp : -cmp;
      }
      const ga = a.grade ?? "";
      const gb = b.grade ?? "";
      const cmp = ga.localeCompare(gb, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [students, searchQuery, sortBy, sortDir]);

  const toggleSort = (column: "name" | "grade") => {
    if (sortBy === column) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormError(null);
    setForm({
      ...emptyForm,
      parent_id: parents[0]?.id ?? 0,
    });
    setDialogOpen(true);
  };

  const openEdit = (row: Student) => {
    setEditingId(row.id);
    setFormError(null);
    setForm({
      full_name: row.full_name,
      grade: row.grade ?? "",
      parent_id: row.parent_id,
      home_latitude:
        row.home_latitude != null ? Number(row.home_latitude) : null,
      home_longitude:
        row.home_longitude != null ? Number(row.home_longitude) : null,
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
    const name = form.full_name?.trim();
    if (!name) {
      setFormError("Full name is required.");
      return;
    }
    const parentId = Number(form.parent_id);
    if (!parentId && isAdmin) {
      setFormError("Please select a parent.");
      return;
    }
    if (isAdmin && parents.length && !parents.some((p) => p.id === parentId)) {
      setFormError("Selected parent is not valid.");
      return;
    }
    setSubmitLoading(true);
    try {
      const payload = {
        full_name: name,
        grade: form.grade?.trim() || null,
        parent_id: parentId,
        home_latitude:
          form.home_latitude != null ? Number(form.home_latitude) : null,
        home_longitude:
          form.home_longitude != null ? Number(form.home_longitude) : null,
      };
      if (editingId) {
        await studentAPI.update(editingId, payload, getToken());
        toast.success("Student updated");
      } else {
        await studentAPI.create(payload, getToken());
        toast.success("Student created");
      }
      closeDialog();
      await loadStudents();
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
      await studentAPI.delete(deleteId, getToken());
      toast.success("Student deleted");
      cancelDelete();
      await loadStudents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete student";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterGrade("");
    setFilterParentId("");
    setFilterBusId("");
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    filterGrade !== "" ||
    filterParentId !== "" ||
    filterBusId !== "";

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
            <BreadcrumbPage>Students</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <GraduationCap className="size-6 text-primary" aria-hidden />
            Students
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Manage student records, assign parents, and set home locations."
              : "View your registered students."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadStudents()}
            disabled={loading}
            aria-label="Refresh student list"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4" aria-hidden />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
          {isAdmin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      onClick={openCreate}
                      aria-label="Add student"
                      disabled={!optionsLoading && parents.length === 0}
                    >
                      <Plus className="size-4" aria-hidden />
                      <span className="ml-2">Add Student</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {parents.length === 0 && !optionsLoading
                    ? "Add at least one parent account first"
                    : "Add a new student"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
              <Users className="size-5" />
              All Students
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredStudents.length} student
              {filteredStudents.length !== 1 ? "s" : ""}
              {filteredStudents.length !== students.length
                ? ` (filtered from ${students.length})`
                : ""}
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Search students by name"
              />
            </div>
            {isAdmin && (
              <>
                <Select
                  value={filterGrade || "all"}
                  onValueChange={(v) => setFilterGrade(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="w-full sm:w-[7rem]" aria-label="Filter by grade">
                    <SelectValue placeholder="Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All grades</SelectItem>
                    {COMMON_GRADES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={
                    filterParentId === ""
                      ? "all"
                      : String(filterParentId)
                  }
                  onValueChange={(v) =>
                    setFilterParentId(v === "all" ? "" : Number(v))
                  }
                  disabled={optionsLoading}
                >
                  <SelectTrigger className="w-full sm:w-[11rem]" aria-label="Filter by parent">
                    <SelectValue placeholder="Parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All parents</SelectItem>
                    {parents.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name || p.email}
                      </SelectItem>
                    ))}
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
                  <SelectTrigger className="w-full sm:w-[10rem]" aria-label="Filter by bus">
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
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="shrink-0"
                  >
                    <Filter className="size-4" />
                    <span className="ml-1">Clear filters</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className={cn("h-10 w-full", i === 0 && "rounded-t-lg")}
                />
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GraduationCap className="size-6 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>
                  {hasActiveFilters ? "No students match your filters" : "No students yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasActiveFilters
                    ? "Try clearing filters or adding a new student."
                    : "Add a student to get started."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  isAdmin && (
                    <Button size="sm" onClick={openCreate}>
                      <Plus className="size-4" />
                      Add Student
                    </Button>
                  )
                )}
              </EmptyContent>
            </Empty>
          ) : isMobile ? (
            <div className="space-y-3">
              {filteredStudents.map((row) => (
                <Card
                  key={row.id}
                  className={cn(
                    isAdmin && "cursor-pointer transition-colors hover:bg-muted/50",
                  )}
                  onClick={() => isAdmin && openEdit(row)}
                >
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{row.full_name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {row.grade ? (
                          <Badge variant="secondary" className="font-normal">
                            Grade {row.grade}
                          </Badge>
                        ) : null}
                        {isAdmin && (
                          <span className="truncate">
                            {parentMap[row.parent_id] ?? `Parent #${row.parent_id}`}
                          </span>
                        )}
                      </div>
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
                          aria-label={`Edit ${row.full_name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(row.id)}
                          aria-label={`Delete ${row.full_name}`}
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
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 gap-1 font-medium"
                        onClick={() => toggleSort("name")}
                        aria-label={`Sort by name ${sortBy === "name" ? (sortDir === "asc" ? "ascending" : "descending") : ""}`}
                      >
                        Name
                        {sortBy === "name" ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="size-4" />
                          ) : (
                            <ArrowDown className="size-4" />
                          )
                        ) : (
                          <ArrowUpDown className="size-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 gap-1 font-medium"
                        onClick={() => toggleSort("grade")}
                        aria-label={`Sort by grade ${sortBy === "grade" ? (sortDir === "asc" ? "ascending" : "descending") : ""}`}
                      >
                        Grade
                        {sortBy === "grade" ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="size-4" />
                          ) : (
                            <ArrowDown className="size-4" />
                          )
                        ) : (
                          <ArrowUpDown className="size-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    {isAdmin && <TableHead>Parent</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((row) => (
                    <TableRow
                      key={row.id}
                      className={cn(isAdmin && "cursor-pointer hover:bg-muted/50")}
                      onClick={() => isAdmin && openEdit(row)}
                    >
                      <TableCell
                        className="font-mono text-muted-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.id}
                      </TableCell>
                      <TableCell className="font-medium">{row.full_name}</TableCell>
                      <TableCell>
                        {row.grade ? (
                          <Badge variant="secondary" className="font-normal">
                            {row.grade}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-muted-foreground">
                          {parentMap[row.parent_id] ?? `#${row.parent_id}`}
                        </TableCell>
                      )}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(row)}
                              aria-label={`Edit ${row.full_name}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(row.id)}
                              aria-label={`Delete ${row.full_name}`}
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

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg" aria-describedby="student-form-desc">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Student" : "Add Student"}
            </DialogTitle>
            <DialogDescription id="student-form-desc">
              {editingId
                ? "Update student details and home location."
                : "Create a new student and assign a parent."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="student-full_name">Full name *</Label>
              <Input
                id="student-full_name"
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
                placeholder="e.g. Jane Doe"
                required
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-grade">Grade</Label>
              <Input
                id="student-grade"
                value={form.grade ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, grade: e.target.value }))
                }
                placeholder="e.g. 5"
              />
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="student-parent">Parent *</Label>
                <Select
                  value={form.parent_id ? String(form.parent_id) : ""}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, parent_id: Number(v) }))
                  }
                  required
                  disabled={optionsLoading || parents.length === 0}
                >
                  <SelectTrigger id="student-parent">
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} ({p.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {parents.length === 0 && !optionsLoading && (
                  <p className="text-xs text-muted-foreground">
                    No parent accounts found. Create a user with parent role first.
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student-lat">Home latitude</Label>
                <Input
                  id="student-lat"
                  type="number"
                  step="any"
                  value={
                    form.home_latitude != null ? form.home_latitude : ""
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      home_latitude: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-lng">Home longitude</Label>
                <Input
                  id="student-lng"
                  type="number"
                  step="any"
                  value={
                    form.home_longitude != null ? form.home_longitude : ""
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      home_longitude: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Home location on map</Label>
              <GoogleMapLocationPicker
                value={
                  form.home_latitude != null && form.home_longitude != null
                    ? {
                        lat: form.home_latitude,
                        lng: form.home_longitude,
                      }
                    : null
                }
                onChange={(coords) =>
                  setForm((f) => ({
                    ...f,
                    home_latitude: coords?.lat ?? null,
                    home_longitude: coords?.lng ?? null,
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
                  <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
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
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this student and cannot be undone.
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
