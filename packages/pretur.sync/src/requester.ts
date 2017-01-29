import * as Bluebird from 'bluebird';
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

export type InsertOptions<T> = { data: Partial<T>, model: string };
export type UpdateOptions<T> = { data: Partial<T>, attributes: (keyof T)[], model: string };
export type RemoveOptions<T> = { identifiers: Partial<T>, model: string };

export interface Requester {
  select<T>(query: Query<T>): Bluebird<SelectResult<T>>;
  operate<TData, TResult>(name: string, data?: TData): Bluebird<OperateResult<TResult>>;
  insert<T>(options: InsertOptions<T>): Bluebird<InsertMutateResult<T>>;
  insert<T>(model: string, data: Partial<T>): Bluebird<InsertMutateResult<T>>;
  update<T>(options: UpdateOptions<T>): Bluebird<UpdateMutateResult>;
  update<T>(model: string, attributes: (keyof T)[], data: Partial<T>): Bluebird<UpdateMutateResult>;
  remove<T>(options: RemoveOptions<T>): Bluebird<RemoveMutateResult>;
  remove<T>(model: string, identifiers: Partial<T>): Bluebird<RemoveMutateResult>;
  validate<T>(name: string, data: T): Bluebird<ValidateResult>;
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

  async function send(): Bluebird<void> {
    if (requestRunning) {
      congested = true;
      return;
    }

    const pendingQueue = compact(queue);
    queue = [];
    requestRunning = true;
    fetch<Response[]>({
      body: pendingQueue.map(item => item.request),
      json: true,
      method: 'POST',
      url: endPoint,
    }).then(response => {
      for (const item of pendingQueue) {
        item.resolve({
          body: find(response.body, res => res.requestId === item.request.requestId),
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        });
      }
    }).catch(error => {
      for (const item of pendingQueue) {
        item.reject(error);
      }
    }).finally(() => {
      requestRunning = false;
      if (congested) {
        congested = false;
        debouncedSend();
      }
    });
  }

  function select<T>(query: Query<T>): Bluebird<SelectResult<T>> {
    return new Bluebird<SelectResult<T>>((resolve, reject) => {
      const requestId = uniqueId();
      const request: RequestQueueItem = {
        reject,
        request: <SelectRequest<T>>{
          type: 'select',
          query,
          requestId,
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

  function operate<TData, TResult>(name: string, data?: TData): Bluebird<OperateResult<TResult>> {
    return new Bluebird<OperateResult<TResult>>((resolve, reject) => {
      const requestId = uniqueId();
      const request: RequestQueueItem = {
        reject,
        request: <OperateRequest<TData>>{
          type: 'operate',
          name,
          data,
          requestId,
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

  function insert<T>(options: InsertOptions<T>): Bluebird<InsertMutateResult<T>>;
  function insert<T>(model: string, data: Partial<T>): Bluebird<InsertMutateResult<T>>;
  function insert<T>(model: string | InsertOptions<T>, data?: T): Bluebird<InsertMutateResult<T>> {
    return new Bluebird<InsertMutateResult<T>>((resolve, reject) => {
      const requestId = uniqueId();
      const request: BatchableRequestQueueItem = {
        reject,
        request: <InsertMutateRequest<T>>{
          action: 'insert',
          data: typeof model === 'string' ? data : model.data,
          model: typeof model === 'string' ? model : model.model,
          type: 'mutate',
          requestId,
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
            validationError: response.body.validationError,
            warnings: response.body.warnings,
          });
        },
        cancel() {
          resolve({
            ...unknownErrorBase,
            action: 'insert',
            transactionFailed: false,
            type: 'mutate',
            validationError: undefined,
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

  function update<T>(options: UpdateOptions<T>): Bluebird<UpdateMutateResult>;
  function update<T>(model: string, attributes: (keyof T)[], data: T): Bluebird<UpdateMutateResult>;
  function update<T>(
    model: string | UpdateOptions<T>,
    attributes?: (keyof T)[],
    data?: T,
  ): Bluebird<UpdateMutateResult> {
    return new Bluebird<UpdateMutateResult>((resolve, reject) => {
      const requestId = uniqueId();
      const request: BatchableRequestQueueItem = {
        reject,
        request: <UpdateMutateRequest<T>>{
          action: 'update',
          attributes: typeof model === 'string' ? attributes : model.attributes,
          data: typeof model === 'string' ? data : model.data,
          model: typeof model === 'string' ? model : model.model,
          type: 'mutate',
          requestId,
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
            validationError: response.body.validationError,
            warnings: response.body.warnings,
          });
        },
        cancel() {
          resolve({
            ...unknownErrorBase,
            action: 'update',
            transactionFailed: false,
            type: 'mutate',
            validationError: undefined,
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

  function remove<T>(options: RemoveOptions<T>): Bluebird<RemoveMutateResult>;
  function remove<T>(model: string, identifiers: T): Bluebird<RemoveMutateResult>;
  function remove<T>(
    model: string | RemoveOptions<T>,
    identifiers?: T,
  ): Bluebird<RemoveMutateResult> {
    return new Bluebird<RemoveMutateResult>((resolve, reject) => {
      const requestId = uniqueId();
      const request: BatchableRequestQueueItem = {
        reject,
        request: <RemoveMutateRequest<T>>{
          action: 'remove',
          identifiers: typeof model === 'string' ? identifiers : model.identifiers,
          model: typeof model === 'string' ? model : model.model,
          type: 'mutate',
          requestId,
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
            validationError: response.body.validationError,
            warnings: response.body.warnings,
          });
        },
        cancel() {
          resolve({
            ...unknownErrorBase,
            action: 'remove',
            transactionFailed: false,
            type: 'mutate',
            validationError: undefined,
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

  function validate<T>(name: string, data: T): Bluebird<ValidateResult> {
    return new Bluebird<ValidateResult>((resolve, reject) => {
      const requestId = uniqueId();
      const request: RequestQueueItem = {
        reject,
        request: <ValidateRequest<T>>{
          type: 'validate',
          name,
          data,
          requestId,
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
          previousBatch.queue.forEach(item => item.reject(error));
        },
        cancel() {
          previousBatch.queue.forEach(item => item.cancel());
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
    select,
    operate,
    insert,
    update,
    remove,
    validate,
    batchMutateStart,
    batchMutateEnd,
    cancel,
    flush,
  };
}
