import * as Bluebird from 'bluebird';
import { I18nBundle } from 'pretur.i18n';
import { fetch } from './fetch';

export interface SynchronizerInsert<T> {
  action: 'INSERT';
  itemId?: number;
  model: string;
  data: T;
}

export interface SynchronizerUpdate<T> {
  action: 'UPDATE';
  itemId?: number;
  model: string;
  attributes: string[];
  data: T;
}

export interface SynchronizerRemove<T> {
  action: 'REMOVE';
  itemId?: number;
  model: string;
  identifiers: T;
}

export type SynchronizerItem<T>
  = SynchronizerInsert<T> | SynchronizerUpdate<T> | SynchronizerRemove<T>;

export interface SynchronizerResult {
  warning?: I18nBundle;
  error?: I18nBundle;
  generatedId?: number;
  ok: boolean;
  status: number;
  statusText: string;
}

export interface SynchronizerResponseItem {
  itemId: number;
  generatedId?: number;
  warning?: I18nBundle;
  error?: I18nBundle;
}

export type SynchronizerRequest = SynchronizerItem<any>[];
export type SynchronizerResponse = SynchronizerResponseItem[];

export interface SynchronizeListenerData {
  items: SynchronizerResponseItem[];
  ok: boolean;
  status: number;
  statusText: string;
}

export interface Synchronizer {
  listen(): Bluebird<SynchronizeListenerData>;
  addInsert(insert: SynchronizerInsert<any>): Bluebird<SynchronizerResult>;
  addUpdate(update: SynchronizerUpdate<any>): Bluebird<SynchronizerResult>;
  addRemove(remove: SynchronizerRemove<any>): Bluebird<SynchronizerResult>;
  sync(): Bluebird<boolean>;
}

export interface SynchronizerCreator {
  buildSynchronizer(): Synchronizer;
  buildSingleShotSynchronizer(harness: (synchronizer: Synchronizer) => void): Bluebird<boolean>;
}

export function buildSynchronizerCreator(endPointUrl: string): SynchronizerCreator {

  interface SyncRequestItem {
    item: SynchronizerItem<any>;
    resolve: (result: SynchronizerResult) => any;
    reject: (error: any) => any;
  }

  interface SyncListener {
    resolve: (data: SynchronizeListenerData) => void;
    reject: (error: any) => void;
  }

  function buildSynchronizer(): Synchronizer {
    let id = 0;
    let synched = false;
    const items: SyncRequestItem[] = [];
    const listeners: SyncListener[] = [];

    function addIdAction(
      item: SynchronizerItem<any>,
      action: 'UPDATE' | 'INSERT' | 'REMOVE'
    ): SynchronizerItem<any> {
      id += 1;
      item.itemId = id;
      item.action = action;
      return item;
    }

    function listen(): Bluebird<SynchronizeListenerData> {
      return new Bluebird<SynchronizeListenerData>((resolve, reject) => {
        listeners.push({ resolve, reject });
      });
    }

    function addInsert(insert: SynchronizerInsert<any>): Bluebird<SynchronizerResult> {
      const item = addIdAction(insert, 'INSERT');
      return new Bluebird<SynchronizerResult>((resolve, reject) => {
        items.push({ item, resolve, reject });
      });
    }

    function addUpdate(update: SynchronizerUpdate<any>): Bluebird<SynchronizerResult> {
      const item = addIdAction(update, 'UPDATE');
      return new Bluebird<SynchronizerResult>((resolve, reject) => {
        items.push({ item, resolve, reject });
      });
    }

    function addRemove(remove: SynchronizerRemove<any>): Bluebird<SynchronizerResult> {
      const item = addIdAction(remove, 'REMOVE');
      return new Bluebird<SynchronizerResult>((resolve, reject) => {
        items.push({ item, resolve, reject });
      });
    }

    function sync(): Bluebird<boolean> {
      if (process.env.NODE_ENV !== 'production' && synched) {
        throw new Error('sync cannot be called on the same object more than once');
      }

      if (items.length === 0) {
        return Bluebird.resolve(false);
      }

      synched = true;

      return fetch<SynchronizerResponse>({
        body: items.map(i => i.item),
        json: true,
        method: 'POST',
        url: endPointUrl,
      }).then(response => {

        if (Array.isArray(response.body) && response.body.length > 0) {
          items.forEach(item => {
            const responseItem = response.body.filter(e => e.itemId === item.item.itemId)[0];
            item.resolve({
              error: responseItem.error,
              generatedId: responseItem.generatedId,
              ok: response.ok,
              status: response.status,
              statusText: response.statusText,
              warning: responseItem.warning,
            });
          });

          listeners.forEach(listener => listener.resolve({
            items: response.body,
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
          }));

        } else {
          items.forEach(item => item.reject(new Error('Invalid response')));
          listeners.forEach(listener => listener.reject(new Error('Invalid response')));
        }

      }).catch(error => {
        listeners.forEach(listener => listener.reject(error));
        items.forEach(item => item.reject(error));
      }).then(() => true);
    }

    return { listen, addInsert, addUpdate, addRemove, sync };
  }

  function buildSingleShotSynchronizer(harness: (synchronizer: Synchronizer) => void) {
    const synchronizer = buildSynchronizer();
    harness(synchronizer);
    return synchronizer.sync();
  }

  return { buildSynchronizer, buildSingleShotSynchronizer };
}
