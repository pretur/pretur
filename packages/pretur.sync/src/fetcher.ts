import * as Bluebird from 'bluebird';
import { I18nBundle } from 'pretur.i18n';
import { Query } from './query';
import { fetch as remoteFetch } from './fetch';

export interface FetcherResult<T> {
  data?: T[];
  count?: number;
  error?: I18nBundle;
  ok: boolean;
  status: HTTPStatusCodes;
  statusText: string;
}

export interface FetcherResponseItem {
  queryId: number;
  data?: any[];
  count?: number;
  error?: I18nBundle;
}

export type FetcherRequest = Query[];
export type FetcherResponse = FetcherResponseItem[];

export interface FetchListenerData {
  errors: I18nBundle[];
  ok: boolean;
  status: HTTPStatusCodes;
  statusText: string;
}

export interface Fetcher {
  add<T>(query: Query): Bluebird<FetcherResult<T>>;
  fetch(): Bluebird<boolean>;
  listen(): Bluebird<FetchListenerData>;
}

export interface FetcherCreator {
  buildFetcher(): Fetcher;
  buildSingleShotFetcher(harness: (fetcher: Fetcher) => void): Bluebird<boolean>;
}

export function buildFetcherCreator(endPointUrl: string): FetcherCreator {

  interface FetchRequest {
    query: Query;
    resolve: (data: FetcherResult<any>) => void;
    reject: (error: any) => void;
  }

  interface FetchListener {
    resolve: (data: FetchListenerData) => void;
    reject: (error: any) => void;
  }

  function buildFetcher(): Fetcher {
    let id = 0;
    let feched = false;
    const requests: FetchRequest[] = [];
    const listeners: FetchListener[] = [];

    function addId(query: Query): Query {
      id += 1;
      query.queryId = id;
      return query;
    }

    function add<T>(query: Query): Bluebird<FetcherResult<T>> {
      return new Bluebird<FetcherResult<T>>((resolve, reject) => {
        requests.push({ query: addId(query), resolve, reject });
      });
    }

    function listen(): Bluebird<FetchListenerData> {
      return new Bluebird<FetchListenerData>((resolve, reject) => {
        listeners.push({ resolve, reject });
      });
    }

    function fetch(): Bluebird<boolean> {
      if (process.env.NODE_ENV !== 'production' && feched) {
        throw new Error('fetch cannot be called on the same object more than once');
      }

      if (requests.length === 0) {
        return Bluebird.resolve(false);
      }

      feched = true;

      return remoteFetch<FetcherResponse>({
        body: requests.map(r => r.query),
        method: 'POST',
        url: endPointUrl,
      }).then(response => {

        const requestsByQueryId: { [id: number]: FetchRequest } = {};
        requests.forEach(req => requestsByQueryId[req.query.queryId!] = req);

        response.body.forEach(item => {
          const request = requestsByQueryId[item.queryId!];
          request.resolve({
            count: item.count,
            data: item.data,
            error: item.error,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
          });
        });

        const errors = response.body.filter(item => item.error).map(item => item.error!);

        listeners.forEach(listener => listener.resolve({
          errors,
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        }));

      }).catch(error => {
        requests.forEach(request => request.reject(error));
        listeners.forEach(listener => listener.reject(error));
      }).then(() => true);
    }

    return { add, fetch, listen };
  }

  function buildSingleShotFetcher(harness: (fetcher: Fetcher) => void) {
    const fetcher = buildFetcher();
    harness(fetcher);
    return fetcher.fetch();
  }

  return { buildFetcher, buildSingleShotFetcher };
}
