import { Request, Response } from 'express';
import { ApiResponse } from '../types/api';
import { envConfig } from '../config/index';

export class MonitorController {
  ping = async (_req: Request, res: Response): Promise<void> => {
    const response: ApiResponse<{
      status: string;
    }> = {
      success: true,
      message: 'Service is running on port ' + envConfig.getConfig().PORT,
      timestamp: new Date(),
      data: {
        status: 'ok',
      },
    };
    res.status(200).json(response);
  };

  healthCheck = async (_req: Request, res: Response): Promise<void> => {
    const response: ApiResponse<{
      status: string;
      timestamp: Date;
      uptime: number;
      memory: NodeJS.MemoryUsage;
    }> = {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
      message: 'Service is healthy',
      timestamp: new Date(),
    };

    res.status(200).json(response);
  };
}
