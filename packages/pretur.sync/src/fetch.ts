import * as Bluebird from 'bluebird';
import preturFetch, { Method } from 'pretur.fetch';

export interface FetchOptions {
  url: string;
  method?: Method;
  body?: any;
  json?: boolean;
}

export interface FetchResponse<TBody> {
  body: TBody;
  ok: boolean;
  status: number;
  statusText: string;
}

export function fetch<TBody>(options: FetchOptions): Bluebird<FetchResponse<TBody>> {
  return preturFetch(options.url, {
    body: JSON.stringify(options.body),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    method: options.method || 'GET',
  }).then(response => {
    let dataPromise: Bluebird<any>;

    if (options.json) {
      dataPromise = response.json<TBody>();
    } else {
      dataPromise = response.text();
    }

    return dataPromise.then(responseBody => {
      return <FetchResponse<TBody>>{
        body: responseBody,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      };
    });
  });
}
