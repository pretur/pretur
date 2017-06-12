import { SpecType, Model } from 'pretur.spec';
import { debounce, find, compact } from 'lodash';
import { Query } from './query';
import { fetch, FetchResponse } from './fetch';
import {
  SelectRequest,
  OperateRequest,
  InsertMutateRequest,
  UpdateMutateRequest,
  RemoveMutateRequest,
  MutateRequest,
  ValidateRequest,
  BatchMutateRequest,
  Request,
} from './request';
import {
  SelectResult,
  OperateResult,
  InsertMutateResult,
  UpdateMutateResult,
  RemoveMutateResult,
  ValidateResult,
} from './result';
import {
  SelectResponse,
  OperateResponse,
  InsertMutateResponse,
  UpdateMutateResponse,
  RemoveMutateResponse,
  ValidateResponse,
  BatchMutateResponse,
  Response,
} from './response';

export type InsertOptions<T extends SpecType> = {
  data: Partial<Model<T>>;
  model: T['name'];
};

export type UpdateOptions<T extends SpecType> = {
  data: Partial<T['fields']>;
  attributes: (keyof T['fields'])[];
  model: T['name'];
};

export type RemoveOptions<T extends SpecType> = {
  identifiers: Partial<T['fields']>;
  model: T['name'];
};

export interface Requester {
  select<T extends SpecType>(query: Query<T>): Promise<SelectResult<T>>;
  operate<TData, TResult>(name: string, data?: TData): Promise<OperateResult<TResult>>;
  insert<T extends SpecType>(options: InsertOptions<T>): Promise<InsertMutateResult<T>>;
  insert<T extends SpecType>(
    model: T['name'],
    data: Partial<Model<T>>,
  ): Promise<InsertMutateResult<T>>;
  update<T extends SpecType>(options: UpdateOptions<T>): Promise<UpdateMutateResult>;
  update<T extends SpecType>(
    model: T['name'],
    attributes: (keyof T['fields'])[],
    data: Partial<T['fields']>,
  ): Promise<UpdateMutateResult>;
  remove<T extends SpecType>(options: RemoveOptions<T>): Promise<RemoveMutateResult>;
  remove<T extends SpecType>(
    model: T['name'],
    identifiers: Partial<T['fields']>,
  ): Promise<RemoveMutateResult>;
  validate<T>(name: string, data: T): Promise<ValidateResult>;
  batchMutateStart(): void;
  batchMutateEnd(): void;
  flush(): void;
  cancel(): void;
}

interface RequestQueueItem {
  request: Request;
  orchestrator?: string;
  resolve<T>(result: FetchResponse<T>): void;
  reject(error: any): void;
  cancel(): void;
}

interface BatchableRequestQueueItem {
  request: MutateRequest<any>;
  resolve<T>(result: FetchResponse<T>): void;
  reject(error: any): void;
  cancel(): void;
}

interface BatchRequestMetadata {
  queue: BatchableRequestQueueItem[];
  requestId: number;
}

const unknownErrorBase = {
  cancelled: true,
  ok: false,
  status: 0,
  statusText: 'UNKNOWN_ERROR',
};

export function buildRequester(endPoint: string, wait = 200, maxWait = 2000): Requester {
  let _uniqueId = 0;
  function uniqueId() {
    return ++_uniqueId;
  }

  let currentBatch: BatchRequestMetadata | undefined = undefined;

  let queue: RequestQueueItem[] = [];
  let requestRunning = false;
  let congested = false;

  const debouncedSend = debounce(send, wait, { maxWait });

  async function send() {
    if (requestRunning) {
      congested = true;
      return;
    }

    const pendingQueue = compact(queue);
    queue = [];
    requestRunning = true;

    try {
      const response = await fetch<Response[]>({
        body: pendingQueue.map(item => item.request),
        json: true,
        method: 'POST',
        url: endPoint,
      });
      for (const item of pendingQueue) {
        item.resolve({
          body: find(response.body, res => res.requestId === item.request.requestId),
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        });
      }
    } catch (error) {
      for (const item of pendingQueue) {
        item.reject(error);
      }
    } finally {
      requestRunning = false;
      if (congested) {
        congested = false;
        debouncedSend();
      }
    }
  }

  function select<T extends SpecType>(query: Query<T>): Promise<SelectResult<T>> {
    return new Promise<SelectResult<T>>((resolve, reject) => {
      const requestId = uniqueId();
      const request: RequestQueueItem = {
        reject,
        request: <SelectRequest<T>>{
          query,
          requestId,
          type: 'select',
        },
        resolve(response: FetchResponse<SelectResponse<T>>) {
          resolve({
            cancelled: false,
            count: response.body.count,
            data: response.body.data,
            errors: response.body.errors,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            type: 'select',
            warnings: response.body.warnings,
          });
        },
        cancel() {
          resolve({
            ...unknownErrorBase,
            type: 'select',
          });
        },
      };
      queue.push(request);
      debouncedSend();
    });
  }

  function operate<TData, TResult>(name: string, data?: TData): Promise<OperateResult<TResult>> {
    return new Promise<OperateResult<TResult>>((resolve, reject) => {
      const requestId = uniqueId();
      const request: RequestQueueItem = {
        reject,
        request: <OperateRequest<TData>>{
          data,
          name,
          requestId,
          type: 'operate',
        },
        resolve(response: FetchResponse<OperateResponse<TResult>>) {
          resolve({
            cancelled: false,
            data: response.body.data,
            errors: response.body.errors,
            name: response.body.name,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            type: 'operate',
            warnings: response.body.warnings,
          });
        },
        cancel() {
          resolve({
            ...unknownErrorBase,
            name,
            type: 'operate',
          });
        },
      };
      queue.push(request);
      debouncedSend();
    });
  }

  function insert<T extends SpecType>(options: InsertOptions<T>): Promise<InsertMutateResult<T>>;
  function insert<T extends SpecType>(
    model: T['name'],
    data: Partial<Model<T>>,
  ): Promise<InsertMutateResult<T>>;
  function insert<T extends SpecType>(
    model: T['name'] | InsertOptions<T>,
    data?: Partial<Model<T>>,
  ): Promise<InsertMutateResult<T>> {
    return new Promise<InsertMutateResult<T>>((resolve, reject) => {
      const requestId = uniqueId();
      const request: BatchableRequestQueueItem = {
        reject,
        request: <InsertMutateRequest<T>>{
          action: 'insert',
          data: typeof model === 'string' ? data : model.data,
          model: typeof model === 'string' ? model : model.model,
          requestId,
          type: 'mutate',
        },
        resolve(response: FetchResponse<InsertMutateResponse<T>>) {
          resolve({
            action: 'insert',
            cancelled: false,
            errors: response.body.errors,
            generatedId: response.body.generatedId,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            transactionFailed: response.body.transactionFailed,
            type: 'mutate',
            warnings: response.body.warnings,
          });
        },
        cancel() {
          resolve({
            ...unknownErrorBase,
            action: 'insert',
            transactionFailed: false,
            type: 'mutate',
          });
        },
      };
      if (currentBatch) {
        currentBatch.queue.push(request);
      } else {
        queue.push(request);
        debouncedSend();
      }
    });
  }

  function update<T extends SpecType>(options: UpdateOptions<T>): Promise<UpdateMutateResult>;
  function update<T extends SpecType>(
    model: T['name'],
    attributes: (keyof T['fields'])[],
    data: Partial<T['fields']>,
  ): Promise<UpdateMutateResult>;
  function update<T extends SpecType>(
    model: T['name'] | UpdateOptions<T>,
    attributes?: (keyof T['fields'])[],
    data?: Partial<T['fields']>,
  ): Promise<UpdateMutateResult> {
    return new Promise<UpdateMutateResult>((resolve, reject) => {
      const requestId = uniqueId();
      const request: BatchableRequestQueueItem = {
        reject,
        request: <UpdateMutateRequest<T>>{
          action: 'update',
          attributes: typeof model === 'string' ? attributes : model.attributes,
          data: typeof model === 'string' ? data : model.data,
          model: typeof model === 'string' ? model : model.model,
          requestId,
          type: 'mutate',
        },
        resolve(response: FetchResponse<UpdateMutateResponse>) {
          resolve({
            action: 'update',
            cancelled: false,
            errors: response.body.errors,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            transactionFailed: response.body.transactionFailed,
            type: 'mutate',
            warnings: response.body.warnings,
          });
        },
        cancel() {
          resolve({
            ...unknownErrorBase,
            action: 'update',
            transactionFailed: false,
            type: 'mutate',
          });
        },
      };
      if (currentBatch) {
        currentBatch.queue.push(request);
      } else {
        queue.push(request);
        debouncedSend();
      }
    });
  }

  function remove<T extends SpecType>(options: RemoveOptions<T>): Promise<RemoveMutateResult>;
  function remove<T extends SpecType>(
    model: T['name'],
    identifiers: Partial<T['fields']>,
  ): Promise<RemoveMutateResult>;
  function remove<T extends SpecType>(
    model: T['name'] | RemoveOptions<T>,
    identifiers?: Partial<T['fields']>,
  ): Promise<RemoveMutateResult> {
    return new Promise<RemoveMutateResult>((resolve, reject) => {
      const requestId = uniqueId();
      const request: BatchableRequestQueueItem = {
        reject,
        request: <RemoveMutateRequest<T>>{
          action: 'remove',
          identifiers: typeof model === 'string' ? identifiers : model.identifiers,
          model: typeof model === 'string' ? model : model.model,
          requestId,
          type: 'mutate',
        },
        resolve(response: FetchResponse<RemoveMutateResponse>) {
          resolve({
            action: 'remove',
            cancelled: false,
            errors: response.body.errors,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            transactionFailed: response.body.transactionFailed,
            type: 'mutate',
            warnings: response.body.warnings,
          });
        },
        cancel() {
          resolve({
            ...unknownErrorBase,
            action: 'remove',
            transactionFailed: false,
            type: 'mutate',
          });
        },
      };
      if (currentBatch) {
        currentBatch.queue.push(request);
      } else {
        queue.push(request);
        debouncedSend();
      }
    });
  }

  function validate<T>(name: string, data: T): Promise<ValidateResult> {
    return new Promise<ValidateResult>((resolve, reject) => {
      const requestId = uniqueId();
      const request: RequestQueueItem = {
        reject,
        request: <ValidateRequest<T>>{
          data,
          name,
          requestId,
          type: 'validate',
        },
        resolve(response: FetchResponse<ValidateResponse>) {
          resolve({
            cancelled: false,
            errors: response.body.errors,
            name: response.body.name,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            type: 'validate',
            validationError: response.body.validationError,
            warnings: response.body.warnings,
          });
        },
        cancel() {
          resolve({
            ...unknownErrorBase,
            name,
            type: 'validate',
            validationError: undefined,
          });
        },
      };
      queue.push(request);
      debouncedSend();
    });
  }

  function batchMutateStart() {
    if (!currentBatch) {
      currentBatch = {
        queue: [],
        requestId: uniqueId(),
      };
    }
  }

  function batchMutateEnd() {
    if (currentBatch) {
      const previousBatch = currentBatch;
      currentBatch = undefined;
      queue.push({
        request: <BatchMutateRequest>{
          queue: previousBatch.queue.map(item => item.request),
          requestId: previousBatch.requestId,
          type: 'batchMutate',
        },
        resolve(response: FetchResponse<BatchMutateResponse>) {
          for (const item of previousBatch.queue) {
            item.resolve({
              body: find(response.body.queue, res => res.requestId === item.request.requestId),
              ok: response.ok,
              status: response.status,
              statusText: response.statusText,
            });
          }
        },
        reject(error: any) {
          for (const item of previousBatch.queue) {
             item.reject(error);
          }
        },
        cancel() {
          for (const item of previousBatch.queue) {
             item.cancel();
          }
        },
      });
      debouncedSend();
    }
  }

  function cancel() {
    congested = false;
    debouncedSend.cancel();
    queue.forEach(item => item.cancel());
    queue = [];
    if (currentBatch) {
      currentBatch.queue.forEach(item => item.cancel());
      currentBatch = undefined;
    }
  }

  function flush() {
    if (currentBatch) {
      batchMutateEnd();
    }
    if (!requestRunning) {
      debouncedSend.flush();
    } else {
      congested = true;
    }
  }

  return {
    batchMutateEnd,
    batchMutateStart,
    cancel,
    flush,
    insert,
    operate,
    remove,
    select,
    update,
    validate,
  };
}
