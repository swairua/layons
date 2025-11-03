import { supabase } from '@/integrations/supabase/client';

interface HealthCheckResult {
  isHealthy: boolean;
  issues: string[];
  canCreateUsers: boolean;
  rateLimited: boolean;
}

/**
 * Check system health (now uses MySQL API instead of Supabase)
 */
export const checkSupabaseHealth = async (): Promise<HealthCheckResult> => {
  const issues: string[] = [];
  let isHealthy = true;
  let canCreateUsers = true;
  let rateLimited = false;

  try {
    // Test basic database connection
    const { error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (testError) {
      issues.push(`Database connection failed: ${testError.message}`);
      isHealthy = false;
      canCreateUsers = false;
    }

  } catch (error) {
    issues.push(`General connection error`);
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
 * Wait for rate limiting to clear
 */
export const waitForRateLimit = async (maxWaitTime: number = 30000): Promise<boolean> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const health = await checkSupabaseHealth();
    
    if (!health.rateLimited) {
      return true;
    }
    
    console.log('Still checking system health...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  return false;
};

/**
 * Smart retry with rate limit handling
 */
export const retryWithRateLimit = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 5000
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
