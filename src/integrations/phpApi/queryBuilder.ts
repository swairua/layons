// QueryBuilder - Direct PHP API database wrapper
// Replaces shimmed Supabase client with direct API calls to layonsApi

import { layonsApi } from '@/integrations/layonsApi/client';

type Operator = 'eq' | 'neq' | 'in' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'ilike';

interface Filter {
  col: string;
  operator: Operator;
  val: any;
}

type QueryError = { message: string } | null;

export class QueryBuilder<T = any> {
  private table: string;
  private filters: Filter[] = [];
  private _limit: number | null = null;
  private _select: string | null = null;
  private _orderBy: { column: string; ascending: boolean } | null = null;
  private _insertValues: Record<string, any> | Record<string, any>[] | null = null;
  private _updateValues: Record<string, any> | null = null;
  private _deleteFlag: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string): this {
    this._select = columns || '*';
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push({ col: column, operator: 'eq', val: value });
    return this;
  }

  neq(column: string, value: any): this {
    this.filters.push({ col: column, operator: 'neq', val: value });
    return this;
  }

  in(column: string, values: any[]): this {
    this.filters.push({ col: column, operator: 'in', val: values });
    return this;
  }

  gt(column: string, value: any): this {
    this.filters.push({ col: column, operator: 'gt', val: value });
    return this;
  }

  lt(column: string, value: any): this {
    this.filters.push({ col: column, operator: 'lt', val: value });
    return this;
  }

  gte(column: string, value: any): this {
    this.filters.push({ col: column, operator: 'gte', val: value });
    return this;
  }

  lte(column: string, value: any): this {
    this.filters.push({ col: column, operator: 'lte', val: value });
    return this;
  }

  contains(column: string, value: any): this {
    this.filters.push({ col: column, operator: 'contains', val: value });
    return this;
  }

  ilike(column: string, value: any): this {
    this.filters.push({ col: column, operator: 'ilike', val: value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this._orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(count: number): this {
    this._limit = count;
    return this;
  }

  insert(values: Record<string, any> | Record<string, any>[]): this {
    this._insertValues = values;
    return this;
  }

  update(values: Record<string, any>): this {
    this._updateValues = values;
    return this;
  }

  delete(): this {
    this._deleteFlag = true;
    return this;
  }

  private applyFilters(rows: T[]): T[] {
    return rows.filter((row: any) => {
      return this.filters.every((f) => {
        const rowVal = row[f.col];

        switch (f.operator) {
          case 'eq':
            return String(rowVal) === String(f.val);
          case 'neq':
            return String(rowVal) !== String(f.val);
          case 'in':
            return Array.isArray(f.val) && f.val.some((v) => String(rowVal) === String(v));
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
            return true;
        }
      });
    });
  }

  private applySorting(rows: T[]): T[] {
    if (!this._orderBy) return rows;

    const sorted = [...rows];
    sorted.sort((a: any, b: any) => {
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

    return sorted;
  }

  private applyLimit(rows: T[]): T[] {
    if (this._limit == null) return rows;
    return rows.slice(0, this._limit);
  }

  async execute(): Promise<{ data: T[] | null; error: QueryError }> {
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

      // Handle SELECT queries
      let rows = await layonsApi.getAll<T>(this.table);

      rows = this.applyFilters(rows);
      rows = this.applySorting(rows);
      rows = this.applyLimit(rows);

      return { data: rows, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Query failed' } };
    }
  }

  private async executeInsert(): Promise<{ data: T[] | null; error: QueryError }> {
    try {
      const arr = Array.isArray(this._insertValues) ? this._insertValues : [this._insertValues];
      const results: any[] = [];

      for (const row of arr) {
        try {
          const result = await layonsApi.insert<T>(this.table, row);
          results.push({ ...row, id: result.id });
        } catch (insertError: any) {
          return { data: null, error: { message: insertError?.message || 'Insert failed' } };
        }
      }

      return { data: results as T[], error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Insert failed' } };
    }
  }

  private async executeUpdate(): Promise<{ data: T[] | null; error: QueryError }> {
    try {
      const idFilter = this.filters.find((f) => f.col === 'id' && f.operator === 'eq');
      if (!idFilter) {
        return { data: null, error: { message: 'Update requires eq("id", ...)' } };
      }

      await layonsApi.update<T>(this.table, idFilter.val, this._updateValues!);
      return { data: [{ id: idFilter.val, ...this._updateValues } as any], error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Update failed' } };
    }
  }

  private async executeDelete(): Promise<{ data: T[] | null; error: QueryError }> {
    try {
      const idFilter = this.filters.find((f) => f.col === 'id' && f.operator === 'eq');
      if (!idFilter) {
        return { data: null, error: { message: 'Delete requires eq("id", ...)' } };
      }

      await layonsApi.remove(this.table, idFilter.val);
      return { data: [], error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Delete failed' } };
    }
  }

  async maybeSingle(): Promise<{ data: T | null; error: QueryError }> {
    const { data, error } = await this.execute();
    if (error) return { data: null, error };
    if (!data || data.length === 0) return { data: null, error: null };
    return { data: data[0], error: null };
  }

  async single(): Promise<{ data: T | null; error: QueryError }> {
    return this.maybeSingle();
  }

  async upsert(values: Record<string, any> | Record<string, any>[]): Promise<{ data: T[] | null; error: QueryError }> {
    try {
      const arr = Array.isArray(values) ? values : [values];
      const results: any[] = [];

      for (const row of arr) {
        const hasId = Object.prototype.hasOwnProperty.call(row, 'id') && row.id !== undefined && row.id !== null;

        try {
          if (hasId) {
            const id = row.id;
            const payload = { ...row };
            delete payload.id;
            await layonsApi.update<T>(this.table, id, payload);
            results.push({ ...row });
          } else {
            const result = await layonsApi.insert<T>(this.table, row);
            results.push({ ...row, id: result.id });
          }
        } catch (upsertError: any) {
          return { data: null, error: { message: upsertError?.message || 'Upsert failed' } };
        }
      }

      return { data: results as T[], error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'Upsert failed' } };
    }
  }

  // Promise interface for compatibility with async operations
  async then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | null; error: QueryError }) => TResult1 | Promise<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | Promise<TResult2>) | undefined | null
  ) {
    const res = await this.execute();
    return onfulfilled ? onfulfilled(res) : (res as any);
  }
}

export const phpDb = {
  from<T = any>(table: string) {
    return new QueryBuilder<T>(table);
  },
};
