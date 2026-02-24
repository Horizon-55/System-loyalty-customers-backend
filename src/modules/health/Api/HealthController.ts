import { Request, Response } from "express";
export class HealthController {
    public check = (req: Request, res: Response): void => {
        const healthData = {
            status: 'UP',
            upline: process.uptime(),
            timestamp: new Date().toISOString(),
            memoryUsage: process.memoryUsage(),
        };
        //відповідь 200 - OK
        res.status(200).json(healthData);
    };
}