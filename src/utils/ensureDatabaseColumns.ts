import { supabase } from '@/integrations/supabase/client';

/**
 * Ensures that header_image and stamp_image columns exist in the companies table
 * This handles the case where migrations haven't been applied yet
 */
export const ensureCompanyImageColumns = async () => {
  try {
    const sql = `
      -- Add header_image and stamp_image columns to companies table if they don't exist
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS header_image TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS stamp_image TEXT;
    `;

    // Try using the exec_sql RPC function
    const { error } = await supabase.rpc('exec_sql', {
      sql_string: sql
    });

    if (error) {
      // If exec_sql RPC doesn't work, log but don't fail
      console.warn('Could not add company image columns via exec_sql:', error);
      return false;
    }

    console.log('✓ Company image columns are available');
    return true;
  } catch (error) {
    console.warn('Failed to ensure company image columns exist:', error);
    return false;
  }
};

/**
 * Gracefully selects from companies, handling missing columns
 */
export const selectCompaniesWithFallback = async () => {
  try {
    // First, try to ensure the columns exist
    await ensureCompanyImageColumns();

    // Then try the full select
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching companies:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in selectCompaniesWithFallback:', error);
    throw error;
  }
};
