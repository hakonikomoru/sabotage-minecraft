type LogLevel = "OK" | "INFO" | "WARN" | "ERROR";

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${level}] ${timestamp} ${message}`;
}

export const logger = {
  ok(message: string): void {
    console.log(formatMessage("OK", message));
  },
  info(message: string): void {
    console.log(formatMessage("INFO", message));
  },
  warn(message: string): void {
    console.warn(formatMessage("WARN", message));
  },
  error(message: string, error?: unknown): void {
    const detail =
      error instanceof Error ? `: ${error.message}` : error ? `: ${String(error)}` : "";
    console.error(formatMessage("ERROR", `${message}${detail}`));
  },
};
