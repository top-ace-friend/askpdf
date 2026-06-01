export interface Logger {
  info(message: string, extra?: any): void;
  error(message: string, extra?: any): void;
  debug(message: string, extra?: any): void;
  warn(message: string, extra?: any): void;
  fatal(message: string, extra?: any): void;
}

export const logger: Logger = {
  info(message, extra) {
    log(message, "info", extra);
  },
  error(message, extra) {
    log(message, "error", extra);
  },
  debug(message, extra) {
    log(message, "debug", extra);
  },
  warn(message, extra) {
    log(message, "warn", extra);
  },
  fatal(message, extra) {
    log(message, "fatal", extra);
  },
};

const log = (
  message: string,
  level: "info" | "error" | "warn" | "fatal" | "debug",
  extra?: any
) => {
  const consoleMethod = level === "fatal" ? "error" : level;
  (console as any)[consoleMethod](message, extra || "");
};
