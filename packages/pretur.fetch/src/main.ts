/// <reference types="node" />

import * as Bluebird from 'bluebird';

export interface Headers {
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string;
  getAll(name: string): string[];
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(callback: (value: string, name: string) => void): void;
}

export type Method = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'POST' | 'PUT';
export type RequestMode = 'same-origin' | 'no-cors' | 'cors';
export type RequestCredentials = 'omit' | 'same-origin' | 'include';
export type RequestCache =
  'default' |
  'no-store' |
  'reload' |
  'no-cache' |
  'force-cache' |
  'only-if-cached';

export interface RequestOptions {
  method?: Method | string;
  headers?: Headers | string[] | { [index: string]: string };
  body?: Blob | FormData | string;
  mode?: RequestMode;
  credentials?: RequestCredentials;
  cache?: RequestCache;
}

export type ResponseType = 'basic' | 'cors' | 'default' | 'error' | 'opaque';

export interface Response {
  bodyUsed: boolean;
  type: ResponseType;
  url: string;
  status: number;
  ok: boolean;
  statusText: string;
  headers: Headers;
  arrayBuffer(): Bluebird<ArrayBuffer>;
  blob(): Bluebird<Blob>;
  formData(): Bluebird<FormData>;
  json(): Bluebird<any>;
  json<T>(): Bluebird<T>;
  text(): Bluebird<string>;
  error(): Response;
  redirect(url: string, status: number): Response;
  clone(): Response;
}

export interface Fetch {
  (url: string, options?: RequestOptions): Bluebird<Response>;
}

let fetcher: Fetch;

// is node.js environment. based on http://stackoverflow.com/a/31090240
if (new (Function)('try {return this===global} catch(e) {return false}')()) {
  fetcher = require('node-fetch');
} else {
  require('whatwg-fetch');
  fetcher = (<any>self).fetch.bind(self);
}

export default fetcher;
