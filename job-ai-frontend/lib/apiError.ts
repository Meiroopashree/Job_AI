export function apiDetail(err: unknown, fallback: string): string {
  if (err && typeof err === "object") {
    const response = (err as {
      response?: { data?: { detail?: unknown; error?: unknown } };
    }).response;
    const detail = response?.data?.detail ?? response?.data?.error;
    if (typeof detail === "string") return detail;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}