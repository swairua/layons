// Supabase client shim backed by Layons PHP API (open, no-auth)
// This replaces direct Supabase DB usage with HTTP calls to VITE_LAYONS_API_URL

import { layonsApi } from '@/integrations/layonsApi/client';

// Basic error shape to mimic Supabase response
type SbError = { message: string } | null;

type SelectResult<T> = Promise<{ data: T[] | null; error: SbError }>;
type SingleResult<T> = Promise<{ data: T | null; error: SbError }>;

type MutateResult<T> = Promise<{ data: T[] | null; error: SbError }>; // keep array-like for compatibility

function getLocalUser() {
  try {
    const raw = localStorage.getItem('local_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

class QueryBuilder<T = any> {
  private table: string;
  private filters: Array<{ col: string; val: any }>; 
  private _limit: number | null;
  private _select: string | null;

  constructor(table: string) {
    this.table = table;
    this.filters = [];
    this._limit = null;
    this._select = null;
  }

  select(columns?: string): this & { then?: undefined } {
    this._select = columns || '*';
    return this as any;
  }

  eq(column: string, value: any): this & { then?: undefined } {
    this.filters.push({ col: column, val: value });
    return this as any;
  }

  limit(count: number): this & { then?: undefined } {
    this._limit = count;
    return this as any;
  }

  async maybeSingle(): SingleResult<T> {
    const { data, error } = await this.execute();
    if (error) return { data: null, error };
    if (!data || data.length === 0) return { data: null, error: null };
    return { data: data[0] as T, error: null };
  }

  async single(): SingleResult<T> { return this.maybeSingle(); }

  async execute(): SelectResult<T> {
    try {
      let rows = await layonsApi.getAll<T>(this.table);
      // Client-side filter
      for (const f of this.filters) {
        if (f.col === 'id') {
          rows = rows.filter((r: any) => String(r.id) === String(f.val));
        } else {
          rows = rows.filter((r: any) => String(r[f.col]) === String(f.val));
        }
      }
      if (this._limit != null) rows = rows.slice(0, this._limit);
      return { data: rows, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Request failed' } };
    }
  }

  async then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | null; error: SbError }) => TResult1 | Promise<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | Promise<TResult2>) | undefined | null
  ) {
    const res = await this.execute();
    return onfulfilled ? onfulfilled(res) : (res as any);
  }

  async insert(values: Record<string, any> | Record<string, any>[]): MutateResult<T> {
    try {
      const arr = Array.isArray(values) ? values : [values];
      const results: any[] = [];
      for (const row of arr) {
        const payload: Record<string, any> = { ...row };
        const r = await layonsApi.insert<T>(this.table, payload);
        results.push({ ...row, id: r.id });
      }
      return { data: results as any, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Insert failed' } };
    }
  }

  async update(values: Record<string, any>): MutateResult<T> {
    try {
      const idFilter = this.filters.find(f => f.col === 'id');
      if (!idFilter) return { data: null, error: { message: 'Update requires eq("id", ...)' } };
      await layonsApi.update<T>(this.table, idFilter.val, values);
      return { data: [ { id: idFilter.val, ...values } as any ], error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Update failed' } };
    }
  }

  async delete(): MutateResult<T> {
    try {
      const idFilter = this.filters.find(f => f.col === 'id');
      if (!idFilter) return { data: null, error: { message: 'Delete requires eq("id", ...)' } };
      await layonsApi.remove(this.table, idFilter.val);
      return { data: [] as any, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Delete failed' } };
    }
  }
}

export const supabase = {
  from<T = any>(table: string) {
    return new QueryBuilder<T>(table);
  },
  // Minimal storage shim: just returns the path as a public URL
  storage: {
    from(_bucket: string) {
      return {
        getPublicUrl(path: string) {
          return { data: { publicUrl: path }, error: null } as const;
        },
      };
    },
  },
  // Minimal auth shim backed by localStorage, aligns with replaced AuthContext
  auth: {
    async getUser() {
      const u = getLocalUser();
      return { data: { user: u }, error: null } as any;
    },
    async getSession() {
      const u = getLocalUser();
      return { data: { session: u ? { user: u } : null }, error: null } as any;
    },
    async signInWithPassword({ email }: { email: string; password: string }) {
      const u = { id: email, email };
      localStorage.setItem('local_auth_user', JSON.stringify(u));
      return { data: { user: u, session: { user: u } }, error: null } as any;
    },
    async signUp({ email }: { email: string; password: string }) {
      const u = { id: email, email };
      localStorage.setItem('local_auth_user', JSON.stringify(u));
      return { data: { user: u }, error: null } as any;
    },
    async signOut() {
      localStorage.removeItem('local_auth_user');
      return { error: null } as any;
    },
    async resetPasswordForEmail(_email: string) {
      return { data: {}, error: null } as any;
    },
    admin: {
      async createUser({ email }: { email: string; password?: string; email_confirm?: boolean }) {
        const u = { id: email, email };
        return { data: { user: u }, error: null } as any;
      },
      async deleteUser(_userId: string) {
        return { data: {}, error: null } as any;
      },
    },
    onAuthStateChange(_cb: any) {
      return { data: { subscription: { unsubscribe: () => {} } }, error: null } as any;
    },
  },
};
