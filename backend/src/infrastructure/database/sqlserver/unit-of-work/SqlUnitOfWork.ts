import mssql from 'mssql';
import { IUnitOfWork } from '../../../../domain/repositories/IUnitOfWork';
import { SqlConnectionFactory } from '../connection';

export class SqlUnitOfWork implements IUnitOfWork {
  private transaction: mssql.Transaction | null = null;

  public async startTransaction(): Promise<void> {
    if (this.transaction) {
      throw new Error('Transaction already started.');
    }
    const pool = await SqlConnectionFactory.getPool();
    this.transaction = new mssql.Transaction(pool);
    await this.transaction.begin();
  }

  public async commitTransaction(): Promise<void> {
    if (!this.transaction) {
      throw new Error('No active transaction to commit.');
    }
    await this.transaction.commit();
    this.transaction = null;
  }

  public async rollbackTransaction(): Promise<void> {
    if (!this.transaction) {
      return;
    }
    try {
      await this.transaction.rollback();
    } catch (err) {
      // Ignore if transaction was already aborted/rolled back
    } finally {
      this.transaction = null;
    }
  }

  public async complete<T>(work: () => Promise<T>): Promise<T> {
    await this.startTransaction();
    try {
      const result = await work();
      await this.commitTransaction();
      return result;
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  public getTransactionRequest(): mssql.Request {
    if (!this.transaction) {
      throw new Error('No active transaction.');
    }
    return new mssql.Request(this.transaction);
  }

  public hasActiveTransaction(): boolean {
    return this.transaction !== null;
  }
}
