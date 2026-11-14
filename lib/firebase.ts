"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, type Auth, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import type { Locale, Role, Theme } from "@/lib/types";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let connectionTested = false;

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp(), firebaseConfig.firestoreDatabaseId);
  }
  return dbInstance;
}

export const firebaseApp = getFirebaseApp();
export const db = getFirebaseDb();
export const auth = getFirebaseAuth();

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<void> {
  if (connectionTested || typeof window === "undefined") return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

const VALID_ID_RE = /^[a-zA-Z0-9_-]+$/;

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  return VALID_ID_RE.test(cleaned) ? cleaned : "user";
}

function clampString(val: string | null | undefined, max: number, fallback = ""): string {
  const trimmed = (val ?? "").trim();
  if (!trimmed) return fallback.slice(0, max);
  return trimmed.slice(0, max);
}

export async function syncSignedInUserToFirestore(
  user: User,
  assignedRole: Role,
  locale: Locale,
  theme: Theme,
): Promise<void> {
  const uid = sanitizeId(user.uid);
  const displayName = clampString(user.displayName || user.email?.split("@")[0], 120, "User");
  const photoURL = clampString(user.photoURL, 500, "");
  const email = clampString(user.email, 254, "user@example.com");
  const isBootstrappedAdmin = email.toLowerCase() === "mz0970mmz@gmail.com" && user.emailVerified;
  const effectiveRole: Role = isBootstrappedAdmin ? assignedRole : "STUDENT";

  const publicPath = `users/${uid}/public/profile`;
  const publicRef = doc(db, "users", uid, "public", "profile");

  try {
    const existingPublic = await getDoc(publicRef);
    if (!existingPublic.exists()) {
      await setDoc(publicRef, {
        uid,
        displayName,
        photoURL,
        role: effectiveRole,
        institutionId: "inst_almohandes",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(publicRef, {
        displayName,
        photoURL,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }

  const privatePath = `users/${uid}/private/info`;
  const privateRef = doc(db, "users", uid, "private", "info");

  try {
    const existingPrivate = await getDoc(privateRef);
    if (!existingPrivate.exists()) {
      await setDoc(privateRef, {
        uid,
        email,
        emailVerified: Boolean(user.emailVerified),
        authProvider: "google.com",
        locale,
        theme,
        loginCount: 1,
        lastLoginAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(privateRef, {
        locale,
        theme,
        loginCount: increment(1),
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }

  const activityPath = `users/${uid}/activity`;
  try {
    await addDoc(collection(db, "users", uid, "activity"), {
      uid,
      action: "GOOGLE_SIGN_IN",
      detail: clampString(`Signed in via Google (${email})`, 300, "Signed in via Google"),
      portal: effectiveRole.toLowerCase(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, activityPath);
  }
}

export async function signInWithGooglePopup(): Promise<{ user: User; idToken: string }> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(auth, provider);
  const idToken = await cred.user.getIdToken();
  return { user: cred.user, idToken };
}

export async function signOutFromFirebase(): Promise<void> {
  if (auth.currentUser) {
    await fbSignOut(auth);
  }
}

export async function persistPreferencesToFirestore(locale: Locale, theme: Theme): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const uid = sanitizeId(user.uid);
  const privatePath = `users/${uid}/private/info`;
  const privateRef = doc(db, "users", uid, "private", "info");
  try {
    const snap = await getDoc(privateRef);
    if (snap.exists()) {
      await updateDoc(privateRef, {
        locale,
        theme,
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, privatePath);
  }
}

export async function createUserNoteInFirestore(title: string, content: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const uid = sanitizeId(user.uid);
  const cleanTitle = clampString(title, 120);
  const cleanContent = clampString(content, 2000);
  if (!cleanTitle || !cleanContent) throw new Error("Title and content are required");
  const notesPath = `users/${uid}/notes`;
  try {
    await addDoc(collection(db, "users", uid, "notes"), {
      uid,
      title: cleanTitle,
      content: cleanContent,
      pinned: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, notesPath);
  }
}

export async function toggleUserNotePinInFirestore(noteId: string, currentPinned: boolean): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const uid = sanitizeId(user.uid);
  const cleanNoteId = sanitizeId(noteId);
  const notePath = `users/${uid}/notes/${cleanNoteId}`;
  try {
    await updateDoc(doc(db, "users", uid, "notes", cleanNoteId), {
      pinned: !currentPinned,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, notePath);
  }
}

export async function deleteUserNoteInFirestore(noteId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const uid = sanitizeId(user.uid);
  const cleanNoteId = sanitizeId(noteId);
  const notePath = `users/${uid}/notes/${cleanNoteId}`;
  try {
    await deleteDoc(doc(db, "users", uid, "notes", cleanNoteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, notePath);
  }
}
