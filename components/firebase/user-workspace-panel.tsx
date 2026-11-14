"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { Avatar, Badge, Button, Card, CardHeader, Input, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";
import { useFirebase, usePrefs, useToast } from "@/components/providers";
import {
  createUserNoteInFirestore,
  db,
  deleteUserNoteInFirestore,
  handleFirestoreError,
  OperationType,
  toggleUserNotePinInFirestore,
} from "@/lib/firebase";

interface PrivateInfoDoc {
  email?: string;
  loginCount?: number;
  locale?: string;
  theme?: string;
  lastLoginAt?: { toDate?: () => Date };
}

interface NoteItem {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  updatedMs: number;
}

interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  createdMs: number;
}

export function UserWorkspacePanel() {
  const { firebaseUser, authReady } = useFirebase();
  const { l } = usePrefs();
  const { toast } = useToast();

  const [privateInfo, setPrivateInfo] = useState<PrivateInfoDoc | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setPrivateInfo(null);
      setNotes([]);
      setActivities([]);
      return;
    }

    const uid = firebaseUser.uid.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
    const infoPath = `users/${uid}/private/info`;
    const unsubInfo = onSnapshot(
      doc(db, "users", uid, "private", "info"),
      (snap) => {
        setPrivateInfo(snap.exists() ? (snap.data() as PrivateInfoDoc) : null);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, infoPath);
      },
    );

    const notesPath = `users/${uid}/notes`;
    const notesQuery = query(collection(db, "users", uid, "notes"), where("uid", "==", uid));
    const unsubNotes = onSnapshot(
      notesQuery,
      (snap) => {
        const list: NoteItem[] = snap.docs.map((d) => {
          const data = d.data() as {
            title?: string;
            content?: string;
            pinned?: boolean;
            updatedAt?: { toMillis?: () => number };
          };
          return {
            id: d.id,
            title: data.title ?? "",
            content: data.content ?? "",
            pinned: Boolean(data.pinned),
            updatedMs: data.updatedAt?.toMillis?.() ?? 0,
          };
        });
        list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedMs - a.updatedMs);
        setNotes(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, notesPath);
      },
    );

    const activityPath = `users/${uid}/activity`;
    const activityQuery = query(collection(db, "users", uid, "activity"), where("uid", "==", uid));
    const unsubActivity = onSnapshot(
      activityQuery,
      (snap) => {
        const list: ActivityItem[] = snap.docs.map((d) => {
          const data = d.data() as {
            action?: string;
            detail?: string;
            createdAt?: { toMillis?: () => number };
          };
          return {
            id: d.id,
            action: data.action ?? "",
            detail: data.detail ?? "",
            createdMs: data.createdAt?.toMillis?.() ?? 0,
          };
        });
        list.sort((a, b) => b.createdMs - a.createdMs);
        setActivities(list.slice(0, 5));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, activityPath);
      },
    );

    return () => {
      unsubInfo();
      unsubNotes();
      unsubActivity();
    };
  }, [authReady, firebaseUser]);

  if (!authReady || !firebaseUser) {
    return null;
  }

  const onAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await createUserNoteInFirestore(title, content);
      setTitle("");
      setContent("");
      toast({ title: l("تم حفظ الملاحظة في Firestore", "Note saved to Firestore"), tone: "success" });
    } catch {
      toast({ title: l("تعذّر حفظ الملاحظة", "Could not save note"), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={l("حساب جوجل والملاحظات المتزامنة", "Google Account & Synced Workspace")}
        subtitle={l("بيانات محفوظة عبر Firestore بين الجلسات والأجهزة", "Persisted in Firestore across sessions and devices")}
        icon="database"
        action={<Badge tone="success" dot>{l("متصل بـ Firebase", "Firebase connected")}</Badge>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-3">
        {firebaseUser.photoURL ? (
          <img
            src={firebaseUser.photoURL}
            alt={firebaseUser.displayName ?? "Google user"}
            referrerPolicy="no-referrer"
            className="size-10 rounded-full border border-line object-cover"
          />
        ) : (
          <Avatar name={firebaseUser.displayName ?? firebaseUser.email ?? "G"} size={40} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-fg">{firebaseUser.displayName ?? firebaseUser.email}</p>
          <p className="truncate text-[10.5px] text-fg-muted" dir="ltr">{firebaseUser.email}</p>
        </div>
        <div className="text-end">
          <p className="tnum text-[11px] font-semibold text-fg">
            {privateInfo?.loginCount ?? 1} {l("تسجيل دخول", "sign-ins")}
          </p>
          <p className="text-[9.5px] text-fg-muted">
            {privateInfo?.lastLoginAt?.toDate
              ? privateInfo.lastLoginAt.toDate().toLocaleString()
              : l("جلسة نشطة", "Active session")}
          </p>
        </div>
      </div>

      <form onSubmit={onAddNote} className="space-y-2 rounded-xl border border-line bg-surface-2/40 p-3">
        <p className="text-[11px] font-semibold text-fg">{l("ملاحظة جديدة محفوظة في السحابة", "New cloud-synced note")}</p>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={l("عنوان الملاحظة…", "Note title…")}
          maxLength={120}
          required
        />
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={l("اكتب ملاحظاتك الأكاديمية أو التنظيمية…", "Write your academic or administrative notes…")}
          rows={2}
          maxLength={2000}
          required
        />
        <Button type="submit" size="sm" loading={saving} disabled={saving || !title.trim() || !content.trim()} icon="plus">
          {l("حفظ في Firestore", "Save to Firestore")}
        </Button>
      </form>

      <div className="mt-4 space-y-2">
        {notes.map((n) => (
          <div key={n.id} className="flex items-start gap-2 rounded-xl border border-line bg-surface-2/50 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[11.5px] font-semibold text-fg">{n.title}</p>
                {n.pinned && <Badge tone="accent">{l("مثبّت", "Pinned")}</Badge>}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-fg-muted">{n.content}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => void toggleUserNotePinInFirestore(n.id, n.pinned)}
                className="grid size-7 place-items-center rounded-md border border-line text-fg-muted transition hover:bg-surface hover:text-fg"
                aria-label={l("تثبيت", "Pin")}
              >
                <Icon name="flag" size={12} />
              </button>
              <button
                type="button"
                onClick={() => void deleteUserNoteInFirestore(n.id)}
                className="grid size-7 place-items-center rounded-md border border-line text-danger-500 transition hover:bg-danger-500/10"
                aria-label={l("حذف", "Delete")}
              >
                <Icon name="trash" size={12} />
              </button>
            </div>
          </div>
        ))}
        {notes.length === 0 && (
          <p className="py-3 text-center text-[10.5px] text-fg-muted">
            {l("لا توجد ملاحظات محفوظة بعد.", "No saved notes yet.")}
          </p>
        )}
      </div>

      {activities.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-[10.5px] font-semibold text-fg-soft">{l("سجل الدخول الأخير (Firestore)", "Recent sign-in activity (Firestore)")}</p>
          <div className="space-y-1">
            {activities.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 text-[10px] text-fg-muted">
                <span className="truncate">{a.detail}</span>
                <span className="shrink-0 font-mono text-[9px]">{a.createdMs ? new Date(a.createdMs).toLocaleTimeString() : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
