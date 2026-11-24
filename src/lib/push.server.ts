import { p256 } from "@noble/curves/nist.js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PushNotice = { title: string; body: string; url?: string };

const encoder = new TextEncoder();

function concatBytes(...parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function privateVapidKey() {
  const seed = process.env["AMG_VAPID_SEED"];
  if (!seed) throw new Error("Push notifications are not configured.");
  const seedBytes = encoder.encode(seed);
  for (let counter = 0; counter < 8; counter += 1) {
    const suffix = new Uint8Array([counter]);
    const candidate = new Uint8Array(await crypto.subtle.digest("SHA-256", concatBytes(seedBytes, suffix)));
    if (p256.utils.isValidSecretKey(candidate)) return candidate;
  }
  throw new Error("Push notification keys could not be prepared.");
}

export async function getVapidPublicKey() {
  const privateKey = await privateVapidKey();
  return base64Url(p256.getPublicKey(privateKey, false));
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  ));
}

async function vapidAuthorization(endpoint: URL, privateKey: Uint8Array, publicKey: Uint8Array) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = base64Url(encoder.encode(JSON.stringify({
    aud: `${endpoint.protocol}//${endpoint.host}`,
    exp: now + 12 * 60 * 60,
    sub: "mailto:ai@amgrealtors.com",
  })));
  const unsigned = `${header}.${payload}`;
  const signature = p256.sign(encoder.encode(unsigned), privateKey, { format: "compact" });
  return `vapid t=${unsigned}.${base64Url(signature)}, k=${base64Url(publicKey)}`;
}

async function encryptPushPayload(subscription: { p256dh: string; auth_secret: string }, payload: PushNotice, publicKey: Uint8Array) {
  const userPublic = fromBase64Url(subscription.p256dh);
  const authSecret = fromBase64Url(subscription.auth_secret);
  if (userPublic.length !== 65 || authSecret.length < 16) throw new Error("The saved phone alert subscription is invalid.");
  const recipientKey = await crypto.subtle.importKey(
    "raw",
    userPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const senderKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const senderPublic = new Uint8Array(await crypto.subtle.exportKey("raw", senderKeys.publicKey));
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "ECDH", public: recipientKey },
    senderKeys.privateKey,
    256,
  ));
  const keyInfo = concatBytes(encoder.encode("WebPush: info\0"), userPublic, senderPublic);
  const inputKey = await hkdf(sharedSecret, authSecret, keyInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const contentKey = await hkdf(inputKey, salt, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(inputKey, salt, encoder.encode("Content-Encoding: nonce\0"), 12);
  const plain = encoder.encode(JSON.stringify(payload));
  const padded = concatBytes(plain, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", contentKey, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, aesKey, padded));
  return concatBytes(salt, new Uint8Array([0, 0, 16, 0, senderPublic.length]), senderPublic, encrypted);
}

async function sendOne(subscription: {
  endpoint: string;
  p256dh: string;
  auth_secret: string;
}, notice: PushNotice) {
  const endpoint = new URL(subscription.endpoint);
  if (endpoint.protocol !== "https:") throw new Error("Push endpoints must use HTTPS.");
  const privateKey = await privateVapidKey();
  const publicKey = p256.getPublicKey(privateKey, false);
  const body = await encryptPushPayload(subscription, notice, publicKey);
  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuthorization(endpoint, privateKey, publicKey),
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Urgency: "normal",
    },
    body,
  });
}

export async function sendPushToUser(userId: string, notice: PushNotice) {
  const { data: subscriptions, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_secret")
    .eq("user_id", userId);
  if (error) throw new Error(`Could not load phone alert subscriptions: ${error.message}`);

  const results = await Promise.all((subscriptions ?? []).map(async (subscription) => {
    try {
      const response = await sendOne(subscription, notice);
      if (response.status === 404 || response.status === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        return false;
      }
      if (!response.ok) {
        const body = await response.text();
        console.error(`Push provider failed [${response.status}]: ${body}`);
        return false;
      }
      return true;
    } catch (pushError) {
      const message = pushError instanceof Error ? pushError.message : String(pushError);
      console.error(`Push delivery failed: ${message}`);
      return false;
    }
  }));
  return results.filter(Boolean).length;
}

export async function sendTaskActivityPushes(taskId: string, since: string) {
  const { data: notices, error } = await supabaseAdmin
    .from("notifications")
    .select("user_id, title, message, kind")
    .eq("task_id", taskId)
    .gte("created_at", since)
    .neq("kind", "deadline");
  if (error) throw new Error(`Could not load task alerts: ${error.message}`);
  const uniqueNotices = new Map<string, PushNotice>();
  for (const notice of notices ?? []) {
    const key = `${notice.user_id}:${notice.kind}:${notice.title}`;
    if (!uniqueNotices.has(key)) uniqueNotices.set(key, { title: notice.title, body: notice.message, url: "/calendar" });
  }
  await Promise.all([...uniqueNotices.entries()].map(([key, notice]) => sendPushToUser(key.split(":")[0] ?? "", notice)));
}

export async function sendRecentDeadlinePushes(since: string) {
  const { data: notices, error } = await supabaseAdmin
    .from("notifications")
    .select("user_id, title, message")
    .eq("kind", "deadline")
    .gte("created_at", since);
  if (error) throw new Error(`Could not load deadline alerts: ${error.message}`);
  await Promise.all((notices ?? []).map((notice) => sendPushToUser(notice.user_id, {
    title: notice.title,
    body: notice.message,
    url: "/tasks",
  })));
}