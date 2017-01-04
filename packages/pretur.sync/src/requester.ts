import * as Bluebird from 'bluebird';
import { debounce, find, compact, remove as lodashRemove } from 'lodash';
import { Query } from './query';
import { fetch, FetchResponse } from './fetch';
import {
  SelectRequest,
  RefreshRequest,
  OperateRequest,
  InsertRequest,
  UpdateRequest,
  RemoveRequest,
  ValidateRequest,
  BatchRequest,
  Request,
} from './request';
import {
  SelectResult,
  RefreshResult,
  OperateResult,
  InsertResult,
  UpdateResult,
  RemoveResult,
  ValidateResult,
} from './result';
import {
  SelectResponse,
  RefreshResponse,
  OperateResponse,
  InsertResponse,
  UpdateResponse,
  RemoveResponse,
  ValidateResponse,
  BatchResponse,
  Response,
} from './response';

export interface Requester {
  select<T>(query: Query<T>): Bluebird<SelectResult<T>>;
  refresh<T>(query: Query<T>, orchestrator: string): Bluebird<RefreshResult<T>>;
  operate<TData, TResult>(name: string, data?: TData): Bluebird<OperateResult<TResult>>;
  insert<T>(model: string, data: T): Bluebird<InsertResult<T>>;
  update<T>(model: string, attributes: (keyof T)[], data: T): Bluebird<UpdateResult>;
  remove<T>(model: string, identifiers: T): Bluebird<RemoveResult>;
  validate<T>(name: string, data: T): Bluebird<ValidateResult>;
  batchStart(): void;
  batchEnd(): void;
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

interface BatchRequestMetadata {
  queue: RequestQueueItem[];
  requestId: number;
}

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
      body: pendingQueue,
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
            cancelled: true,
            type: 'select',
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

  function refresh<T>(query: Query<T>, orchestrator: string): Bluebird<RefreshResult<T>> {
    return new Bluebird<RefreshResult<T>>((resolve, reject) => {
      const requestId = uniqueId();
      const request: RequestQueueItem = {
        reject,
        orchestrator,
        request: <RefreshRequest<T>>{
          type: 'refresh',
          query,
          requestId,
        },
        resolve(response: FetchResponse<RefreshResponse<T>>) {
          resolve({
            cancelled: false,
            count: response.body.count,
            data: response.body.data,
            errors: response.body.errors,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            type: 'refresh',
            warnings: response.body.warnings,
          });
        },
        cancel() {
          resolve({
            cancelled: true,
            type: 'refresh',
          });
        },
      };
      if (currentBatch) {
        const removedRefreshRequests
          = lodashRemove(currentBatch.queue, req => req.orchestrator === orchestrator);
        removedRefreshRequests.forEach(req => req.cancel());
        currentBatch.queue.push(request);
      } else {
        const removedRefreshRequests
          = lodashRemove(queue, req => req.orchestrator === orchestrator);
        removedRefreshRequests.forEach(req => req.cancel());
        queue.push(request);
        debouncedSend();
      }
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
            name,
            cancelled: true,
            type: 'operate',
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

  function insert<T>(model: string, data: T): Bluebird<InsertResult<T>> {
    return new Bluebird<InsertResult<T>>((resolve, reject) => {
      const requestId = uniqueId();
      const request: RequestQueueItem = {
        reject,
        request: <InsertRequest<T>>{
          type: 'insert',
          model,
          data,
          requestId,
        },
        resolve(response: FetchResponse<InsertResponse<T>>) {
          resolve({
            cancelled: false,
            errors: response.body.errors,
            generatedId: response.body.generatedId,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            transactionFailed: response.body.transactionFailed,
            type: 'insert',
            validationError: response.body.validationError,
            warnings: response.body.warnings,
          });
        },
        cancel() {
          resolve({
            cancelled: true,
            transactionFailed: false,
            type: 'insert',
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

  function update<T>(model: string, attributes: (keyof T)[], data: T): Bluebird<UpdateResult> {
    return new Bluebird<UpdateResult>((resolve, reject) => {
      const requestId = uniqueId();
      const request: RequestQueueItem = {
        reject,
        request: <UpdateRequest<T>>{
          type: 'update',
          model,
          attributes,
          data,
          requestId,
        },
        resolve(response: FetchResponse<UpdateResponse>) {
          resolve({
            cancelled: false,
            errors: response.body.errors,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            transactionFailed: response.body.transactionFailed,
            type: 'update',
            validationError: response.body.validationError,
            warnings: response.body.warnings,
          });
        },
        cancel() {
          resolve({
            cancelled: true,
            transactionFailed: false,
            type: 'update',
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

  function remove<T>(model: string, identifiers: T): Bluebird<RemoveResult> {
    return new Bluebird<RemoveResult>((resolve, reject) => {
      const requestId = uniqueId();
      const request: RequestQueueItem = {
        reject,
        request: <RemoveRequest<T>>{
          type: 'remove',
          model,
          identifiers,
          requestId,
        },
        resolve(response: FetchResponse<RemoveResponse>) {
          resolve({
            cancelled: false,
            errors: response.body.errors,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            transactionFailed: response.body.transactionFailed,
            type: 'remove',
            validationError: response.body.validationError,
            warnings: response.body.warnings,
          });
        },
        cancel() {
          resolve({
            cancelled: true,
            transactionFailed: false,
            type: 'remove',
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
            name,
            cancelled: true,
            type: 'validate',
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

  function batchStart() {
    if (!currentBatch) {
      currentBatch = {
        queue: [],
        requestId: uniqueId(),
      };
    }
  }

  function batchEnd() {
    if (currentBatch) {
      const previousBatch = currentBatch;
      currentBatch = undefined;
      queue.push({
        request: <BatchRequest>{
          queue: previousBatch.queue.map(item => item.request),
          requestId: previousBatch.requestId,
          type: 'batch',
        },
        resolve(response: FetchResponse<BatchResponse>) {
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
      batchEnd();
    }
    if (!requestRunning) {
      debouncedSend.flush();
    } else {
      congested = true;
    }
  }

  return {
    select,
    refresh,
    operate,
    insert,
    update,
    remove,
    validate,
    batchStart,
    batchEnd,
    cancel,
    flush,
  };
}
