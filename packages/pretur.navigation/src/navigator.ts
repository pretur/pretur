import { OrderedMap } from 'immutable';
import { Reducible, Action, Dispatch } from 'pretur.redux';

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

export interface NavigatorPageReplaceOptions {
  toRemoveMutex: string;
  toInsertData: PageInstantiationData<any>;
}

export class Navigator implements Reducible {
  private pages: Pages;
  private prefix: string;

  private instances = OrderedMap<string, PageInstance<any, any, any>>();
  private activePageMutex: string | undefined;

  constructor(pages: Pages, prefix = '') {
    this.pages = pages;
    this.prefix = prefix;
  }

  public get active(): PageInstance<any, any, any> | undefined {
    if (!this.activePageMutex) {
      return undefined;
    }
    return this.instances.get(this.activePageMutex) || undefined;
  }

  public get activeMutex(): string | undefined {
    return this.activePageMutex;
  }

  public get all(): OrderedMap<string, PageInstance<any, any, any>> {
    return this.instances;
  }

  public reduce(action: Action<any, any>): this {
    if (NAVIGATION_TRANSIT_TO_PAGE.is(this.prefix, action)) {
      if (!action.payload) {
        saveActivePage(this.prefix, undefined);
        const newNav = <this>new Navigator(this.pages, this.prefix);
        newNav.instances = this.instances;
        return newNav;
      }

      if (this.instances.has(action.payload)) {

        if (this.instances.get(action.payload).descriptor.persistent !== false) {
          saveActivePage(this.prefix, action.payload);
        }

        const newNav = <this>new Navigator(this.pages, this.prefix);
        newNav.instances = this.instances;
        newNav.activePageMutex = action.payload;
        return newNav;
      }

      return this;
    }

    if (NAVIGATION_OPEN_PAGE.is(this.prefix, action)) {
      if (action.payload && this.instances.has(action.payload.mutex)) {

        if (this.instances.get(action.payload.mutex).descriptor.persistent !== false) {
          saveActivePage(this.prefix, action.payload.mutex);
        }

        const newNav = <this>new Navigator(this.pages, this.prefix);
        newNav.instances = this.instances;
        newNav.activePageMutex = action.payload.mutex;
        return newNav;
      }

      if (action.payload && this.pages.hasPage(action.payload.path)) {
        const newPage = this.pages.buildInstance(action.payload);
        const newInstances = this.instances.set(action.payload.mutex, newPage);

        if (this.pages.getPage(action.payload.path).persistent !== false) {
          save(this.prefix, newInstances
            .filter((i: PageInstance<any, any, any>) => i.descriptor.persistent !== false)
            .map((i: PageInstance<any, any, any>) => i.instantiationData)
            .toArray());
          saveActivePage(this.prefix, action.payload.mutex);
        }

        const newNav = <this>new Navigator(this.pages, this.prefix);
        newNav.instances = newInstances;
        newNav.activePageMutex = action.payload.mutex;
        return newNav;
      }
      return this;
    }

    if (NAVIGATION_REPLACE_PAGE.is(this.prefix, action)) {
      if (!action.payload) {
        return this;
      }

      const { toRemoveMutex, toInsertData } = action.payload;

      if (this.instances.has(toInsertData.mutex)) {

        if (this.instances.get(toInsertData.mutex).descriptor.persistent !== false) {
          saveActivePage(this.prefix, toInsertData.mutex);
        }

        const newNav = <this>new Navigator(this.pages, this.prefix);
        newNav.instances = this.instances;
        newNav.activePageMutex = toInsertData.mutex;
        return newNav;
      }

      if (this.pages.hasPage(toInsertData.path)) {
        const toRemoveIndex = this.instances.keySeq().findIndex(key => key === toRemoveMutex);

        const newPage = this.pages.buildInstance(toInsertData);
        let newInstances: OrderedMap<string, PageInstance<any, any, any>>;

        if (toRemoveIndex === -1) {
          newInstances = this.instances.set(toInsertData.mutex, newPage);
        } else {
          const instancesArray = this.instances.toArray();
          instancesArray[toRemoveIndex] = newPage;
          newInstances = OrderedMap<string, PageInstance<any, any, any>>(
            instancesArray.map(i => [i.mutex, i]),
          );
        }

        if (this.pages.getPage(toInsertData.path).persistent !== false) {
          save(this.prefix, newInstances
            .filter((i: PageInstance<any, any, any>) => i.descriptor.persistent !== false)
            .map((i: PageInstance<any, any, any>) => i.instantiationData)
            .toArray());
          saveActivePage(this.prefix, toInsertData.mutex);
        }

        const newNav = <this>new Navigator(this.pages, this.prefix);
        newNav.instances = newInstances;
        newNav.activePageMutex = toInsertData.mutex;
        return newNav;
      }
      return this;
    }

    if (NAVIGATION_CLOSE_PAGE.is(this.prefix, action)) {
      const mutex = action.payload;

      if (mutex && this.instances.has(mutex)) {
        const newNav = <this>new Navigator(this.pages, this.prefix);
        newNav.activePageMutex = this.activePageMutex;

        if (this.activePageMutex === mutex) {
          const ordering = this.instances.keySeq();
          const index = ordering.indexOf(mutex);
          let targetIndex: number;
          if (index > 0) {
            targetIndex = index - 1;
          } else {
            targetIndex = 1;
          }
          const targetMutex: string | undefined = ordering.get(targetIndex);

          if (
            targetMutex &&
            this.instances.has(targetMutex) &&
            this.instances.get(targetMutex).descriptor.persistent !== false
          ) {
            saveActivePage(this.prefix, targetMutex);
          } else {
            saveActivePage(this.prefix, undefined);
          }

          newNav.activePageMutex = targetMutex;
        }

        newNav.instances = this.instances.remove(mutex);

        if (this.instances.get(mutex).descriptor.persistent !== false) {
          save(this.prefix, newNav.instances
            .filter((i: PageInstance<any, any, any>) => i.descriptor.persistent !== false)
            .map((i: PageInstance<any, any, any>) => i.instantiationData)
            .toArray());
        }

        return newNav;
      }
      return this;
    }

    if (NAVIGATION_LOAD_PAGES.is(this.prefix, action)) {

      const instantiationData = load(this.prefix);
      const loadedActivePageMutex = loadActivePage(this.prefix);

      let instances: OrderedMap<string, PageInstance<any, any, any>> | undefined = undefined;
      let activePageMutex: string | undefined = undefined;

      if (instantiationData && instantiationData.length > 0) {
        instances = OrderedMap<string, PageInstance<any, any, any>>(
          instantiationData.map(insData => {
            if (this.pages.hasPage(insData.path)) {
              const pageInstance = this.pages.buildInstance(insData);

              if (pageInstance.mutex === loadedActivePageMutex) {
                activePageMutex = loadedActivePageMutex;
              }

              return [pageInstance.mutex, pageInstance];
            }

            return;
          }).filter(Boolean),
        );
      }

      if (instances && instances.size > 0) {
        const newNav = <this>new Navigator(this.pages, this.prefix);
        newNav.instances = instances;
        newNav.activePageMutex = activePageMutex;
        return newNav;
      }
      return this;
    }

    if (NAVIGATION_CLEAR_PAGES.is(this.prefix, action)) {
      clear(this.prefix);
      return <this>new Navigator(this.pages, this.prefix);
    }

    if ((<any>action)[DEISOLATE_KEY]) {
      let modified = false;

      const newInstances = this.instances.withMutations(i => {
        this.instances.forEach((pageInstance: PageInstance<any, any, any>) => {
          const newInstance = pageInstance.reduce(action);
          if (newInstance !== pageInstance) {
            modified = true;
            i.set(pageInstance.mutex, newInstance);
          }
        });
      });

      if (modified) {
        const newNav = <this>new Navigator(this.pages, this.prefix);
        newNav.activePageMutex = this.activePageMutex;
        newNav.instances = newInstances;
        return newNav;
      }
      return this;
    }

    if (this.activePageMutex && this.instances.has(this.activePageMutex)) {
      const target = this.instances.get(this.activePageMutex);
      const newTarget = target.reduce(action);
      if (target !== newTarget) {
        const newNav = <this>new Navigator(this.pages, this.prefix);
        newNav.activePageMutex = this.activePageMutex;
        newNav.instances = this.instances.set(this.activePageMutex, newTarget);
        return newNav;
      }
      return this;
    }

    return this;
  }

  public transit(dispatch: Dispatch, mutex: string | undefined) {
    dispatch(NAVIGATION_TRANSIT_TO_PAGE.create.unicast(this.prefix, mutex));
  }

  public open(dispatch: Dispatch, instantiationData: PageInstantiationData<any>) {
    dispatch(NAVIGATION_OPEN_PAGE.create.unicast(this.prefix, instantiationData));
  }

  public replace(
    dispatch: Dispatch,
    toRemoveMutex: string,
    toInsertData: PageInstantiationData<any>,
  ) {
    dispatch(NAVIGATION_REPLACE_PAGE.create.unicast(this.prefix, { toRemoveMutex, toInsertData }));
  }

  public close(dispatch: Dispatch, mutex: string) {
    dispatch(NAVIGATION_CLOSE_PAGE.create.unicast(this.prefix, mutex));
  }

  public load(dispatch: Dispatch) {
    dispatch(NAVIGATION_LOAD_PAGES.create.unicast(this.prefix));
  }

  public clear(dispatch: Dispatch) {
    dispatch(NAVIGATION_CLEAR_PAGES.create.unicast(this.prefix));
  }
}
