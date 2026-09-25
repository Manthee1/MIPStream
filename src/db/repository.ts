import { IOrderQuery, IWhereQuery } from "jsstore";
import db from "./database";

/**
 * A generic repository for common IndexedDB operations via JsStore.
 */
export class BaseRepository<T> {
  constructor(protected tableName: string) {}

  async getAll(query: { limit?: number, order?: IOrderQuery, where?: IWhereQuery } = {}): Promise<T[]> {
    return await db.select({
      from: this.tableName,
      ...query
    }) as T[];
  }

  async getById(id: number | string): Promise<T | undefined> {
    const results = await db.select({
      from: this.tableName,
      where: { id }
    }) as T[];
    return results[0];
  }

  async insert(item: T | T[]): Promise<T[]> {
    const values = Array.isArray(item) ? item : [item];
    return await db.insert({
      into: this.tableName,
      values,
      return: true
    }) as T[];
  }

  async update(id: number | string, data: Partial<T>): Promise<number> {
    return await db.update({
      in: this.tableName,
      set: data,
      where: { id }
    });
  }

  async delete(id: number | string): Promise<number> {
    return await db.remove({
      from: this.tableName,
      where: { id }
    });
  }

  async count(where?: IWhereQuery): Promise<number> {
    return await db.count({
      from: this.tableName,
      where
    });
  }
}
