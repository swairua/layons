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

async function doRequest<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: any, retries = 3): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }

    // Log errors for debugging
    if (!res.ok) {
      const errorMsg = typeof json === 'object' && json.error
        ? json.error
        : (typeof json === 'object' ? JSON.stringify(json) : text);
      console.error(`[Layons API] ${method} ${url} - ${res.status}: ${errorMsg}`);

      // Retry on 5xx errors if we have retries left
      if (res.status >= 500 && retries > 0) {
        console.warn(`[Layons API] Server error, retrying... (${retries} attempts left)`);
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
        return doRequest<T>(method, url, body, retries - 1);
      }

      throw new Error(`API error ${res.status}: ${errorMsg}`);
    }

    return json as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(`[Layons API] Request timeout (10s) for ${method} ${url}`);

        // Retry on timeout if we have retries left
        if (retries > 0) {
          console.warn(`[Layons API] Timeout, retrying... (${retries} attempts left)`);
          await new Promise(r => setTimeout(r, 1000));
          return doRequest<T>(method, url, body, retries - 1);
        }

        throw new Error('API request timeout - server may be unavailable');
      }

      // Retry on network errors
      if (retries > 0 && error.message.includes('Failed to fetch')) {
        console.warn(`[Layons API] Network error, retrying... (${retries} attempts left)`);
        await new Promise(r => setTimeout(r, 1000));
        return doRequest<T>(method, url, body, retries - 1);
      }

      throw error;
    }
    console.error(`[Layons API] Unexpected error: ${error}`);
    throw new Error('Failed to fetch from API');
  }
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
