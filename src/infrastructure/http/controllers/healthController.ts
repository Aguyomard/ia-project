import type { Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';
import { getMistralClient } from '../../external/mistral/MistralClient.js';
import { getRerankClient, isRerankConfigured } from '../../external/rerank/RerankClient.js';

interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latencyMs?: number;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    mistral: ServiceStatus;
    rerank: ServiceStatus;
  };
}

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkMistral(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const client = getMistralClient();
    const isHealthy = await client.healthCheck();
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkRerank(): Promise<ServiceStatus> {
  if (!isRerankConfigured()) {
    return {
      status: 'degraded',
      error: 'Service not configured',
    };
  }

  const start = Date.now();
  try {
    const client = getRerankClient();
    client.resetAvailability();
    const isAvailable = await client.isAvailable();
    return {
      status: isAvailable ? 'healthy' : 'unhealthy',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function computeOverallStatus(
  services: HealthResponse['services']
): HealthResponse['status'] {
  const statuses = Object.values(services).map((s) => s.status);

  if (statuses.includes('unhealthy')) {
    const criticalUnhealthy =
      services.database.status === 'unhealthy' ||
      services.mistral.status === 'unhealthy';
    return criticalUnhealthy ? 'unhealthy' : 'degraded';
  }

  if (statuses.includes('degraded')) {
    return 'degraded';
  }

  return 'healthy';
}

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const [database, mistral, rerank] = await Promise.all([
    checkDatabase(),
    checkMistral(),
    checkRerank(),
  ]);

  const services = { database, mistral, rerank };
  const overallStatus = computeOverallStatus(services);

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services,
  };

  const httpStatus = overallStatus === 'healthy' ? 200 : 503;
  res.status(httpStatus).json(response);
}

export async function healthCheckSimple(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).send('OK');
  } catch {
    res.status(503).send('Service Unavailable');
  }
}

