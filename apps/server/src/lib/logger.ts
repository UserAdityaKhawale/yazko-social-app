import { randomUUID } from "crypto";

type LogLevel = "debug" | "info" | "warn" | "error";

const order: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function safeJson(data: Record<string, unknown>) {
  return JSON.stringify(data, (_key, value) => {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack
      };
    }

    return value;
  });
}

export function createLogger(level: string) {
  const activeLevel = (level in order ? level : "info") as LogLevel;

  function write(target: LogLevel, event: string, data: Record<string, unknown> = {}) {
    if (order[target] < order[activeLevel]) {
      return;
    }

    const payload = {
      ts: new Date().toISOString(),
      level: target,
      event,
      ...data
    };

    const line = safeJson(payload);

    if (target === "error") {
      console.error(line);
      return;
    }

    if (target === "warn") {
      console.warn(line);
      return;
    }

    console.log(line);
  }

  return {
    debug: (event: string, data?: Record<string, unknown>) => write("debug", event, data),
    info: (event: string, data?: Record<string, unknown>) => write("info", event, data),
    warn: (event: string, data?: Record<string, unknown>) => write("warn", event, data),
    error: (event: string, data?: Record<string, unknown>) => write("error", event, data)
  };
}

export function requestId() {
  return randomUUID();
}
