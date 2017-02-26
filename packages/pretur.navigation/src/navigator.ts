import { Reducible, Action, Dispatch } from 'pretur.redux';
import { indexOf, omit, without } from 'lodash';
import { PageInstance } from './pageInstance';
import { Pages, PageInstantiationData } from './pages';
import { load, clear, loadActivePage, save, saveActivePage } from './persist';

import {
  NAVIGATION_TRANSIT_TO_PAGE,
  NAVIGATION_OPEN_PAGE,
  NAVIGATION_REPLACE_PAGE,
  NAVIGATION_CLOSE_PAGE,
  NAVIGATION_LOAD_PAGES,
  NAVIGATION_CLEAR_PAGES,
} from './actions';

const DEISOLATE_KEY = '@@navigator_deisolate';

export function deisolate<A extends Action<any, any>>(action: A): A {
  (<any>action)[DEISOLATE_KEY] = true;
  return action;
}

export interface PageReplaceOptions {
  toRemoveMutex: string;
  toInsertData: PageInstantiationData<any>;
}

export interface PageOpenOptions {
  path: string;
  mutex: string;
  reducerBuilderData?: any;
  titleData?: any;
  insertAfterMutex?: string;
}

interface InstanceMap {
  [prop: string]: PageInstance<any, any, any>;
}

interface Instances {
  pageOrder: string[];
  pages: InstanceMap;
}

function orderedPages(instances: Instances): PageInstance<any, any, any>[] {
  return instances.pageOrder.map(path => instances.pages[path]);
}

function cloneInstances(oldInstances: Instances): Instances {
  return {
    pageOrder: [...oldInstances.pageOrder],
    pages: { ...oldInstances.pages },
  };
}

function openPage(instances: Instances, options: PageOpenOptions, pages: Pages): Instances {
  const newInstances = cloneInstances(instances);
  const { insertAfterMutex, ...instantiationData } = options;

  const newPage = pages.buildInstance(instantiationData);
  const insertAfterIndex = indexOf(newInstances.pageOrder, insertAfterMutex);

  if (insertAfterIndex !== -1) {
    newInstances.pageOrder.splice(insertAfterIndex + 1, 0, options.mutex);
  } else {
    newInstances.pageOrder.push(options.mutex);
  }

  newInstances.pages[options.mutex] = newPage;

  return newInstances;
}

function replacePage(instances: Instances, options: PageReplaceOptions, pages: Pages): Instances {
  const toRemoveIndex = indexOf(instances.pageOrder, options.toRemoveMutex);

  if (toRemoveIndex === -1) {
    return openPage(instances, options.toInsertData, pages);
  }

  const newPage = pages.buildInstance(options.toInsertData);

  const newPageOrder = [...instances.pageOrder];
  newPageOrder.splice(toRemoveIndex, 1, options.toInsertData.mutex);

  const newPages = <InstanceMap>omit(instances.pages, options.toRemoveMutex);
  newPages[options.toInsertData.mutex] = newPage;

  return { pageOrder: newPageOrder, pages: newPages };
}

export class Navigator implements Reducible {
  private _pages: Pages;
  private _prefix: string;

  private _instances: Instances = { pageOrder: [], pages: {} };
  private _activePageMutex: string | undefined;

  constructor(pages: Pages, prefix = '') {
    this._pages = pages;
    this._prefix = prefix;
  }

  public get active(): PageInstance<any, any, any> | undefined {
    if (!this._activePageMutex) {
      return;
    }
    return this._instances.pages[this._activePageMutex];
  }

  public get activeMutex(): string | undefined {
    return this._activePageMutex;
  }

  public get all(): PageInstance<any, any, any>[] {
    return orderedPages(this._instances);
  }

  public pageFromMutex(mutex: string | undefined): PageInstance<any, any, any> | undefined {
    return typeof mutex === 'string' ? this._instances.pages[mutex] : undefined;
  }

  public reduce(action: Action<any, any>): this {
    if (NAVIGATION_TRANSIT_TO_PAGE.is(this._prefix, action)) {
      if (typeof action.payload !== 'number' && typeof action.payload !== 'string') {
        saveActivePage(this._prefix, undefined);
        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._instances = this._instances;
        return newNav;
      }
      let mutex: string | undefined;

      if (typeof action.payload === 'string' && this._instances.pages[action.payload]) {
        mutex = action.payload;
      } else {
        mutex = this._instances.pageOrder[Number(action.payload)];
      }

      if (mutex) {

        if (this._instances.pages[mutex].descriptor.persistent !== false) {
          saveActivePage(this._prefix, mutex);
        }

        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._instances = this._instances;
        newNav._activePageMutex = mutex;
        return newNav;
      }

      return this;
    }

    if (NAVIGATION_OPEN_PAGE.is(this._prefix, action)) {
      if (action.payload && this._instances.pages[action.payload.mutex]) {

        if (this._instances.pages[action.payload.mutex].descriptor.persistent !== false) {
          saveActivePage(this._prefix, action.payload.mutex);
        }

        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._instances = this._instances;
        newNav._activePageMutex = action.payload.mutex;
        return newNav;
      }

      if (action.payload && this._pages.hasPage(action.payload.path)) {
        const newInstances = openPage(this._instances, action.payload, this._pages);

        if (this._pages.getPage(action.payload.path).persistent !== false) {
          save(this._prefix, orderedPages(newInstances)
            .filter(instance => instance.descriptor.persistent !== false)
            .map(instance => instance.instantiationData),
          );
          saveActivePage(this._prefix, action.payload.mutex);
        }

        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._instances = newInstances;
        newNav._activePageMutex = action.payload.mutex;
        return newNav;
      }
      return this;
    }

    if (NAVIGATION_REPLACE_PAGE.is(this._prefix, action)) {
      if (!action.payload) {
        return this;
      }

      const { toInsertData } = action.payload;

      if (this._instances.pages[toInsertData.mutex]) {

        if (this._instances.pages[toInsertData.mutex].descriptor.persistent !== false) {
          saveActivePage(this._prefix, toInsertData.mutex);
        }

        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._instances = this._instances;
        newNav._activePageMutex = toInsertData.mutex;
        return newNav;
      }

      if (this._pages.hasPage(toInsertData.path)) {
        const newInstances = replacePage(this._instances, action.payload, this._pages);

        if (this._pages.getPage(toInsertData.path).persistent !== false) {
          save(this._prefix, orderedPages(newInstances)
            .filter(instance => instance.descriptor.persistent !== false)
            .map(instance => instance.instantiationData),
          );
          saveActivePage(this._prefix, toInsertData.mutex);
        }

        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._instances = newInstances;
        newNav._activePageMutex = toInsertData.mutex;
        return newNav;
      }
      return this;
    }

    if (NAVIGATION_CLOSE_PAGE.is(this._prefix, action)) {
      if (typeof action.payload !== 'number' && typeof action.payload !== 'string') {
        return this;
      }
      let mutex: string | undefined;

      if (typeof action.payload === 'string' && this._instances.pages[action.payload]) {
        mutex = action.payload;
      } else {
        mutex = this._instances.pageOrder[Number(action.payload)];
      }

      if (mutex) {
        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._activePageMutex = this._activePageMutex;

        if (this._activePageMutex === mutex) {
          const index = this._instances.pageOrder.indexOf(mutex);
          let targetIndex: number;
          if (index > 0) {
            targetIndex = index - 1;
          } else {
            targetIndex = 1;
          }
          const targetMutex: string | undefined = this._instances.pageOrder[targetIndex];

          if (
            targetMutex &&
            this._instances.pages[targetMutex] &&
            this._instances.pages[targetMutex].descriptor.persistent !== false
          ) {
            saveActivePage(this._prefix, targetMutex);
          } else {
            saveActivePage(this._prefix, undefined);
          }

          newNav._activePageMutex = targetMutex;
        }

        const newInstances: Instances = {
          pageOrder: without(this._instances.pageOrder, mutex),
          pages: <InstanceMap>omit(this._instances.pages, mutex),
        };

        if (this._instances.pages[mutex].descriptor.persistent !== false) {
          save(this._prefix, orderedPages(newInstances)
            .filter(instance => instance.descriptor.persistent !== false)
            .map(instance => instance.instantiationData),
          );
        }

        newNav._instances = newInstances;
        return newNav;
      }
      return this;
    }

    if (NAVIGATION_LOAD_PAGES.is(this._prefix, action)) {

      const instantiationData = load(this._prefix);
      const loadedActivePageMutex = loadActivePage(this._prefix);

      let instances: Instances | undefined = undefined;
      let activePageMutex: string | undefined = undefined;

      if (instantiationData && instantiationData.length > 0) {
        instances = { pageOrder: [], pages: {} };

        instantiationData.forEach(insData => {
          if (this._pages.hasPage(insData.path)) {
            const pageInstance = this._pages.buildInstance(insData);

            if (pageInstance.mutex === loadedActivePageMutex) {
              activePageMutex = loadedActivePageMutex;
            }

            instances!.pageOrder.push(pageInstance.mutex);
            instances!.pages[pageInstance.mutex] = pageInstance;
          }
        });
      }

      if (instances && instances.pageOrder.length > 0) {
        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._instances = instances;
        newNav._activePageMutex = activePageMutex;
        return newNav;
      }
      return this;
    }

    if (NAVIGATION_CLEAR_PAGES.is(this._prefix, action)) {
      clear(this._prefix);
      return <this>new Navigator(this._pages, this._prefix);
    }

    if ((<any>action)[DEISOLATE_KEY]) {
      let modified = false;

      const newInstances: Instances = { pageOrder: this._instances.pageOrder, pages: {} };

      orderedPages(this._instances).forEach(instance => {
        const newInstance = instance.reduce(action);
        if (newInstance !== instance) {
          modified = true;
        }
        newInstances.pages[instance.mutex] = newInstance;
      });

      if (modified) {
        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._activePageMutex = this._activePageMutex;
        newNav._instances = newInstances;
        return newNav;
      }
      return this;
    }

    if (this._activePageMutex && this._instances.pages[this._activePageMutex]) {
      const target = this._instances.pages[this._activePageMutex];
      const newTarget = target.reduce(action);
      if (target !== newTarget) {
        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._activePageMutex = this._activePageMutex;
        newNav._instances = {
          pageOrder: this._instances.pageOrder,
          pages: { ...this._instances.pages, [this._activePageMutex]: newTarget },
        };
        return newNav;
      }
      return this;
    }

    return this;
  }

  public transit(dispatch: Dispatch, mutex: string | undefined) {
    dispatch(NAVIGATION_TRANSIT_TO_PAGE.create.unicast(this._prefix, mutex));
  }

  public open(dispatch: Dispatch, instantiationData: PageOpenOptions) {
    dispatch(NAVIGATION_OPEN_PAGE.create.unicast(this._prefix, instantiationData));
  }

  public replace(
    dispatch: Dispatch,
    toRemoveMutex: string,
    toInsertData: PageInstantiationData<any>,
  ) {
    dispatch(NAVIGATION_REPLACE_PAGE.create.unicast(this._prefix, { toRemoveMutex, toInsertData }));
  }

  public close(dispatch: Dispatch, mutex: string) {
    dispatch(NAVIGATION_CLOSE_PAGE.create.unicast(this._prefix, mutex));
  }

  public load(dispatch: Dispatch) {
    dispatch(NAVIGATION_LOAD_PAGES.create.unicast(this._prefix));
  }

  public clear(dispatch: Dispatch) {
    dispatch(NAVIGATION_CLEAR_PAGES.create.unicast(this._prefix));
  }
}
