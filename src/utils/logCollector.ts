class LogCollector {
  private logs: string[] = [];
  private originalConsoleLog: typeof console.log;
  private originalConsoleWarn: typeof console.warn;
  private originalConsoleError: typeof console.error;
  private originalConsoleDebug: typeof console.debug;
  private originalConsoleInfo: typeof console.info;
  private isCapturing: boolean = false;

  constructor() {
    this.originalConsoleLog = console.log.bind(console);
    this.originalConsoleWarn = console.warn.bind(console);
    this.originalConsoleError = console.error.bind(console);
    this.originalConsoleDebug = console.debug.bind(console);
    this.originalConsoleInfo = console.info.bind(console);
  }

  startCapture(): void {
    if (this.isCapturing) {
      return;
    }

    this.isCapturing = true;
    this.logs = [];

    // Interceptar console.log
    console.log = (...args: any[]) => {
      const message = this.formatMessage("log", args);
      this.logs.push(message);
      this.originalConsoleLog(...args);
    };

    // Interceptar console.warn
    console.warn = (...args: any[]) => {
      const message = this.formatMessage("warn", args);
      this.logs.push(message);
      this.originalConsoleWarn(...args);
    };

    // Interceptar console.error
    console.error = (...args: any[]) => {
      const message = this.formatMessage("error", args);
      this.logs.push(message);
      this.originalConsoleError(...args);
    };

    // Interceptar console.debug
    console.debug = (...args: any[]) => {
      const message = this.formatMessage("debug", args);
      this.logs.push(message);
      this.originalConsoleDebug(...args);
    };

    // Interceptar console.info
    console.info = (...args: any[]) => {
      const message = this.formatMessage("info", args);
      this.logs.push(message);
      this.originalConsoleInfo(...args);
    };
  }

  stopCapture(): void {
    if (!this.isCapturing) {
      return;
    }

    this.isCapturing = false;

    // Restaurar métodos originais
    console.log = this.originalConsoleLog;
    console.warn = this.originalConsoleWarn;
    console.error = this.originalConsoleError;
    console.debug = this.originalConsoleDebug;
    console.info = this.originalConsoleInfo;
  }

  addLog(message: string): void {
    if (this.isCapturing) {
      this.logs.push(message);
    }
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  getLogsAsString(): string {
    return this.logs.join("\n");
  }

  clear(): void {
    this.logs = [];
  }

  private formatMessage(level: string, args: any[]): string {
    const timestamp = new Date().toISOString();
    const message = args
      .map((arg) => {
        if (typeof arg === "object") {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(" ");

    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }
}

export const logCollector = new LogCollector();
