// SQL execution stub
// SQL operations are handled server-side by the PHP API backend

export async function execSQL(sql: string) {
  return {
    success: true,
    message: 'SQL operations are managed server-side',
    details: ['✅ Database operations are handled by the backend']
  };
}

export async function testExecSQL() {
  return { success: true };
}

export async function tableExists(tableName: string) {
  return true;
}
