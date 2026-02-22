// src/lib/apiClient.ts
import { API_BASE_URL } from "@/src/lib/api";
import { supabase } from "@/src/lib/supabase";

type Json = Record<string, any>;

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

async function safeParseJson(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit & {
    auth?: boolean;
    json?: Json;
  } = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  // JSON body helper
  let body: any = options.body;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  // Auth header helper (default true)
  const wantsAuth = options.auth !== false;
  if (wantsAuth) {
    const token = await getAccessToken();
    if (!token) {
      throw new ApiError("Not authenticated (missing access token)", 401, null);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body,
  });

  if (!res.ok) {
    const parsed = await safeParseJson(res);
    const msg =
      (parsed && typeof parsed === "object" && (parsed.error || parsed.message)) ||
      `Request failed (${res.status})`;
    throw new ApiError(String(msg), res.status, parsed);
  }

  // Some endpoints might return empty bodies
  const parsed = await safeParseJson(res);
  return parsed as T;
}