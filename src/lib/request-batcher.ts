interface BatchRequest<T = any> {
  id: string;
  operation: string;
  payload: any;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
}

interface BatchOptions {
  maxBatchSize?: number;
  batchTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

class RequestBatcher {
  private queue = new Map<string, BatchRequest[]>();
  private timeouts = new Map<string, number>();
  private processing = false;
  private readonly maxBatchSize: number;
  private readonly batchTimeout: number;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;

  constructor(options: BatchOptions = {}) {
    this.maxBatchSize = options.maxBatchSize || 50;
    this.batchTimeout = options.batchTimeout || 50;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  async add<T>(
    operation: string,
    payload: any,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: BatchRequest<T> = {
        id: crypto.randomUUID(),
        operation,
        payload,
        resolve,
        reject,
        timestamp: Date.now(),
        priority
      };

      this.addToQueue(operation, request);
      this.scheduleProcessing(operation, priority);
    });
  }

  private addToQueue(operation: string, request: BatchRequest): void {
    if (!this.queue.has(operation)) {
      this.queue.set(operation, []);
    }
    this.queue.get(operation)!.push(request);
  }

  private scheduleProcessing(operation: string, priority: 'high' | 'normal' | 'low'): void {
    if (this.timeouts.has(operation)) {
      window.clearTimeout(this.timeouts.get(operation));
    }

    const timeout = window.setTimeout(
      () => this.processBatch(operation),
      this.getPriorityTimeout(priority)
    );

    this.timeouts.set(operation, timeout);

    if (this.queue.get(operation)!.length >= this.maxBatchSize) {
      this.processBatch(operation);
    }
  }

  private getPriorityTimeout(priority: 'high' | 'normal' | 'low'): number {
    const timeouts = {
      high: this.batchTimeout / 2,
      normal: this.batchTimeout,
      low: this.batchTimeout * 2
    };
    return timeouts[priority];
  }

  private async processBatch(operation: string, attempt: number = 1): Promise<void> {
    if (this.processing || !this.queue.has(operation)) return;

    this.processing = true;
    const batch = this.getBatchToProcess(operation);

    try {
      const results = await this.executeBatch(operation, batch);
      this.handleResults(batch, results);
    } catch (error) {
      if (attempt < this.retryAttempts) {
        await this.retryBatch(operation, attempt);
      } else {
        this.handleBatchError(batch, error);
      }
    } finally {
      this.processing = false;
      this.processRemainingItems(operation);
    }
  }

  private getBatchToProcess(operation: string): BatchRequest[] {
    const batch = this.queue.get(operation)!;
    this.queue.delete(operation);
    this.timeouts.delete(operation);
    return batch;
  }

  private async retryBatch(operation: string, attempt: number): Promise<void> {
    const delay = this.retryDelay * Math.pow(2, attempt - 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    return this.processBatch(operation, attempt + 1);
  }

  private handleResults(batch: BatchRequest[], results: Array<{ data?: any; error?: string }>): void {
    batch.forEach((request, index) => {
      if (results[index].error) {
        request.reject(new Error(results[index].error));
      } else {
        request.resolve(results[index].data);
      }
    });
  }

  private handleBatchError(batch: BatchRequest[], error: unknown): void {
    batch.forEach(request => {
      request.reject(error instanceof Error ? error : new Error('Batch processing failed'));
    });
  }

  private processRemainingItems(operation: string): void {
    if (this.queue.has(operation) && this.queue.get(operation)!.length > 0) {
      this.processBatch(operation);
    }
  }

  private async executeBatch(
    operation: string,
    batch: BatchRequest[]
  ): Promise<Array<{ data?: any; error?: string }>> {
    // Sort batch by priority and timestamp
    batch.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      return priorityDiff === 0 ? a.timestamp - b.timestamp : priorityDiff;
    });

    // Execute batch based on operation type
    switch (operation) {
      case 'fetch':
        return Promise.all(
          batch.map(async request => {
            try {
              const response = await fetch(request.payload.url, request.payload.options);
              const data = await response.json();
              return { data };
            } catch (error) {
              return { error: error instanceof Error ? error.message : 'Request failed' };
            }
          })
        );

      case 'supabase':
        return Promise.all(
          batch.map(async request => {
            try {
              const { data, error } = await request.payload.query;
              if (error) throw error;
              return { data };
            } catch (error) {
              return { error: error instanceof Error ? error.message : 'Database operation failed' };
            }
          })
        );

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  clear(): void {
    this.queue.clear();
    this.timeouts.forEach(timeout => window.clearTimeout(timeout));
    this.timeouts.clear();
    this.processing = false;
  }

  getStats(): {
    queueSizes: Record<string, number>;
    processing: boolean;
  } {
    const queueSizes: Record<string, number> = {};
    this.queue.forEach((batch, operation) => {
      queueSizes[operation] = batch.length;
    });

    return {
      queueSizes,
      processing: this.processing
    };
  }
}

export const requestBatcher = new RequestBatcher();