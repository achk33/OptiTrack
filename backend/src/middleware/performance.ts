import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface PerformanceMetrics {
  path: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  userAgent?: string;
  userId?: string;
}

// Track slow queries for optimization
const SLOW_QUERY_THRESHOLD = 1000; // 1 second
const slowQueries: PerformanceMetrics[] = [];
const MAX_SLOW_QUERIES = 100;

export function performanceMonitor(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Capture the original end function
  const originalEnd = res.end;
  
  // Override res.end to capture response time
  res.end = function(chunk?: any, encoding?: any, callback?: any): any {
    const responseTime = Date.now() - startTime;
    
    const metrics: PerformanceMetrics = {
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      timestamp: new Date().toISOString(),
      userAgent: req.get('user-agent'),
      userId: (req as any).user?.id,
    };
    
    // Log slow queries
    if (responseTime > SLOW_QUERY_THRESHOLD) {
      logger.warn(`Slow API request detected: ${req.method} ${req.path} took ${responseTime}ms`, metrics);
      
      // Store for analytics
      slowQueries.push(metrics);
      if (slowQueries.length > MAX_SLOW_QUERIES) {
        slowQueries.shift(); // Keep only latest 100
      }
    }
    
    // Log all requests in development
    if (process.env.NODE_ENV === 'development') {
      const color = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
      logger.info(`${color} ${req.method} ${req.path} - ${res.statusCode} (${responseTime}ms)`);
    }
    
    // Restore original end and call it
    return originalEnd.call(this, chunk, encoding, callback);
  };
  
  next();
}

// Endpoint to get performance metrics
export function getPerformanceMetrics() {
  const avgResponseTime = slowQueries.length > 0
    ? slowQueries.reduce((sum, q) => sum + q.responseTime, 0) / slowQueries.length
    : 0;
  
  const endpointStats = slowQueries.reduce((acc, query) => {
    const key = `${query.method} ${query.path}`;
    if (!acc[key]) {
      acc[key] = { count: 0, totalTime: 0, maxTime: 0 };
    }
    acc[key].count++;
    acc[key].totalTime += query.responseTime;
    acc[key].maxTime = Math.max(acc[key].maxTime, query.responseTime);
    return acc;
  }, {} as Record<string, { count: number; totalTime: number; maxTime: number }>);
  
  return {
    slowQueriesCount: slowQueries.length,
    averageResponseTime: Math.round(avgResponseTime),
    threshold: SLOW_QUERY_THRESHOLD,
    recentSlowQueries: slowQueries.slice(-10), // Last 10
    endpointStats: Object.entries(endpointStats).map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      avgTime: Math.round(stats.totalTime / stats.count),
      maxTime: stats.maxTime,
    })).sort((a, b) => b.avgTime - a.avgTime),
  };
}
