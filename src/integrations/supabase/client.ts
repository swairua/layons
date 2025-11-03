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
  private filters: Array<{ col: string; operator: string; val: any }>;
  private _limit: number | null;
  private _select: string | null;
  private _orderBy: { column: string; ascending: boolean } | null;
  private _insertValues: Record<string, any> | Record<string, any>[] | null;
  private _updateValues: Record<string, any> | null;
  private _deleteFlag: boolean;

  constructor(table: string) {
    this.table = table;
    this.filters = [];
    this._limit = null;
    this._select = null;
    this._orderBy = null;
    this._insertValues = null;
    this._updateValues = null;
    this._deleteFlag = false;
  }

  select(columns?: string): this & { then?: undefined } {
    this._select = columns || '*';
    return this as any;
  }

  eq(column: string, value: any): this & { then?: undefined } {
    this.filters.push({ col: column, operator: 'eq', val: value });
    return this as any;
  }

  neq(column: string, value: any): this & { then?: undefined } {
    this.filters.push({ col: column, operator: 'neq', val: value });
    return this as any;
  }

  in(column: string, values: any[]): this & { then?: undefined } {
    this.filters.push({ col: column, operator: 'in', val: values });
    return this as any;
  }

  gt(column: string, value: any): this & { then?: undefined } {
    this.filters.push({ col: column, operator: 'gt', val: value });
    return this as any;
  }

  lt(column: string, value: any): this & { then?: undefined } {
    this.filters.push({ col: column, operator: 'lt', val: value });
    return this as any;
  }

  gte(column: string, value: any): this & { then?: undefined } {
    this.filters.push({ col: column, operator: 'gte', val: value });
    return this as any;
  }

  lte(column: string, value: any): this & { then?: undefined } {
    this.filters.push({ col: column, operator: 'lte', val: value });
    return this as any;
  }

  contains(column: string, value: any): this & { then?: undefined } {
    this.filters.push({ col: column, operator: 'contains', val: value });
    return this as any;
  }

  ilike(column: string, value: any): this & { then?: undefined } {
    this.filters.push({ col: column, operator: 'ilike', val: value });
    return this as any;
  }

  order(column: string, options?: { ascending?: boolean }): this & { then?: undefined } {
    this._orderBy = { column, ascending: options?.ascending !== false };
    return this as any;
  }

  limit(count: number): this & { then?: undefined } {
    this._limit = count;
    return this as any;
  }

  insert(values: Record<string, any> | Record<string, any>[]): this & { then?: undefined } {
    this._insertValues = values;
    return this as any;
  }

  update(values: Record<string, any>): this & { then?: undefined } {
    this._updateValues = values;
    return this as any;
  }

  delete(): this & { then?: undefined } {
    this._deleteFlag = true;
    return this as any;
  }

  async maybeSingle(): SingleResult<T> {
    const { data, error } = await this.execute();
    if (error) return { data: null, error };
    if (!data || data.length === 0) return { data: null, error: null };
    return { data: data[0] as T, error: null };
  }

  async single(): SingleResult<T> {
    return this.maybeSingle();
  }

  async execute(): SelectResult<T> {
    try {
      // Handle mutations
      if (this._insertValues) {
        return await this.executeInsert();
      }
      if (this._updateValues) {
        return await this.executeUpdate();
      }
      if (this._deleteFlag) {
        return await this.executeDelete();
      }

      // Handle queries
      let rows = await layonsApi.getAll<T>(this.table);

      // Client-side filter with operator support
      for (const f of this.filters) {
        rows = rows.filter((r: any) => {
          const rowVal = r[f.col];

          switch (f.operator) {
            case 'eq':
              return String(rowVal) === String(f.val);
            case 'neq':
              return String(rowVal) !== String(f.val);
            case 'in':
              return Array.isArray(f.val) && f.val.some(v => String(rowVal) === String(v));
            case 'gt':
              return rowVal > f.val;
            case 'lt':
              return rowVal < f.val;
            case 'gte':
              return rowVal >= f.val;
            case 'lte':
              return rowVal <= f.val;
            case 'contains':
              return String(rowVal).includes(String(f.val));
            case 'ilike':
              return String(rowVal).toLowerCase().includes(String(f.val).toLowerCase());
            default:
              return String(rowVal) === String(f.val);
          }
        });
      }

      // Client-side ordering
      if (this._orderBy) {
        rows.sort((a: any, b: any) => {
          const aVal = a[this._orderBy!.column];
          const bVal = b[this._orderBy!.column];

          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return this._orderBy!.ascending ? -1 : 1;
          if (bVal == null) return this._orderBy!.ascending ? 1 : -1;

          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return this._orderBy!.ascending
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal);
          }

          const result = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return this._orderBy!.ascending ? result : -result;
        });
      }

      if (this._limit != null) rows = rows.slice(0, this._limit);
      return { data: rows, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Request failed' } };
    }
  }

  private async executeInsert(): Promise<SelectResult<T>> {
    try {
      const arr = Array.isArray(this._insertValues) ? this._insertValues : [this._insertValues];
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

  private async executeUpdate(): Promise<SelectResult<T>> {
    try {
      const idFilter = this.filters.find(f => f.col === 'id');
      if (!idFilter) {
        return { data: null, error: { message: 'Update requires eq("id", ...)' } };
      }
      await layonsApi.update<T>(this.table, idFilter.val, this._updateValues!);
      return { data: [{ id: idFilter.val, ...this._updateValues } as any], error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Update failed' } };
    }
  }

  private async executeDelete(): Promise<SelectResult<T>> {
    try {
      const idFilter = this.filters.find(f => f.col === 'id');
      if (!idFilter) {
        return { data: null, error: { message: 'Delete requires eq("id", ...)' } };
      }
      await layonsApi.remove(this.table, idFilter.val);
      return { data: [] as any, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Delete failed' } };
    }
  }

  async upsert(values: Record<string, any> | Record<string, any>[]): MutateResult<T> {
    try {
      const arr = Array.isArray(values) ? values : [values];
      const results: any[] = [];
      for (const row of arr) {
        const hasId = Object.prototype.hasOwnProperty.call(row, 'id') && row.id !== undefined && row.id !== null && row.id !== '';
        if (hasId) {
          const id = row.id as any;
          const payload = { ...row } as any;
          delete payload.id;
          await layonsApi.update<T>(this.table, id, payload);
          results.push({ ...row });
        } else {
          const payload = { ...row } as any;
          const r = await layonsApi.insert<T>(this.table, payload);
          results.push({ ...row, id: r.id });
        }
      }
      return { data: results as any, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Upsert failed' } };
    }
  }

  async then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | null; error: SbError }) => TResult1 | Promise<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | Promise<TResult2>) | undefined | null
  ) {
    const res = await this.execute();
    return onfulfilled ? onfulfilled(res) : (res as any);
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
