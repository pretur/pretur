import { EmptySpec } from 'pretur.spec';
import { Bundle } from 'pretur.i18n';
import { Query } from './query';
import { Request, OperateRequest, ValidateRequest, MutateRequest } from './request';
import {
  Response, OperateResponse, ValidateResponse, MutateResponse, BatchMutateResponse,
} from './response';

// Manually import some types to decouple the librarires
export interface TransactionLike {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface ResolveResult {
  data: any[];
  count: number;
}

export interface SyncResult {
  errors: Bundle[];
  generatedIds?: any;
}

export interface PoolLike<C> {
  resolve(
    transaction: any,
    scope: string,
    model: string,
    query: Query<EmptySpec>,
    context?: C,
  ): Promise<ResolveResult>;
  sync(
    transaction: any,
    item: MutateRequest,
    context?: C,
  ): Promise<SyncResult>;
}

export interface ResponderOptions<C> {
  errorToBundle: (error: Error) => Bundle;
  pool?: PoolLike<C>;
  operator?: (request: OperateRequest, context?: C) => PromiseLike<OperateResponse>;
  validator?: (request: ValidateRequest, context?: C) => PromiseLike<ValidateResponse>;
  transact?: () => PromiseLike<TransactionLike>;
}

export function buildResponder<C>(options: ResponderOptions<C>) {
  const { errorToBundle, pool, operator, validator, transact } = options;

  return async function responder(requests: Request[], context?: any): Promise<Response[]> {
    if (!Array.isArray(requests) || requests.length === 0) {
      return [];
    }

    const responses: Response[] = [];

    for (const request of requests) {
      const requestId = request.requestId;

      switch (request.type) {
        case 'select':
          try {
            if (!transact || !pool) {
              throw new Error('select requests require transact and pool to operate.');
            }
            const tr = await transact();
            try {
              const { data, count } = await pool.resolve(
                tr,
                request.scope,
                request.model,
                request.query,
                context,
              );
              tr.commit();
              responses.push({ errors: [], count, data, requestId, type: 'select' });
            } catch (error) {

              responses.push({
                errors: [errorToBundle(error)],
                count: 0,
                data: [],
                requestId,
                type: 'select',
              });
              tr.rollback();
            }
          } catch (error) {
            responses.push({
              count: 0,
              data: [],
              errors: [errorToBundle(error)],
              requestId,
              type: 'select',
            });
          }
          break;
        case 'operate':
          try {
            if (!operator) {
              throw new Error('operate requests require an operator.');
            }
            responses.push(await operator(request, context));
          } catch (error) {
            responses.push({
              errors: [errorToBundle(error)],
              name: request.name,
              requestId,
              type: 'operate',
            });
          }
          break;
        case 'mutate':
          if (!transact || !pool) {
            const error = new Error('mutate requests require both transact and pool.');
            responses.push(<MutateResponse>{
              action: request.action,
              errors: [errorToBundle(error)],
              requestId,
              type: request.type,
            });
            break;
          }

          const transaction = await transact();
          try {
            const { generatedIds, errors } = await pool.sync(transaction, request, context);
            if (errors.length > 0) {
              await transaction.rollback();
              responses.push(<MutateResponse>{
                action: request.action,
                errors,
                requestId,
                type: request.type,
              });
            } else {
              await transaction.commit();
              responses.push(<MutateResponse>{
                action: request.action,
                errors: [],
                generatedIds,
                requestId,
                type: request.type,
              });
            }
          } catch (error) {
            await transaction.rollback();
            responses.push(<MutateResponse>{
              action: request.action,
              errors: [errorToBundle(error)],
              requestId,
              type: request.type,
            });
          }
          break;
        case 'batchMutate':
          const batch: BatchMutateResponse = {
            errors: [],
            queue: [],
            requestId,
            type: request.type,
          };

          if (!transact || !pool) {
            const e = [errorToBundle(new Error('mutate requests require both transact and pool.'))];

            for (const { action, requestId: id, type } of request.queue) {
              batch.queue.push(<MutateResponse>{ action, errors: e, requestId: id, type });
            }

            responses.push({ ...batch, errors: e });
            break;
          }

          let failed = false;
          let failReasons: Bundle[] = [];
          const batchTr = await transact();
          try {
            for (const reqItem of request.queue) {
              const { action, type, requestId: itemId } = reqItem;
              if (!failed) {
                try {
                  const { generatedIds, errors } = await pool.sync(batchTr, reqItem, context);
                  if (errors.length > 0) {
                    failed = true;
                    failReasons = errors;
                    batchTr.rollback();
                    batch.queue.push({ action, type, requestId: itemId, errors });
                  } else {
                    batch.queue.push({
                      action,
                      errors,
                      generatedIds,
                      requestId: itemId,
                      type,
                    });
                  }
                } catch (error) {
                  failed = true;
                  failReasons = [errorToBundle(error)];
                  batchTr.rollback();
                  batch.queue.push({ action, errors: failReasons, requestId: itemId, type });
                }
              } else {
                batch.queue.push({
                  action: reqItem.action,
                  errors: failReasons,
                  requestId: reqItem.requestId,
                  type: reqItem.type,
                });
              }
            }

          } catch (error) {
            await batchTr.rollback();
            for (const resItem of batch.queue) {
              resItem.errors = resItem.errors
                ? [...resItem.errors, errorToBundle(error)]
                : [errorToBundle(error)];
            }
            failed = true;
          }

          if (!failed) {
            await batchTr.commit();
          }

          responses.push(batch);
          break;
        case 'validate':
          try {
            if (!validator) {
              throw new Error('validate requests require a validator.');
            }
            responses.push(await validator(request, context));
          } catch (error) {
            responses.push({
              errors: [errorToBundle(error)],
              name: request.name,
              requestId,
              type: 'validate',
            });
          }
          break;
      }
    }

    return responses;
  };
}
