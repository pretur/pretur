import { Reducible, Action, Dispatch } from 'pretur.redux';
import { keyBy } from 'lodash';
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

export interface PageReplaceOptions extends PageInstantiationData<any> {
  toRemoveMutex: string;
}

export interface PageOpenOptions extends PageInstantiationData<any> {
  insertAfterMutex?: string;
}

export interface PageCloseOptions {
  mutex: string;
  goto?: string;
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
  const insertAfterIndex = insertAfterMutex ? newInstances.pageOrder.indexOf(insertAfterMutex) : -1;

  if (instantiationData.parent) {
    if (instantiationData.parent === instantiationData.mutex) {
      throw new Error(`${instantiationData.mutex} cannot be child of itself.`);
    }

    if (!instances.pages[instantiationData.parent]) {
      throw new Error(`Parent of ${instantiationData.mutex} is invalid.`);
    }

    if (
      insertAfterIndex !== -1 &&
      insertAfterIndex < instances.pageOrder.indexOf(instantiationData.parent)
    ) {
      throw new Error(
        `Cannot open ${instantiationData.mutex}. Cannot be inserted before the parent.`,
      );
    }

    if (instances.pages[instantiationData.parent].parent) {
      throw new Error(
        `Cannot open ${instantiationData.mutex}. Nesting more than one level is forbidden.`,
      );
    }
  }

  const newPage = pages.buildInstance(instantiationData);

  if (insertAfterIndex !== -1) {
    newInstances.pageOrder.splice(insertAfterIndex + 1, 0, instantiationData.mutex);
  } else {
    newInstances.pageOrder.push(instantiationData.mutex);
  }

  newInstances.pages[instantiationData.mutex] = newPage;

  return newInstances;
}

function closePage(instances: Instances, toRemoveMutex: string): Instances {
  const newPages = orderedPages(instances).filter(page => {
    if (page.mutex === toRemoveMutex) {
      return false;
    }

    return page.parent !== toRemoveMutex;
  });

  return {
    pageOrder: newPages.map(page => page.mutex),
    pages: keyBy(newPages, page => page.mutex),
  };
}

function findClosePageTarget(
  instances: Instances,
  toRemoveMutex: string,
  override?: string,
): string | undefined {
  if (instances.pageOrder.length < 2) {
    return;
  }

  if (override && override !== toRemoveMutex && instances.pages[override]) {
    return override;
  }

  const toRemove = instances.pages[toRemoveMutex];

  if (!toRemove.parent) {
    const roots = orderedPages(instances).filter(page => !page.parent).map(page => page.mutex);
    const toRemoveIndex = roots.indexOf(toRemoveMutex);
    return toRemoveIndex === 0 ? roots[1] : roots[toRemoveIndex - 1];
  }

  const parentChildren = orderedPages(instances)
    .filter(page => page.parent === toRemove.parent)
    .map(page => page.mutex);

  if (parentChildren.length === 1) {
    return toRemove.parent;
  }

  const toRemoveIndex = parentChildren.indexOf(toRemoveMutex);
  return toRemoveIndex === 0 ? parentChildren[1] : parentChildren[toRemoveIndex - 1];
}

function replacePage(instances: Instances, options: PageReplaceOptions, pages: Pages): Instances {
  const { toRemoveMutex, ...instantiationData } = options;
  const toInsertIndex = instances.pageOrder.indexOf(toRemoveMutex);

  if (toInsertIndex === -1) {
    return openPage(instances, instantiationData, pages);
  }

  if (instantiationData.parent !== instances.pages[toRemoveMutex].parent) {
    throw new Error(
      `Cannot open ${instantiationData.mutex}. ` +
      'The new page and the page to be removed must have the same parent.',
    );
  }

  const newPage = pages.buildInstance(instantiationData);
  const newInstances = closePage(instances, toRemoveMutex);

  newInstances.pageOrder.splice(toInsertIndex, 0, instantiationData.mutex);
  newInstances.pages[instantiationData.mutex] = newPage;

  return newInstances;
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

  public get all(): PageInstance<any, any, any>[] {
    return orderedPages(this._instances);
  }

  public get roots(): PageInstance<any, any, any>[] {
    return this.all.filter(page => !page.parent);
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

  public get activeRootMutex(): string | undefined {
    if (!this._activePageMutex || !this._instances.pages[this._activePageMutex]) {
      return;
    }

    if (this._instances.pages[this._activePageMutex].parent) {
      return this._instances.pages[this._activePageMutex].parent;
    }

    return this._activePageMutex;
  }

  public get activeRootIndex(): number {
    if (!this._activePageMutex || !this._instances.pages[this._activePageMutex]) {
      return -1;
    }

    const parentMutex = this._instances.pages[this._activePageMutex].parent;

    if (!parentMutex) {
      return this.roots.map(page => page.mutex).indexOf(this._activePageMutex);
    }

    return this.roots.map(page => page.mutex).indexOf(parentMutex);
  }

  public get indexAsChildOfActiveRoot(): number {
    if (!this._activePageMutex || !this._instances.pages[this._activePageMutex]) {
      return -1;
    }

    const parentMutex = this._instances.pages[this._activePageMutex].parent;

    if (!parentMutex) {
      return -1;
    }

    return this.childrenOf(parentMutex).map(page => page.mutex).indexOf(this._activePageMutex);
  }

  public hasChildren(mutex: string): boolean {
    return this.all.some(page => page.parent === mutex);
  }

  public childrenOf(mutex: string): PageInstance<any, any, any>[] {
    return this.all.filter(page => page.parent === mutex);
  }

  public pageFromMutex(mutex: string | undefined): PageInstance<any, any, any> | undefined {
    return typeof mutex === 'string' ? this._instances.pages[mutex] : undefined;
  }

  private persistInstances(instances: Instances): void {
    const toSave: PageInstantiationData<any>[] = [];

    for (const instance of orderedPages(instances)) {
      if (instance.descriptor.persistent !== false) {
        if (instance.parent) {
          if (instances.pages[instance.parent].descriptor.persistent !== false) {
            toSave.push(instance.instantiationData);
          }
        } else {
          toSave.push(instance.instantiationData);
        }
      }
    }

    save(this._prefix, toSave);
  }

  private persistActivePage(instances: Instances, mutex: string | undefined): void {
    if (!mutex) {
      saveActivePage(this._prefix, undefined);
      return;
    }

    if (instances.pages[mutex].descriptor.persistent !== false) {
      const parentMutex = instances.pages[mutex].parent;

      if (parentMutex) {
        const parent = instances.pages[parentMutex];

        if (parent.descriptor.persistent !== false) {
          saveActivePage(this._prefix, mutex);
        }
      } else {
        saveActivePage(this._prefix, mutex);
      }
    }
  }

  public reduce(action: Action<any, any>): this {
    if (NAVIGATION_TRANSIT_TO_PAGE.is(this._prefix, action)) {
      if (action.payload === this._activePageMutex) {
        return this;
      }

      if (!action.payload) {
        this.persistActivePage(this._instances, undefined);
        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._instances = this._instances;
        return newNav;
      }

      if (!this._instances.pages[action.payload]) {
        return this;
      }

      this.persistActivePage(this._instances, action.payload);

      const newNav = <this>new Navigator(this._pages, this._prefix);
      newNav._instances = this._instances;
      newNav._activePageMutex = action.payload;
      return newNav;
    }

    if (NAVIGATION_OPEN_PAGE.is(this._prefix, action)) {
      if (!action.payload || action.payload.mutex === this._activePageMutex) {
        return this;
      }

      const { mutex, path } = action.payload;

      if (this._instances.pages[mutex]) {

        this.persistActivePage(this._instances, mutex);

        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._instances = this._instances;
        newNav._activePageMutex = mutex;
        return newNav;
      }

      if (this._pages.hasPage(path)) {
        const newInstances = openPage(this._instances, action.payload, this._pages);

        this.persistInstances(newInstances);
        this.persistActivePage(newInstances, mutex);

        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._instances = newInstances;
        newNav._activePageMutex = mutex;
        return newNav;
      }
      return this;
    }

    if (NAVIGATION_REPLACE_PAGE.is(this._prefix, action)) {
      if (!action.payload) {
        return this;
      }

      const { mutex, path } = action.payload;

      if (this._instances.pages[mutex]) {

        this.persistActivePage(this._instances, mutex);

        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._instances = this._instances;
        newNav._activePageMutex = mutex;
        return newNav;
      }

      if (this._pages.hasPage(path)) {
        const newInstances = replacePage(this._instances, action.payload, this._pages);

        this.persistInstances(newInstances);
        this.persistActivePage(newInstances, mutex);

        const newNav = <this>new Navigator(this._pages, this._prefix);
        newNav._instances = newInstances;
        newNav._activePageMutex = mutex;
        return newNav;
      }
      return this;
    }

    if (NAVIGATION_CLOSE_PAGE.is(this._prefix, action)) {
      if (!action.payload) {
        return this;
      }

      const { mutex, goto } = action.payload;

      if (!this._instances.pages[mutex]) {
        return this;
      }

      const newNav = <this>new Navigator(this._pages, this._prefix);
      newNav._activePageMutex = this._activePageMutex;

      const isParentOfActive = this._activePageMutex &&
        this._instances.pages[this._activePageMutex].parent === mutex;

      if (this._activePageMutex === mutex || isParentOfActive) {
        const targetMutex = findClosePageTarget(
          this._instances,
          isParentOfActive ? this._instances.pages[this._activePageMutex!].parent! : mutex,
          goto,
        );

        this.persistActivePage(this._instances, undefined);
        this.persistActivePage(this._instances, targetMutex);

        newNav._activePageMutex = targetMutex;
      }

      const newInstances = closePage(this._instances, mutex);

      this.persistInstances(newInstances);

      newNav._instances = newInstances;
      return newNav;
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
    instantiationData: PageInstantiationData<any>,
  ) {
    dispatch(NAVIGATION_REPLACE_PAGE.create.unicast(
      this._prefix,
      { toRemoveMutex, ...instantiationData },
    ));
  }

  public close(dispatch: Dispatch, mutex: string, goto?: string) {
    dispatch(NAVIGATION_CLOSE_PAGE.create.unicast(this._prefix, { mutex, goto }));
  }

  public load(dispatch: Dispatch) {
    dispatch(NAVIGATION_LOAD_PAGES.create.unicast(this._prefix));
  }

  public clear(dispatch: Dispatch) {
    dispatch(NAVIGATION_CLEAR_PAGES.create.unicast(this._prefix));
  }
}
