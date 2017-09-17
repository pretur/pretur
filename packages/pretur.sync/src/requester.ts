import { SpecType, Model, AnySpec } from 'pretur.spec';
import { Bundle } from 'pretur.i18n';
import { debounce, find, compact } from 'lodash';
import { Query } from './query';
import { fetch, FetchStatus } from './fetch';
import {
  SelectRequest,
  OperateRequest,
  MutateRequest,
  ValidateRequest,
  BatchMutateRequest,
  Request,
} from './request';
import { SelectResult, OperateResult, MutateResult, ValidateResult } from './result';
import {
  Response,
  SelectResponse,
  OperateResponse,
  MutateResponse,
  ValidateResponse,
  BatchMutateResponse,
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
  select<T extends SpecType>(model: T['name'], query: Query<T>): Promise<SelectResult<T>>;
  operate<TData, TResult>(name: string, data?: TData): Promise<OperateResult<TResult>>;
  insert<T extends SpecType>(options: InsertOptions<T>): Promise<MutateResult<T>>;
  insert<T extends SpecType>(
    model: T['name'],
    data: Partial<Model<T>>,
  ): Promise<MutateResult<T>>;
  update<T extends SpecType>(options: UpdateOptions<T>): Promise<MutateResult>;
  update<T extends SpecType>(
    model: T['name'],
    attributes: (keyof T['fields'])[],
    data: Partial<T['fields']>,
  ): Promise<MutateResult>;
  remove<T extends SpecType>(options: RemoveOptions<T>): Promise<MutateResult>;
  remove<T extends SpecType>(
    model: T['name'],
    identifiers: Partial<T['fields']>,
  ): Promise<MutateResult>;
  validate<T>(name: string, data: T): Promise<ValidateResult>;
  batchMutateStart(): void;
  batchMutateEnd(): void;
  flush(): void;
  cancel(): void;
}

interface RequestQueueItem<T extends Response> {
  request: Request;
  resolve(result: T): void;
  cancel(): void;
}

interface BatchableRequestQueueItem<T extends SpecType> {
  request: MutateRequest<T>;
  resolve(result: MutateResponse<T>): void;
  cancel(): void;
}

interface BatchRequestMetadata {
  queue: BatchableRequestQueueItem<AnySpec>[];
  requestId: number;
}

export interface BuildRequesterOptions {
  wait?: number;
  maxWait?: number;
  cancelError: (request: Request) => Bundle[];
  networkError: (status: FetchStatus, error?: any) => Bundle[];
}

export function buildRequester(endPoint: string, options: BuildRequesterOptions): Requester {
  let uid = 0;
  function uniqueId() {
    return ++uid;
  }

  const { wait = 200, maxWait = 2000, cancelError, networkError } = options;

  let currBatch: BatchRequestMetadata | undefined = undefined;

  let queue: RequestQueueItem<Response>[] = [];
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
        const target = find(response.body, res => res.requestId === item.request.requestId);
        if (!target) {
          item.resolve(<Response>{
            errors: networkError(
              { ok: false, code: 0, text: 'UNKNOWN' },
              new Error(`Request's response was not found.`),
            ),
            requestId: item.request.requestId,
            type: item.request.type,
          });
        } else {
          item.resolve(target);
        }
      }
    } catch (error) {
      for (const item of pendingQueue) {
        item.resolve(<Response>{
          errors: networkError({ ok: false, code: 0, text: 'UNKNOWN' }, error),
          requestId: item.request.requestId,
          type: item.request.type,
        });
      }
    } finally {
      requestRunning = false;
      if (congested) {
        congested = false;
        debouncedSend();
      }
    }
  }

  function select<T extends SpecType>(model: T['name'], query: Query<T>): Promise<SelectResult<T>> {
    return new Promise<SelectResult<T>>(resolve => {
      const requestId = uniqueId();
      const request: SelectRequest<T> = { model, query, requestId, type: 'select' };

      const item: RequestQueueItem<SelectResponse<T>> = {
        request,
        resolve: ({ requestId: _, ...response }) => resolve(response),
        cancel: () => resolve({ count: 0, data: [], errors: cancelError(request), type: 'select' }),
      };

      queue.push(item);
      debouncedSend();
    });
  }

  function operate<TData, TResult>(name: string, data?: TData): Promise<OperateResult<TResult>> {
    return new Promise<OperateResult<TResult>>(resolve => {
      const requestId = uniqueId();
      const request: OperateRequest<TData> = { data, name, requestId, type: 'operate' };

      const item: RequestQueueItem<OperateResponse<TResult>> = {
        request,
        resolve: ({ requestId: _, ...response }) => resolve(response),
        cancel() {
          resolve({ name, errors: cancelError(request), type: 'operate' });
        },
      };

      queue.push(item);
      debouncedSend();
    });
  }

  function insert<T extends SpecType>(options: InsertOptions<T>): Promise<MutateResult<T>>;
  function insert<T extends SpecType>(
    model: T['name'],
    data: Partial<Model<T>>,
  ): Promise<MutateResult<T>>;
  function insert<T extends SpecType>(
    model: T['name'] | InsertOptions<T>,
    data?: Partial<Model<T>>,
  ): Promise<MutateResult<T>> {
    return new Promise<MutateResult<T>>(resolve => {
      const requestId = uniqueId();
      const request: MutateRequest<T> = {
        action: 'insert',
        data: typeof model === 'string' ? data || {} : model.data,
        model: typeof model === 'string' ? model : model.model,
        requestId,
        type: 'mutate',
      };

      const item: BatchableRequestQueueItem<T> = {
        request,
        resolve: ({ requestId: _, ...response }) => resolve(response),
        cancel: () => resolve({ action: 'insert', errors: cancelError(request), type: 'mutate' }),
      };

      if (currBatch) {
        currBatch.queue.push(item);
      } else {
        queue.push(item);
        debouncedSend();
      }
    });
  }

  function update<T extends SpecType>(options: UpdateOptions<T>): Promise<MutateResult<T>>;
  function update<T extends SpecType>(
    model: T['name'],
    attributes: (keyof T['fields'])[],
    data: Partial<T['fields']>,
  ): Promise<MutateResult<T>>;
  function update<T extends SpecType>(
    model: T['name'] | UpdateOptions<T>,
    attributes?: (keyof T['fields'])[],
    data?: Partial<T['fields']>,
  ): Promise<MutateResult<T>> {
    return new Promise<MutateResult<T>>(resolve => {
      const requestId = uniqueId();
      const request: MutateRequest<T> = {
        action: 'update',
        attributes: typeof model === 'string' ? attributes || [] : model.attributes,
        data: typeof model === 'string' ? data || {} : model.data,
        model: typeof model === 'string' ? model : model.model,
        requestId,
        type: 'mutate',
      };

      const item: BatchableRequestQueueItem<T> = {
        request,
        resolve: ({ requestId: _, ...response }) => resolve(response),
        cancel: () => resolve({ action: 'update', errors: cancelError(request), type: 'mutate' }),
      };

      if (currBatch) {
        currBatch.queue.push(item);
      } else {
        queue.push(item);
        debouncedSend();
      }
    });
  }

  function remove<T extends SpecType>(options: RemoveOptions<T>): Promise<MutateResult<T>>;
  function remove<T extends SpecType>(
    model: T['name'],
    identifiers: Partial<T['fields']>,
  ): Promise<MutateResult<T>>;
  function remove<T extends SpecType>(
    model: T['name'] | RemoveOptions<T>,
    identifiers?: Partial<T['fields']>,
  ): Promise<MutateResult<T>> {
    return new Promise<MutateResult<T>>(resolve => {
      const requestId = uniqueId();
      const request: MutateRequest<T> = {
        action: 'remove',
        identifiers: typeof model === 'string' ? identifiers || {} : model.identifiers,
        model: typeof model === 'string' ? model : model.model,
        requestId,
        type: 'mutate',
      };

      const item: BatchableRequestQueueItem<T> = {
        request,
        resolve: ({ requestId: _, ...response }) => resolve(response),
        cancel: () => resolve({ action: 'remove', errors: cancelError(request), type: 'mutate' }),
      };

      if (currBatch) {
        currBatch.queue.push(item);
      } else {
        queue.push(item);
        debouncedSend();
      }
    });
  }

  function validate<T>(name: string, data: T): Promise<ValidateResult> {
    return new Promise<ValidateResult>(resolve => {
      const requestId = uniqueId();
      const request: ValidateRequest<T> = { data, name, requestId, type: 'validate' };

      const item: RequestQueueItem<ValidateResponse> = {
        request,
        resolve: ({ requestId: _, ...response }) => resolve(response),
        cancel: () => resolve({ name, errors: cancelError(request), type: 'validate' }),
      };

      queue.push(item);
      debouncedSend();
    });
  }

  function batchMutateStart() {
    if (!currBatch) {
      currBatch = {
        queue: [],
        requestId: uniqueId(),
      };
    }
  }

  function batchMutateEnd() {
    if (currBatch) {
      const prevBatch = currBatch;
      currBatch = undefined;

      const request: BatchMutateRequest = {
        queue: prevBatch.queue.map(i => i.request),
        requestId: prevBatch.requestId,
        type: 'batchMutate',
      };

      const item: RequestQueueItem<BatchMutateResponse> = {
        request,
        resolve({ queue: batchQueue, errors }) {
          for (const { request: { action, requestId, type }, resolve } of prevBatch.queue) {
            const target = find(batchQueue, res => res.requestId === request.requestId);
            if (errors.length > 0) {
              resolve({ action, errors, requestId, type });
            } else if (!target) {
              resolve({
                action,
                errors: networkError(
                  { ok: false, code: 0, text: 'UNKNOWN' },
                  new Error(`Request's response was not found.`),
                ),
                requestId,
                type,
              });
            } else {
              resolve(target);
            }
          }
        },
        cancel() {
          for (const batchItem of prevBatch.queue) {
            batchItem.cancel();
          }
        },
      };

      queue.push(item);
      debouncedSend();
    }
  }

  function cancel() {
    congested = false;
    debouncedSend.cancel();
    queue.forEach(item => item.cancel());
    queue = [];
    if (currBatch) {
      currBatch.queue.forEach(item => item.cancel());
      currBatch = undefined;
    }
  }

  function flush() {
    if (currBatch) {
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
