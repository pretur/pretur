import { ComponentClass, StatelessComponent } from 'react';
import { Dispatch, ReducibleNode } from 'reducible-node';
import { PageInstance } from './pageInstance';
import { buildDescriptorsFromTree } from './buildDescriptorsFromTree';
import {
  __NAVIGATION_IDENTIFIER__,
  NAVIGATION_OPEN_PAGE,
  NAVIGATION_REPLACE_PAGE,
} from './actions';

export type ValidTreeNode = { [path: string]: PageFolder | Page };

export type PageTreeNode<T extends ValidTreeNode = {}> = T;

export interface PageFolder<T extends ValidTreeNode = {}> {
  path: string;
  title: string;
  contents: PageTreeNode<T>;
}

export function folder<T extends ValidTreeNode = {}>(
  title: string,
  contents: PageTreeNode<T>,
): PageFolder<T> {
  return <PageFolder<T>>{ title, contents };
}

export interface ReplaceOptions<TParams> {
  mutex?: string;
  params?: TParams;
  title?: string;
  parent?: string;
  openedFrom?: string;
}

export interface OpenOptions<TParams> extends ReplaceOptions<TParams> {
  insertAfterMutex?: string;
}

export interface Page<TParams = any, TProps = any, TState = any> {
  readonly type: { params: TParams, props: TProps, state: TState };
  title?: string;
  path: string;
  hidden: boolean;
  persistent: boolean;
  component: ComponentClass<TProps> | StatelessComponent<TProps>;
  node: ReducibleNode<TState>;
  open: (dispatch: Dispatch, opt?: OpenOptions<TParams>) => void;
  replace: (dispatch: Dispatch, target: string, opt?: ReplaceOptions<TParams>) => void;
}

export interface BuildPageOptions {
  title?: string;
  hidden?: boolean;
  persistent?: boolean;
}

export function buildPage<TParams, TProps, TState>(
  component: ComponentClass<TProps> | StatelessComponent<TProps>,
  node: ReducibleNode<TState>,
  options: BuildPageOptions = {},
): Page<TParams, TProps, TState> {
  const page = <Page<TParams, TProps, TState>>{
    hidden: false,
    persistent: true,
    ...options,
    component,
    node,
    open,
    replace,
  };

  function open(dispatch: Dispatch, opt: OpenOptions<TParams> = {}) {
    dispatch(NAVIGATION_OPEN_PAGE.create.unicast(__NAVIGATION_IDENTIFIER__, {
      ...opt,
      mutex: opt.mutex ? `${page.path}/${opt.mutex}` : page.path,
      path: page.path,
    }));
  }

  function replace(dispatch: Dispatch, target: string, opt: ReplaceOptions<TParams> = {}) {
    dispatch(NAVIGATION_REPLACE_PAGE.create.unicast(__NAVIGATION_IDENTIFIER__, {
      ...opt,
      toRemoveMutex: target,
      mutex: opt.mutex ? `${page.path}/${opt.mutex}` : page.path,
      path: page.path,
    }));
  }

  return page;
}

export interface PageOccurrence<TParams = {}> {
  path: string;
  mutex: string;
  params?: TParams;
  title?: string;
  parent?: string;
  openedFrom?: string;
}

export type PathTreeNode = string | PathTree;
export interface PathTree extends Array<PathTreeNode> { }

export class Pages<T extends ValidTreeNode> {
  private pages: { [page: string]: Page<any, any, any> };
  private folders: { [page: string]: PageFolder };
  private calculatedPathTree: PathTree;
  private calculatedFolderContents: { [folder: string]: string[] };
  private calculatedFilteredPathTree: PathTree;
  private calculatedFilteredFolderContents: { [folder: string]: string[] };

  public readonly tree: PageTreeNode<T>;

  constructor(root: PageTreeNode<T>) {
    const descriptors = buildDescriptorsFromTree(root);

    this.tree = root;

    this.pages = {};
    for (const p of descriptors.pages) {
      this.pages[p.path] = p;
    }

    this.folders = {};
    for (const f of descriptors.folders) {
      this.folders[f.path] = f;
    }

    this.calculatedPathTree = descriptors.pathTree;
    this.calculatedFolderContents = descriptors.folderContents;
    this.calculatedFilteredPathTree = descriptors.filteredPathTree;
    this.calculatedFilteredFolderContents = descriptors.filteredFolderContents;
  }

  public hasPage(path: string): boolean {
    return !!this.pages[path];
  }

  public getPage(path: string): Page {
    return this.pages[path];
  }

  public hasFolder(path: string): boolean {
    return !!this.folders[path];
  }

  public getFolder(path: string): PageFolder {
    return this.folders[path];
  }

  public isHidden(path: string): boolean {
    if (this.hasPage(path)) {
      return this.getPage(path).hidden;
    }

    return false;
  }

  public get pathTree(): PathTree {
    return this.calculatedPathTree;
  }

  public get folderContents(): { [folder: string]: string[] } {
    return this.calculatedFolderContents;
  }

  public get filteredPathTree(): PathTree {
    return this.calculatedFilteredPathTree;
  }

  public get filteredFolderContents(): { [folder: string]: string[] } {
    return this.calculatedFilteredFolderContents;
  }

  public buildInstance<TProps, TState, TReducerBuilderData>(
    occurrence: PageOccurrence<TReducerBuilderData>,
  ): PageInstance<TProps, TState, TReducerBuilderData> {
    if (!this.hasPage(occurrence.path)) {
      throw new Error(`No descriptor exists for the provided path (${occurrence.path})`);
    }

    return new PageInstance(this.pages[occurrence.path], occurrence);
  }
}
