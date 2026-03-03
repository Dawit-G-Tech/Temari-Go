 "use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
import { studentAPI, type Student } from "@/lib/student-api";
import { rfidCardAPI, type RFIDCard } from "@/lib/rfid-card-api";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, BadgeCheck } from "lucide-react";

export default function RfidCardsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState<number | "">("");
  const [currentCard, setCurrentCard] = useState<RFIDCard | null>(null);
  const [rfidTag, setRfidTag] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const getToken = () => authClient.getAccessToken() ?? undefined;

  useEffect(() => {
    const loadStudents = async () => {
      setLoadingStudents(true);
      setError(null);
      try {
        const token = getToken();
        const all = await studentAPI.getAll(token);
        const list = Array.isArray(all) ? all : [];
        setStudents(list);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load students";
        setError(msg);
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    void loadStudents();
  }, []);

  useEffect(() => {
    const studentId =
      typeof selectedStudentId === "number" ? selectedStudentId : null;
    if (!studentId) {
      setCurrentCard(null);
      return;
    }

    const loadCard = async () => {
      setError(null);
      try {
        const token = getToken();
        const card = await rfidCardAPI.getActiveForStudent(studentId, token);
        setCurrentCard(card);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load RFID card";
        setError(msg);
        setCurrentCard(null);
      }
    };

    void loadCard();
  }, [selectedStudentId]);

  const selectedStudent = useMemo(
    () =>
      typeof selectedStudentId === "number"
        ? students.find((s) => s.id === selectedStudentId) ?? null
        : null,
    [students, selectedStudentId]
  );

  const handleAssign = async () => {
    if (!isAdmin) return;
    const studentId =
      typeof selectedStudentId === "number" ? selectedStudentId : null;
    if (!studentId || !rfidTag.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const token = getToken();
      const card = await rfidCardAPI.assign(
        { rfid_tag: rfidTag.trim(), student_id: studentId },
        token
      );
      setCurrentCard(card);
      setRfidTag("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to assign RFID card";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!currentCard) return;
    setDeactivating(true);
    setError(null);
    try {
      const token = getToken();
      const updated = await rfidCardAPI.deactivate(currentCard.id, token);
      setCurrentCard(updated);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to deactivate RFID card";
      setError(msg);
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">RFID cards</h1>
          <p className="text-muted-foreground mt-1">
            Assign and manage RFID cards for students used in bus attendance
            scans.
          </p>
        </div>
        {!isAdmin && (
          <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs text-muted-foreground">
            <Shield className="size-3.5" />
            Read-only view; card assignment is admin-only.
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="size-4" />
            Current assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingStudents ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No students found. Add students first, then you can assign RFID
              cards to them.
            </p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-[minmax(0,0.45fr),minmax(0,0.55fr)]">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Student
                    </label>
                    <Select
                      value={
                        typeof selectedStudentId === "number"
                          ? String(selectedStudentId)
                          : ""
                      }
                      onValueChange={(v) => setSelectedStudentId(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isAdmin && (
                    <div className="space-y-1.5">
                      <label
                        htmlFor="rfid-tag"
                        className="text-xs font-medium text-muted-foreground"
                      >
                        RFID tag
                      </label>
                      <Input
                        id="rfid-tag"
                        placeholder="Scan or paste tag value"
                        value={rfidTag}
                        onChange={(e) => setRfidTag(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        When using a USB reader, focus this field and tap the
                        card to capture its tag automatically.
                      </p>
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={handleAssign}
                          disabled={
                            !rfidTag.trim() ||
                            !selectedStudent ||
                            saving ||
                            !isAdmin
                          }
                        >
                          {currentCard ? "Reassign card" : "Assign card"}
                        </Button>
                        {currentCard && currentCard.active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDeactivate}
                            disabled={deactivating}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  {!selectedStudent ? (
                    <p className="text-sm text-muted-foreground">
                      Select a student to view or update their RFID card.
                    </p>
                  ) : !currentCard ? (
                    <p className="text-sm text-muted-foreground">
                      No active RFID card is currently assigned to{" "}
                      <span className="font-medium">
                        {selectedStudent.full_name}
                      </span>
                      . Assign a new card to start tracking their bus scans.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tag</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Issued at</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="text-xs font-mono">
                            {currentCard.rfid_tag}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge
                              variant={
                                currentCard.active ? "outline" : "secondary"
                              }
                              className="text-[10px] font-normal"
                            >
                              {currentCard.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {currentCard.issued_at
                              ? new Date(
                                  currentCard.issued_at
                                ).toLocaleDateString()
                              : "—"}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

