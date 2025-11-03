// Health check for PHP API backend
// Verifies connection to the PHP API and database availability

import { layonsApi } from '@/integrations/layonsApi/client';

interface HealthCheckResult {
  isHealthy: boolean;
  issues: string[];
  canCreateUsers: boolean;
  rateLimited: boolean;
}

/**
 * Check system health - PHP API backend
 */
export const checkSupabaseHealth = async (): Promise<HealthCheckResult> => {
  const issues: string[] = [];
  let isHealthy = true;
  let canCreateUsers = true;
  let rateLimited = false;

  try {
    // Test basic database connection by trying to fetch a table
    const data = await layonsApi.getAll('users');
    if (!Array.isArray(data)) {
      issues.push('Database connection returned unexpected format');
      isHealthy = false;
      canCreateUsers = false;
    }
  } catch (error: any) {
    issues.push(`Database connection failed: ${error.message}`);
    isHealthy = false;
    canCreateUsers = false;
  }

  return {
    isHealthy,
    issues,
    canCreateUsers,
    rateLimited
  };
};

/**
 * Wait for system to be healthy
 */
export const waitForRateLimit = async (maxWaitTime: number = 30000): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const health = await checkSupabaseHealth();
    
    if (health.isHealthy) {
      return true;
    }
    
    console.log('Waiting for system to be ready...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return false;
};

/**
 * Smart retry with error handling
 */
export const retryWithRateLimit = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      
      if (!isLastAttempt) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying operation (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Max retries exceeded');
};
