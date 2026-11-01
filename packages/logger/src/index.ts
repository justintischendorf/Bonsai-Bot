type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  log: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

function prefix(level: LogLevel, namespace: string): string {
  const ts = new Date()
    .toLocaleString("sv-SE", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    })
    .replace(",", ".");
  return `[${ts}] [${level}] [${namespace}]`;
}

export function createLogger(namespace: string): Logger {
  return {
    debug: (msg, ...args) =>
      console.debug(prefix("DEBUG", namespace), msg, ...args),
    info: (msg, ...args) =>
      console.info(prefix("INFO", namespace), msg, ...args),
    log: (msg, ...args) => console.log(prefix("INFO", namespace), msg, ...args),
    warn: (msg, ...args) =>
      console.warn(prefix("WARN", namespace), msg, ...args),
    error: (msg, ...args) =>
      console.error(prefix("ERROR", namespace), msg, ...args),
  };
}
