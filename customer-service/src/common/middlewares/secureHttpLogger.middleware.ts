import { Request, Response, NextFunction } from "express";
import { SecureLogger } from "../logging/SecureLogger.js";
import { randomUUID } from "crypto";

export const secureHttpLogger = (req: Request, res: Response, next: NextFunction): void => {
    const correlationId = (req.headers['x-correlation-id'] as string) || `req-${randomUUID().slice(0, 8)}`;
    res.setHeader('x-correlation-id', correlationId);

    const startTime = Date.now();

    res.on('finish', () => {
        const durationMs = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Privacy-safe HTTP request logging: No full body dumps, strictly metadata
        SecureLogger.info(`HTTP ${req.method} ${req.baseUrl || ''}${req.path} completed`, {
            method: req.method,
            path: req.path,
            statusCode,
            durationMs,
            ip: req.ip ? req.ip.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)/, '$1.$2.***.***') : undefined
        }, correlationId);
    });

    next();
};
