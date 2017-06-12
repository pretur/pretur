import { EmptySpec } from 'pretur.spec';
import { Bundle } from 'pretur.i18n';
import { Query } from './query';
import { Request, OperateRequest, ValidateRequest, MutateRequest } from './request';
import {
  Response, OperateResponse, ValidateResponse, MutateResponse, BatchMutateResponse,
} from './response';

// Manually import some types to decouple the librarires
interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface Pool<C> {
  resolve(query: Query<EmptySpec>, context: C): Promise<{ data: any[], count?: number }>;
  sync(transaction: Transaction, item: MutateRequest, rip: any, context: C): Promise<any | void>;
}

export interface ResponderOptions<C> {
  errorToBundle: (error: Error) => Bundle;
  pool?: Pool<C>;
  operator?: (request: OperateRequest, context: C) => Promise<OperateResponse>;
  validator?: (request: ValidateRequest, context: C) => Promise<ValidateResponse>;
  transact?: () => Promise<Transaction>;
}

export function buildResponder<C>(options: ResponderOptions<C>) {
  const { errorToBundle, pool, operator, validator, transact } = options;

  return async function responder(requests: Request[], context: any): Promise<Response[]> {
    if (!Array.isArray(requests) || requests.length === 0) {
      return [];
    }

    const responses: Response[] = [];

    for (const request of requests) {
      const requestId = request.requestId;

      switch (request.type) {
        case 'select':
          try {
            if (!pool) {
              throw new Error('select requests require pool to operate.');
            }
            const { data, count } = await pool.resolve(request.query, context);
            responses.push({ count, data, requestId, type: 'select' });
          } catch (error) {
            const errors = [errorToBundle(error)];
            responses.push({ errors, requestId, type: 'select' });
          }
          break;
        case 'operate':
          try {
            if (!operator) {
              throw new Error('operate requests require an operator.');
            }
            responses.push(await operator(request, context));
          } catch (error) {
            const errors = [errorToBundle(error)];
            responses.push({ errors, name: request.name, requestId, type: 'operate' });
          }
          break;
        case 'mutate':
          if (!transact || !pool) {
            const error = new Error('mutate requests require both transact and pool.');
            responses.push(<MutateResponse>{
              action: request.action,
              errors: [errorToBundle(error)],
              requestId,
              transactionFailed: true,
              type: request.type,
            });
            break;
          }

          let errors: Bundle[] | undefined;
          let warnings: Bundle[] | undefined;
          const rip = {
            appendError(error: Bundle) {
              if (!errors) {
                errors = [];
              }
              errors.push(error);
            },
            appendWarning(warning: Bundle) {
              if (!warnings) {
                warnings = [];
              }
              warnings.push(warning);
            },
          };

          const transaction = await transact();
          try {
            const generatedId = await pool.sync(transaction, request, rip, context);
            if (errors.length > 0) {
              await transaction.rollback();
              responses.push(<MutateResponse>{
                action: request.action,
                errors,
                requestId,
                transactionFailed: true,
                type: request.type,
                warnings,
              });
            } else {
              await transaction.commit();
              responses.push(<MutateResponse>{
                action: request.action,
                generatedId,
                requestId,
                transactionFailed: false,
                type: request.type,
                warnings,
              });
            }
          } catch (error) {
            await transaction.rollback();
            responses.push(<MutateResponse>{
              action: request.action,
              errors: [...errors, errorToBundle(error)],
              requestId,
              transactionFailed: true,
              type: request.type,
              warnings,
            });
          }
          break;
        case 'batchMutate':
          const batchResponse: BatchMutateResponse = { queue: [], requestId, type: request.type };

          if (!transact || !pool) {
            const e = [errorToBundle(new Error('mutate requests require both transact and pool.'))];

            for (const { action, requestId: id, type } of request.queue) {
              batchResponse.queue.push(<MutateResponse>{ action, errors: e, requestId: id, type });
            }

            responses.push({ ...batchResponse, errors: e });
            break;
          }

          let failed = false;
          const batchTr = await transact();
          try {

            for (const reqItem of request.queue) {
              if (!failed) {
                const itemErrors: Bundle[] = [];
                const itemWarnings: Bundle[] = [];
                const itemRip = {
                  appendError(error: Bundle) {
                    itemErrors.push(error);
                  },
                  appendWarning(warning: Bundle) {
                    itemWarnings.push(warning);
                  },
                };
                try {
                  const generatedId = await pool.sync(batchTr, reqItem, itemRip, context);
                  if (itemErrors.length > 0) {
                    failed = true;
                    batchTr.rollback();
                    batchResponse.queue.push(<MutateResponse>{
                      action: reqItem.action,
                      errors: itemErrors,
                      requestId: reqItem.requestId,
                      type: reqItem.type,
                      warnings: itemWarnings,
                    });
                  } else {
                    batchResponse.queue.push(<MutateResponse>{
                      action: reqItem.action,
                      generatedId,
                      requestId: reqItem.requestId,
                      type: reqItem.type,
                      warnings: itemWarnings,
                    });
                  }
                } catch (error) {
                  failed = true;
                  batchTr.rollback();
                  batchResponse.queue.push(<MutateResponse>{
                    action: reqItem.action,
                    errors: [...itemErrors, errorToBundle(error)],
                    requestId: reqItem.requestId,
                    transactionFailed: true,
                    type: reqItem.type,
                    warnings: itemWarnings,
                  });
                }
              } else {
                batchResponse.queue.push(<MutateResponse>{
                  action: reqItem.action,
                  requestId: reqItem.requestId,
                  type: reqItem.type,
                });
              }
            }

          } catch (error) {
            await batchTr.rollback();
            for (const resItem of batchResponse.queue) {
              resItem.errors = resItem.errors
                ? [...resItem.errors, errorToBundle(error)]
                : [errorToBundle(error)];
            }
            failed = true;
          }

          if (failed) {
            for (const resItem of batchResponse.queue) {
              resItem.transactionFailed = true;
            }
          } else {
            await batchTr.commit();
          }

          responses.push(batchResponse);
          break;
        case 'validate':
          try {
            if (!operator) {
              throw new Error('validate requests require a validator.');
            }
            responses.push(await validator(request, context));
          } catch (error) {
            responses.push({
              errors: [errorToBundle(error)],
              name: request.name,
              requestId,
              type: 'validate',
              validationError: undefined,
            });
          }
          break;
      }
    }

    return responses;
  };
}
