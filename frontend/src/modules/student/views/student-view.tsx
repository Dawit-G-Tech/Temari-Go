'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { authClient } from '@/lib/auth-client';
import {
  studentAPI,
  type Student,
  type CreateStudentInput,
  type UpdateStudentInput,
} from '@/lib/student-api';
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
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
} from 'lucide-react';

const emptyForm: CreateStudentInput = {
  full_name: '',
  grade: '',
  parent_id: 0,
  home_latitude: null,
  home_longitude: null,
};

export function StudentView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateStudentInput>(emptyForm);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const getToken = () => authClient.getAccessToken() ?? undefined;

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentAPI.getAll(getToken());
      setStudents(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: Student) => {
    setEditingId(row.id);
    setForm({
      full_name: row.full_name,
      grade: row.grade ?? '',
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
    setSubmitLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        grade: form.grade?.trim() || null,
        parent_id: Number(form.parent_id),
        home_latitude:
          form.home_latitude != null ? Number(form.home_latitude) : null,
        home_longitude:
          form.home_longitude != null ? Number(form.home_longitude) : null,
      };
      if (editingId) {
        await studentAPI.update(editingId, payload, getToken());
      } else {
        await studentAPI.create(payload, getToken());
      }
      closeDialog();
      await loadStudents();
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
      await studentAPI.delete(deleteId, getToken());
      cancelDelete();
      await loadStudents();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete student');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <GraduationCap className="size-6" />
            Students
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage students. Add, edit, or remove student records (admin only).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadStudents}
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
            <span className="ml-2">Add Student</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <p className="text-muted-foreground text-sm">
            {students.length} student{students.length !== 1 ? 's' : ''} total
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No students yet. Add one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Parent ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-muted-foreground">
                      {row.id}
                    </TableCell>
                    <TableCell className="font-medium">{row.full_name}</TableCell>
                    <TableCell>{row.grade ?? '—'}</TableCell>
                    <TableCell>{row.parent_id}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(row)}
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(row.id)}
                        aria-label="Delete"
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
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Student' : 'Add Student'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update student details below.'
                : 'Create a new student. Parent ID must be an existing user (parent) ID.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
                placeholder="e.g. Jane Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Input
                id="grade"
                value={form.grade ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, grade: e.target.value }))
                }
                placeholder="e.g. 5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent_id">Parent ID *</Label>
              <Input
                id="parent_id"
                type="number"
                min={1}
                value={form.parent_id || ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    parent_id: e.target.value ? Number(e.target.value) : 0,
                  }))
                }
                placeholder="User ID of parent"
                required
              />
              <p className="text-xs text-muted-foreground">
                Must be an existing user with parent role.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="home_latitude">Home latitude</Label>
                <Input
                  id="home_latitude"
                  type="number"
                  step="any"
                  value={
                    form.home_latitude != null ? form.home_latitude : ''
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
                <Label htmlFor="home_longitude">Home longitude</Label>
                <Input
                  id="home_longitude"
                  type="number"
                  step="any"
                  value={
                    form.home_longitude != null ? form.home_longitude : ''
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
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this student and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
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
