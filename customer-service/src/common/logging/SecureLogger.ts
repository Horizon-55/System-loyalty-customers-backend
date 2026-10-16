import { PiiSanitizer } from "./PiiSanitizer.js";

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';

export interface StructuredLog {
    timestamp: string;
    level: LogLevel;
    message: string;
    correlationId?: string;
    context?: Record<string, any>;
}

export type LogSink = (log: StructuredLog, rawJson: string) => void;

export class SecureLogger {
    private static sinks: LogSink[] = [
        (log, rawJson) => {
            const prefix = `[${log.timestamp}] [${log.level}]${log.correlationId ? ` [${log.correlationId}]` : ''}:`;
            if (log.level === 'ERROR') {
                console.error(prefix, log.message, log.context ? JSON.stringify(log.context) : '');
            } else if (log.level === 'WARN') {
                console.warn(prefix, log.message, log.context ? JSON.stringify(log.context) : '');
            } else {
                console.log(prefix, log.message, log.context ? JSON.stringify(log.context) : '');
            }
        }
    ];

    /**
     * Allows tests and monitoring agents to intercept emitted logs.
     */
    public static addSink(sink: LogSink): () => void {
        this.sinks.push(sink);
        return () => {
            const idx = this.sinks.indexOf(sink);
            if (idx >= 0) this.sinks.splice(idx, 1);
        };
    }

    public static clearSinks(): void {
        this.sinks = [];
    }

    private static emit(level: LogLevel, message: string, context?: any, correlationId?: string): StructuredLog {
        const sanitizedMessage = PiiSanitizer.maskText(message);
        const sanitizedContext = context !== undefined ? PiiSanitizer.sanitize(context) : undefined;

        const logEntry: StructuredLog = {
            timestamp: new Date().toISOString(),
            level,
            message: sanitizedMessage,
            correlationId,
            context: sanitizedContext
        };

        const rawJson = JSON.stringify(logEntry);
        for (const sink of this.sinks) {
            sink(logEntry, rawJson);
        }

        return logEntry;
    }

    public static info(message: string, context?: any, correlationId?: string): StructuredLog {
        return this.emit('INFO', message, context, correlationId);
    }

    public static warn(message: string, context?: any, correlationId?: string): StructuredLog {
        return this.emit('WARN', message, context, correlationId);
    }

    public static error(message: string, errorOrContext?: any, correlationId?: string): StructuredLog {
        return this.emit('ERROR', message, errorOrContext, correlationId);
    }

    /**
     * Privacy-safe security event logging.
     * Records event type, actor/subject ID in safe form, result, and correlation ID without duplicating raw PII.
     */
    public static securityAudit(action: string, subjectId: string, result: 'SUCCESS' | 'DENIED' | 'FAILURE', details?: Record<string, any>, correlationId?: string): StructuredLog {
        return this.emit('SECURITY', `Security Event: ${action}`, {
            subjectId,
            result,
            ...details
        }, correlationId);
    }
}
