import * as Bluebird from 'bluebird';
import { I18nBundle } from 'pretur.i18n';
import { fetch } from './fetch';

export interface OperationPayload<T> {
  name: string;
  data?: T;
}

export interface OperationResponse<T> {
  name: string;
  data?: T;
  errors?: I18nBundle[];
}

export interface OperationResult<T> {
  name: string;
  data?: T;
  errors?: I18nBundle[];
  ok: boolean;
  status: HTTPStatusCodes;
  statusText: string;
}

export interface Operator {
  (payload: OperationPayload<any>): Bluebird<OperationResult<any>>;
}

export interface Operation<TPayload, TReponse> {
  name: string;
  is(payload: OperationPayload<any>): payload is OperationPayload<TPayload>;
  is(response: OperationResponse<any>): response is OperationResponse<TReponse>;
  execute(operator: Operator, payload?: TPayload): Bluebird<OperationResponse<TReponse>>;
}

export function buildOperator(endPointUrl: string): Operator {
  return function operator(payload: OperationPayload<any>): Bluebird<OperationResult<any>> {
    return fetch<OperationResponse<any>>({
      body: payload,
      method: 'POST',
      url: endPointUrl,
    }).then(response => {
      return <OperationResult<any>>{
        data: response.body.data,
        errors: response.body.errors,
        name: response.body.name,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      };
    });
  };
}

export function buildOperation<TPayload, TReponse>(name: string): Operation<TPayload, TReponse> {

  function is(payload: OperationPayload<any>): payload is OperationPayload<TPayload>;
  function is(response: OperationResponse<any>): response is OperationResponse<TReponse>;
  function is(payloadOrResposnse: any): boolean {
    return !!payloadOrResposnse && payloadOrResposnse.name === name;
  }

  function execute(operator: Operator, data?: TPayload) {
    return operator({ name, data });
  }

  return { name, is, execute };
}
