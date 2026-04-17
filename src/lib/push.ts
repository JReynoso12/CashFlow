"use client";

/**
 * Converts a URL-safe base64 VAPID public key to the Uint8Array shape that
 * PushManager.subscribe() needs.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normal);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function arrayBufferToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export type PushSubscriptionPayload = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
};

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush(
  vapidPublicKey: string,
): Promise<PushSubscriptionPayload> {
  if (!isPushSupported()) throw new Error("Push notifications aren't supported on this browser.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    // Cast avoids a TS complaint about SharedArrayBuffer vs ArrayBuffer in
    // the PushSubscriptionOptionsInit type definition.
    applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
  });

  const json = sub.toJSON() as {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
  };

  return {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh ?? arrayBufferToBase64Url(sub.getKey("p256dh")),
    auth: json.keys?.auth ?? arrayBufferToBase64Url(sub.getKey("auth")),
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : null,
  };
}

export async function unsubscribeFromPush(): Promise<string | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
