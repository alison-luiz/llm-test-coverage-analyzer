type LogLevel = "info" | "warn" | "error" | "debug";

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  info(message: string, data?: any): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage("info", message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, data));
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, error));
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, data));
    }
  }
}

export const logger = new Logger();
