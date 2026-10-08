import { readLocaleCookie, translate, type Locale } from "@/lib/i18n";
import type { ApiSuccess } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  token?: string | null;
  formData?: FormData;
  cache?: RequestCache;
  locale?: Locale;
};

export async function api<T>(path: string, options: Options = {}): Promise<ApiSuccess<T>> {
  const locale = options.locale ?? readLocaleCookie();
  const headers: Record<string, string> = { Accept: "application/json", "Accept-Language": locale };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body,
      cache: options.cache ?? "no-store",
    });
  } catch {
    throw new ApiError(translate(locale, "api.offline"), 0);
  }

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    message?: string | null;
    errors?: Record<string, string[]>;
    meta?: ApiSuccess<T>["meta"];
  } | null;

  if (!response.ok || !payload || payload.success !== true) {
    throw new ApiError(
      payload?.message || translate(locale, "api.failed"),
      response.status,
      payload?.errors,
    );
  }

  return {
    success: true,
    data: payload.data as T,
    message: payload.message ?? null,
    meta: payload.meta,
  };
}

export function fieldError(error: unknown, field: string): string | undefined {
  if (error instanceof ApiError) {
    return error.errors?.[field]?.[0];
  }
  return undefined;
}
