/**
 * Log levels supported by the logger
 */
export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error'
}

/**
 * Log message structure
 */
interface LogMessage {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: Record<string, unknown>;
    error?: Error;
}

/**
 * Logger configuration options
 */
interface LoggerConfig {
    minLevel: LogLevel;
    serviceName: string;
    enableConsole?: boolean;
}

/**
 * Application logger with context support and performance tracking
 */
export class Logger {
    private static instance: Logger;
    private readonly config: LoggerConfig;
    private readonly timers: Map<string, number> = new Map();

    private constructor(config: LoggerConfig) {
        this.config = {
            enableConsole: true,
            ...config
        };
    }

    static initialize(config: LoggerConfig): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(config);
        }
        return Logger.instance;
    }

    static getInstance(): Logger {
        if (!Logger.instance) {
            throw new Error('Logger not initialized. Call initialize() first.');
        }
        return Logger.instance;
    }

    /**
     * Start timing an operation
     */
    startTimer(operation: string): void {
        this.timers.set(operation, performance.now());
    }

    /**
     * End timing an operation and log the duration
     */
    endTimer(operation: string, context?: Record<string, unknown>): void {
        const startTime = this.timers.get(operation);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.info(`Operation ${operation} completed`, {
                ...context,
                durationMs: duration
            });
            this.timers.delete(operation);
        }
    }

    /**
     * Log debug level message
     */
    debug(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.DEBUG, message, context);
    }

    /**
     * Log info level message
     */
    info(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.INFO, message, context);
    }

    /**
     * Log warning level message
     */
    warn(message: string, context?: Record<string, unknown>): void {
        this.log(LogLevel.WARN, message, context);
    }

    /**
     * Log error level message
     */
    error(message: string, error?: Error, context?: Record<string, unknown>): void {
        this.log(LogLevel.ERROR, message, context, error);
    }

    private log(
        level: LogLevel,
        message: string,
        context?: Record<string, unknown>,
        error?: Error
    ): void {
        if (this.shouldLog(level)) {
            const logMessage: LogMessage = {
                level,
                message,
                timestamp: new Date().toISOString(),
                context: {
                    ...context,
                    service: this.config.serviceName
                },
                error
            };

            this.writeLog(logMessage);
        }
    }

    private shouldLog(level: LogLevel): boolean {
        const levels = Object.values(LogLevel);
        const minLevelIndex = levels.indexOf(this.config.minLevel);
        const currentLevelIndex = levels.indexOf(level);
        return currentLevelIndex >= minLevelIndex;
    }

    private writeLog(logMessage: LogMessage): void {
        if (this.config.enableConsole) {
            const { level, message, timestamp, context, error } = logMessage;
            const contextStr = context ? `\nContext: ${JSON.stringify(context, null, 2)}` : '';
            const errorStr = error ? `\nError: ${error.stack || error.message}` : '';
            
            // Use console methods corresponding to log levels
            const consoleMethod = console[level] || console.log;
            consoleMethod(`[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}${errorStr}`);
        }

        // Future enhancement: Add other log destinations (file, service, etc.)
    }

    /**
     * Create a child logger with additional context
     */
    child(context: Record<string, unknown>): Logger {
        const childLogger = new Logger(this.config);
        const parentLog = childLogger.log.bind(childLogger);
        
        childLogger.log = (level: LogLevel, message: string, childContext?: Record<string, unknown>, error?: Error): void => {
            parentLog(level, message, { ...context, ...childContext }, error);
        };

        return childLogger;
    }
}