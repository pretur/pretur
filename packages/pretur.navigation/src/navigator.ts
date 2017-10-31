import { Reducible, Action, Dispatch } from 'reducible-node';
import { keyBy } from 'lodash';
import { PageInstance } from './pageInstance';
import { Pages, PageOccurrence } from './pages';
import { load, clear, loadActivePage, save, saveActivePage } from './persist';
import {
  __NAVIGATION_IDENTIFIER__,
  NAVIGATION_TRANSIT_TO_PAGE,
  NAVIGATION_OPEN_PAGE,
  NAVIGATION_REPLACE_PAGE,
  NAVIGATION_CLOSE_PAGE,
  NAVIGATION_LOAD_PAGES,
  NAVIGATION_CLEAR_PAGES,
} from './actions';

export interface PageReplaceOptions extends PageOccurrence<any> {
  toRemoveMutex: string;
}

export interface PageOpenOptions extends PageOccurrence<any> {
  insertAfterMutex?: string;
}

export interface PageCloseOptions {
  mutex: string;
  goto?: string;
}

interface InstanceMap {
  [prop: string]: PageInstance<any, any>;
}

interface Instances {
  pageOrder: string[];
  pages: InstanceMap;
}

interface ActiveChildren {
  [root: string]: string;
}

function orderedPages(instances: Instances): PageInstance<any, any>[] {
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
  const { insertAfterMutex, ...occurrence } = options;
  const insertAfterIndex = insertAfterMutex ? newInstances.pageOrder.indexOf(insertAfterMutex) : -1;

  if (occurrence.parent) {
    if (occurrence.parent === occurrence.mutex) {
      throw new Error(`${occurrence.mutex} cannot be child of itself.`);
    }

    if (!instances.pages[occurrence.parent]) {
      throw new Error(`Parent of ${occurrence.mutex} is invalid.`);
    }

    if (
      insertAfterIndex !== -1 &&
      insertAfterIndex < instances.pageOrder.indexOf(occurrence.parent)
    ) {
      throw new Error(
        `Cannot open ${occurrence.mutex}. Cannot be inserted before the parent.`,
      );
    }

    if (instances.pages[occurrence.parent].parent) {
      throw new Error(
        `Cannot open ${occurrence.mutex}. Nesting more than one level is forbidden.`,
      );
    }
  }

  const newPage = pages.buildInstance(occurrence);

  if (insertAfterIndex !== -1) {
    newInstances.pageOrder.splice(insertAfterIndex + 1, 0, occurrence.mutex);
  } else {
    newInstances.pageOrder.push(occurrence.mutex);
  }

  newInstances.pages[occurrence.mutex] = newPage;

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
    const toRemoveRootIndex = roots.indexOf(toRemoveMutex);
    return toRemoveRootIndex === 0 ? roots[1] : roots[toRemoveRootIndex - 1];
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
  const { toRemoveMutex, ...occurrence } = options;
  const toInsertIndex = instances.pageOrder.indexOf(toRemoveMutex);

  if (toInsertIndex === -1) {
    return openPage(instances, occurrence, pages);
  }

  if (occurrence.parent !== instances.pages[toRemoveMutex].parent) {
    throw new Error(
      `Cannot open ${occurrence.mutex}. ` +
      'The new page and the page to be removed must have the same parent.',
    );
  }

  const newPage = pages.buildInstance(occurrence);
  const newInstances = closePage(instances, toRemoveMutex);

  newInstances.pageOrder.splice(toInsertIndex, 0, occurrence.mutex);
  newInstances.pages[occurrence.mutex] = newPage;

  return newInstances;
}

function cloneActiveChildren(instances: Instances, currentActives: ActiveChildren): ActiveChildren {
  const newActives: ActiveChildren = {};
  const roots = orderedPages(instances).filter(page => !page.parent).map(page => page.mutex);

  for (const root of roots) {
    if (currentActives[root] && instances.pages[currentActives[root]]) {
      newActives[root] = currentActives[root];
    }
  }

  return newActives;
}

function updateActiveChildren(
  instances: Instances,
  actives: ActiveChildren,
  target?: string,
): ActiveChildren {
  const newActives = cloneActiveChildren(instances, actives);

  if (!target) {
    return newActives;
  }

  const targetPage = instances.pages[target];

  // target is root
  if (targetPage && !targetPage.parent) {
    if (!newActives[target]) {
      return newActives;
    }
    delete newActives[target];
    return newActives;
  }

  const root = targetPage && targetPage.parent;

  if (!root) {
    return newActives;
  }

  return { ...newActives, [root]: target };
}

function getTransitionTarget(
  instances: Instances,
  actives: ActiveChildren,
  currentActive: string | undefined,
  desiredTarget: string,
): string {
  const desiredTargetPage = instances.pages[desiredTarget];
  const currentPage = currentActive && instances.pages[currentActive];

  // non-root
  if (desiredTargetPage && desiredTargetPage.parent) {
    return desiredTarget;
  }

  // transiting to own root
  if (currentPage && desiredTarget === currentPage.parent) {
    return desiredTarget;
  }

  if (actives[desiredTarget] && instances.pages[actives[desiredTarget]]) {
    return actives[desiredTarget];
  }

  return desiredTarget;
}

export class Navigator implements Reducible<Navigator> {
  private pages: Pages;
  private instances: Instances = { pageOrder: [], pages: {} };
  private activePageMutex: string | undefined;
  private activeChildren: ActiveChildren = {};

  constructor(pages: Pages) {
    this.pages = pages;
  }

  public get all(): PageInstance<any, any>[] {
    return orderedPages(this.instances);
  }

  public get roots(): PageInstance<any, any>[] {
    return this.all.filter(page => !page.parent);
  }

  public get active(): PageInstance<any, any> | undefined {
    if (!this.activePageMutex) {
      return;
    }
    return this.instances.pages[this.activePageMutex];
  }

  public get activeMutex(): string | undefined {
    return this.activePageMutex;
  }

  public get activeRootMutex(): string | undefined {
    if (!this.activePageMutex || !this.instances.pages[this.activePageMutex]) {
      return;
    }

    if (this.instances.pages[this.activePageMutex].parent) {
      return this.instances.pages[this.activePageMutex].parent;
    }

    return this.activePageMutex;
  }

  public get activeRoot(): PageInstance<any, any> | undefined {
    const mutex = this.activeRootMutex;
    if (!mutex) {
      return;
    }

    return this.instances.pages[mutex];
  }

  public get activeRootIndex(): number {
    if (!this.activePageMutex || !this.instances.pages[this.activePageMutex]) {
      return -1;
    }

    const parentMutex = this.instances.pages[this.activePageMutex].parent;

    if (!parentMutex) {
      return this.roots.map(page => page.mutex).indexOf(this.activePageMutex);
    }

    return this.roots.map(page => page.mutex).indexOf(parentMutex);
  }

  public get indexAsChildOfActiveRoot(): number {
    if (!this.activePageMutex || !this.instances.pages[this.activePageMutex]) {
      return -1;
    }

    const parentMutex = this.instances.pages[this.activePageMutex].parent;

    if (!parentMutex) {
      return -1;
    }

    return this.childrenOf(parentMutex).map(page => page.mutex).indexOf(this.activePageMutex);
  }

  public hasChildren(mutex: string): boolean {
    return this.all.some(page => page.parent === mutex);
  }

  public childrenOf(mutex: string): PageInstance<any, any>[] {
    return this.all.filter(page => page.parent === mutex);
  }

  public pageFromMutex(mutex: string | undefined): PageInstance<any, any> | undefined {
    return typeof mutex === 'string' ? this.instances.pages[mutex] : undefined;
  }

  public getActiveChild(mutex: string | undefined): string | undefined {
    return mutex ? this.activeChildren[mutex] : undefined;
  }

  private persistInstances(instances: Instances): void {
    const toSave: PageOccurrence<any>[] = [];

    for (const instance of orderedPages(instances)) {
      if (instance.page.persistent !== false) {
        if (instance.parent) {
          if (instances.pages[instance.parent].page.persistent !== false) {
            toSave.push(instance.occurrence);
          }
        } else {
          toSave.push(instance.occurrence);
        }
      }
    }

    save(toSave);
  }

  private persistActivePage(instances: Instances, mutex: string | undefined): void {
    if (!mutex) {
      saveActivePage(undefined);
      return;
    }

    if (instances.pages[mutex].page.persistent !== false) {
      const parentMutex = instances.pages[mutex].parent;

      if (parentMutex) {
        const parent = instances.pages[parentMutex];

        if (parent.page.persistent !== false) {
          saveActivePage(mutex);
        }
      } else {
        saveActivePage(mutex);
      }
    }
  }

  public reduce(action: Action<any>): this {
    if (NAVIGATION_TRANSIT_TO_PAGE.is(__NAVIGATION_IDENTIFIER__, action)) {
      if (action.payload === this.activePageMutex) {
        return this;
      }

      if (!action.payload) {
        this.persistActivePage(this.instances, undefined);
        const newNavWithoutActive = <this>new Navigator(this.pages);
        newNavWithoutActive.instances = this.instances;
        newNavWithoutActive.activeChildren = this.activeChildren;
        return newNavWithoutActive;
      }

      if (!this.instances.pages[action.payload]) {
        return this;
      }

      const transitionTarget = getTransitionTarget(
        this.instances,
        this.activeChildren,
        this.activePageMutex,
        action.payload,
      );

      this.persistActivePage(this.instances, transitionTarget);

      const newNav = <this>new Navigator(this.pages);
      newNav.instances = this.instances;
      newNav.activePageMutex = transitionTarget;
      newNav.activeChildren
        = updateActiveChildren(this.instances, this.activeChildren, transitionTarget);
      return newNav;
    }

    if (NAVIGATION_OPEN_PAGE.is(__NAVIGATION_IDENTIFIER__, action)) {
      if (!action.payload || action.payload.mutex === this.activePageMutex) {
        return this;
      }

      const { mutex, path } = action.payload;

      if (this.instances.pages[mutex]) {

        this.persistActivePage(this.instances, mutex);

        const newNav = <this>new Navigator(this.pages);
        newNav.instances = this.instances;
        newNav.activePageMutex = mutex;
        newNav.activeChildren = updateActiveChildren(this.instances, this.activeChildren, mutex);
        return newNav;
      }

      if (this.pages.hasPage(path)) {
        const newInstances = openPage(this.instances, action.payload, this.pages);

        this.persistInstances(newInstances);
        this.persistActivePage(newInstances, mutex);

        const newNav = <this>new Navigator(this.pages);
        newNav.instances = newInstances;
        newNav.activePageMutex = mutex;
        newNav.activeChildren = updateActiveChildren(newInstances, this.activeChildren, mutex);
        return newNav;
      }
      return this;
    }

    if (NAVIGATION_REPLACE_PAGE.is(__NAVIGATION_IDENTIFIER__, action)) {
      if (!action.payload) {
        return this;
      }

      const { mutex, path } = action.payload;

      if (this.instances.pages[mutex]) {

        this.persistActivePage(this.instances, mutex);

        const newNav = <this>new Navigator(this.pages);
        newNav.instances = this.instances;
        newNav.activePageMutex = mutex;
        newNav.activeChildren = updateActiveChildren(this.instances, this.activeChildren, mutex);
        return newNav;
      }

      if (this.pages.hasPage(path)) {
        const newInstances = replacePage(this.instances, action.payload, this.pages);

        this.persistInstances(newInstances);
        this.persistActivePage(newInstances, mutex);

        const newNav = <this>new Navigator(this.pages);
        newNav.instances = newInstances;
        newNav.activePageMutex = mutex;
        newNav.activeChildren = updateActiveChildren(newInstances, this.activeChildren, mutex);
        return newNav;
      }
      return this;
    }

    if (NAVIGATION_CLOSE_PAGE.is(__NAVIGATION_IDENTIFIER__, action)) {
      if (!action.payload) {
        return this;
      }

      const { mutex, goto } = action.payload;

      if (!this.instances.pages[mutex]) {
        return this;
      }

      const newNav = <this>new Navigator(this.pages);
      newNav.activePageMutex = this.activePageMutex;
      const newInstances = closePage(this.instances, mutex);

      const isParentOfActive = this.activePageMutex &&
        this.instances.pages[this.activePageMutex].parent === mutex;

      if (this.activePageMutex === mutex || isParentOfActive) {
        const targetMutex = findClosePageTarget(
          this.instances,
          isParentOfActive ? this.instances.pages[this.activePageMutex!].parent! : mutex,
          goto,
        );

        const transitionTarget = targetMutex && getTransitionTarget(
          newInstances,
          this.activeChildren,
          this.activePageMutex,
          targetMutex,
        );

        this.persistActivePage(this.instances, undefined);
        this.persistActivePage(this.instances, transitionTarget);

        newNav.activePageMutex = transitionTarget;
      }

      this.persistInstances(newInstances);

      newNav.instances = newInstances;
      newNav.activeChildren
        = updateActiveChildren(newInstances, this.activeChildren, newNav.activePageMutex);
      return newNav;
    }

    if (NAVIGATION_LOAD_PAGES.is(__NAVIGATION_IDENTIFIER__, action)) {

      const occurrence = load();
      const loadedActivePageMutex = loadActivePage();

      let instances: Instances | undefined = undefined;
      let activePageMutex: string | undefined = undefined;

      if (occurrence && occurrence.length > 0) {
        instances = { pageOrder: [], pages: {} };

        for (const instanceData of occurrence) {
          if (this.pages.hasPage(instanceData.path)) {
            const pageInstance = this.pages.buildInstance(instanceData);

            if (pageInstance.mutex === loadedActivePageMutex) {
              activePageMutex = loadedActivePageMutex;
            }

            instances.pageOrder.push(pageInstance.mutex);
            instances.pages[pageInstance.mutex] = pageInstance;
          }
        }
      }

      if (instances && instances.pageOrder.length > 0) {
        const newNav = <this>new Navigator(this.pages);
        newNav.instances = instances;
        newNav.activePageMutex = activePageMutex;
        newNav.activeChildren
          = updateActiveChildren(instances, this.activeChildren, activePageMutex);
        return newNav;
      }
      return this;
    }

    if (NAVIGATION_CLEAR_PAGES.is(__NAVIGATION_IDENTIFIER__, action)) {
      clear();
      return <this>new Navigator(this.pages);
    }

    const nextInstances: Instances = { pageOrder: this.instances.pageOrder, pages: {} };
    let modified = false;

    for (const instance of orderedPages(this.instances)) {
      const newInstance = instance.reduce(action);
      if (newInstance !== instance) {
        modified = true;
      }
      nextInstances.pages[instance.mutex] = newInstance;
    }

    if (modified) {
      const newNav = <this>new Navigator(this.pages);
      newNav.activePageMutex = this.activePageMutex;
      newNav.instances = nextInstances;
      newNav.activeChildren = this.activeChildren;
      return newNav;
    }
    return this;
  }

  public transit(dispatch: Dispatch, mutex: string | undefined) {
    dispatch(NAVIGATION_TRANSIT_TO_PAGE.create.unicast(__NAVIGATION_IDENTIFIER__, mutex));
  }

  public open(dispatch: Dispatch, occurrence: PageOpenOptions) {
    dispatch(NAVIGATION_OPEN_PAGE.create.unicast(__NAVIGATION_IDENTIFIER__, occurrence));
  }

  public replace(
    dispatch: Dispatch,
    toRemoveMutex: string,
    occurrence: PageOccurrence<any>,
  ) {
    dispatch(NAVIGATION_REPLACE_PAGE.create.unicast(
      __NAVIGATION_IDENTIFIER__,
      { toRemoveMutex, ...occurrence },
    ));
  }

  public close(dispatch: Dispatch, mutex: string, goto?: string) {
    dispatch(NAVIGATION_CLOSE_PAGE.create.unicast(__NAVIGATION_IDENTIFIER__, { mutex, goto }));
  }

  public load(dispatch: Dispatch) {
    dispatch(NAVIGATION_LOAD_PAGES.create.unicast(__NAVIGATION_IDENTIFIER__));
  }

  public clear(dispatch: Dispatch) {
    dispatch(NAVIGATION_CLEAR_PAGES.create.unicast(__NAVIGATION_IDENTIFIER__));
  }
}
