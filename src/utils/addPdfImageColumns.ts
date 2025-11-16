import { supabase } from '@/integrations/supabase/client';

export const addPdfImageColumns = async () => {
  try {
    const sql = `
      -- Add header_image and stamp_image columns to companies table if they don't exist
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS header_image TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS stamp_image TEXT;
    `;

    const { error } = await supabase.rpc('exec_sql', {
      sql_string: sql
    });

    if (error) {
      console.error('Migration error:', error);
      // Try alternative approach using direct SQL
      const { error: error2 } = await supabase
        .from('companies')
        .select('id')
        .limit(1);

      if (!error2) {
        console.log('Companies table exists, attempting direct alter');
      }
    } else {
      console.log('Successfully added PDF image columns');
    }
  } catch (error) {
    console.error('Failed to add PDF image columns:', error);
  }
};
