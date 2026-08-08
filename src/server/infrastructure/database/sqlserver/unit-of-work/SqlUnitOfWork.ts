import { AsyncLocalStorage } from 'async_hooks';
import mssql from 'mssql';
import { IUnitOfWork } from '../../../../domain/repositories/IUnitOfWork';
import { SqlConnectionFactory } from '../connection';

const asyncLocalStorage = new AsyncLocalStorage<mssql.Transaction>();

export class SqlUnitOfWork implements IUnitOfWork {
  private fallbackTransaction: mssql.Transaction | null = null;

  public async startTransaction(): Promise<void> {
    const storeTx = asyncLocalStorage.getStore();
    if (storeTx || this.fallbackTransaction) {
      return;
    }
    const pool = await SqlConnectionFactory.getPool();
    this.fallbackTransaction = new mssql.Transaction(pool);
    await this.fallbackTransaction.begin();
  }

  public async commitTransaction(): Promise<void> {
    const storeTx = asyncLocalStorage.getStore();
    if (storeTx) return;
    if (this.fallbackTransaction) {
      await this.fallbackTransaction.commit();
      this.fallbackTransaction = null;
    }
  }

  public async rollbackTransaction(): Promise<void> {
    const storeTx = asyncLocalStorage.getStore();
    if (storeTx) return;
    if (this.fallbackTransaction) {
      try {
        await this.fallbackTransaction.rollback();
      } catch (err) {
        // Ignore if transaction was already aborted/rolled back
      } finally {
        this.fallbackTransaction = null;
      }
    }
  }

  public async complete<T>(work: () => Promise<T>): Promise<T> {
    const existingTx = asyncLocalStorage.getStore();
    if (existingTx) {
      return await work();
    }

    const pool = await SqlConnectionFactory.getPool();
    const transaction = new mssql.Transaction(pool);
    await transaction.begin();

    return await asyncLocalStorage.run(transaction, async () => {
      try {
        const result = await work();
        await transaction.commit();
        return result;
      } catch (error) {
        try {
          await transaction.rollback();
        } catch {
          // Ignore rollback failure
        }
        throw error;
      }
    });
  }

  public getTransactionRequest(): mssql.Request {
    const tx = this.getTransaction();
    return new mssql.Request(tx);
  }

  public getTransaction(): mssql.Transaction {
    const tx = asyncLocalStorage.getStore() || this.fallbackTransaction;
    if (!tx) {
      throw new Error('No active transaction.');
    }
    return tx;
  }

  public hasActiveTransaction(): boolean {
    return Boolean(asyncLocalStorage.getStore() || this.fallbackTransaction);
  }
}
