// Layons PHP API client for CRUD and DDL operations
// Reads base URL from VITE_LAYONS_API_URL; falls back to production URL if not set

export type AlterAction =
  | { type: 'ADD'; name: string; definition: string }
  | { type: 'MODIFY'; name: string; definition: string }
  | { type: 'CHANGE'; name: string; new_name: string; definition: string }
  | { type: 'DROP'; name: string };

const DEFAULT_API_URL = 'https://erp.layonsconstruction.com/api.php';

function getBaseUrl() {
  // import.meta.env is available in Vite; at runtime we fallback to default
  const url = (import.meta as any)?.env?.VITE_LAYONS_API_URL || DEFAULT_API_URL;
  return String(url);
}

async function doRequest<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: any): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${typeof json === 'object' ? JSON.stringify(json) : text}`);
  }
  return json as T;
}

export const layonsApi = {
  // DDL
  async createTable(table: string, columns: Record<string, string>) {
    const base = getBaseUrl();
    const url = `${base}?table=${encodeURIComponent(table)}`;
    return doRequest<{ success?: string; error?: string }>('POST', url, {
      create_table: true,
      columns,
    });
  },

  async alterTable(table: string, actions: AlterAction[]) {
    const base = getBaseUrl();
    const url = `${base}?table=${encodeURIComponent(table)}`;
    return doRequest<{ success?: string; error?: string }>('POST', url, {
      alter_table: true,
      actions,
    });
  },

  async dropTable(table: string) {
    const base = getBaseUrl();
    const url = `${base}`;
    return doRequest<{ success?: string; error?: string }>('POST', url, {
      drop_table: table,
    });
  },

  // CRUD
  async insert<T = any>(table: string, data: Record<string, any>) {
    const base = getBaseUrl();
    const url = `${base}?table=${encodeURIComponent(table)}`;
    return doRequest<{ success?: true; id?: number; error?: string }>('POST', url, data);
  },

  async getAll<T = any>(table: string) {
    const base = getBaseUrl();
    const url = `${base}?table=${encodeURIComponent(table)}`;
    return doRequest<T[]>('GET', url);
  },

  async getById<T = any>(table: string, id: number | string) {
    const base = getBaseUrl();
    const url = `${base}?table=${encodeURIComponent(table)}&id=${encodeURIComponent(String(id))}`;
    return doRequest<T[]>('GET', url);
  },

  async update<T = any>(table: string, id: number | string, data: Record<string, any>) {
    const base = getBaseUrl();
    const url = `${base}?table=${encodeURIComponent(table)}&id=${encodeURIComponent(String(id))}`;
    return doRequest<{ success?: true; error?: string }>('PUT', url, data);
  },

  async remove(table: string, id: number | string) {
    const base = getBaseUrl();
    const url = `${base}?table=${encodeURIComponent(table)}&id=${encodeURIComponent(String(id))}`;
    return doRequest<{ success?: true; error?: string }>('DELETE', url);
  },
};
