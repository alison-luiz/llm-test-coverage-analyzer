import { logCollector } from "./logCollector";

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
    const formattedMessage = this.formatMessage("info", message, data);
    if (this.shouldLog("info")) {
      console.log(formattedMessage);
    }
    logCollector.addLog(formattedMessage);
  }

  warn(message: string, data?: any): void {
    const formattedMessage = this.formatMessage("warn", message, data);
    if (this.shouldLog("warn")) {
      console.warn(formattedMessage);
    }
    logCollector.addLog(formattedMessage);
  }

  error(message: string, error?: any): void {
    const formattedMessage = this.formatMessage("error", message, error);
    if (this.shouldLog("error")) {
      console.error(formattedMessage);
    }
    logCollector.addLog(formattedMessage);
  }

  debug(message: string, data?: any): void {
    const formattedMessage = this.formatMessage("debug", message, data);
    if (this.shouldLog("debug")) {
      console.debug(formattedMessage);
    }
    logCollector.addLog(formattedMessage);
  }
}

export const logger = new Logger();
