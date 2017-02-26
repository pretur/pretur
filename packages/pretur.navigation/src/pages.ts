import { ComponentClass, StatelessComponent } from 'react';
import { Reducer } from 'pretur.redux';
import { PageInstance } from './pageInstance';
import { buildDescriptorsFromTree } from './buildDescriptorsFromTree';

export interface PageTreeRoot {
  [node: string]: PageFolder | Page<any, any, any>;
}

export interface PageFolder {
  titleKey: string;
  path?: string;
  hidden?: boolean;
  contents: PageTreeRoot;
}

export interface Page<TProps, TState, TReducerBuilderData> {
  titleKey: string;
  path?: string;
  hidden?: boolean;
  persistent?: boolean;
  component: ComponentClass<TProps> | StatelessComponent<TProps>;
  reducerBuilder: PageReducerBuilder<TReducerBuilderData, TState>;
}

export function buildPage<TProps, TState, TReducerBuilderData>(
  component: ComponentClass<TProps> | StatelessComponent<TProps>,
  reducerBuilder: PageReducerBuilder<TReducerBuilderData, TState>,
  titleKey: string,
  dynamic = false,
): Page<TProps, TState, TReducerBuilderData> {
  return {
    component,
    reducerBuilder,
    titleKey,
    hidden: dynamic,
    persistent: !dynamic,
  };
}

export interface PageReducerBuilder<T, S> {
  (data?: T): Reducer<S>;
}

export interface PageFolderDescriptor {
  path: string;
  titleKey: string;
  hidden?: boolean;
}

export interface PageDescriptor<TProps, TState, TReducerBuilderData> {
  path: string;
  titleKey: string;
  hidden?: boolean;
  persistent?: boolean;
  component: ComponentClass<TProps> | StatelessComponent<TProps>;
  reducerBuilder: PageReducerBuilder<TReducerBuilderData, TState>;
}

export interface PageInstantiationData<TReducerBuilderData> {
  path: string;
  mutex: string;
  parent?: string;
  reducerBuilderData?: TReducerBuilderData;
  titleData?: any;
}

export type PathTreeNode = string | PathTree;
export interface PathTree extends Array<PathTreeNode> { }

export interface FolderContents {
  [folder: string]: string[];
}

export class Pages {
  private pages: { [page: string]: PageDescriptor<any, any, any> };
  private folders: { [page: string]: PageFolderDescriptor };
  private calculatedPathTree: PathTree;
  private calculatedFolderContents: FolderContents;
  private calculatedFilteredPathTree: PathTree;
  private calculatedFilteredFolderContents: FolderContents;

  constructor(root: PageTreeRoot) {
    const descriptors = buildDescriptorsFromTree(root);
    this.pages = {};
    descriptors.pages.forEach(d => this.pages[d.path] = d);

    this.folders = {};
    descriptors.folders.forEach(d => this.folders[d.path] = d);

    this.calculatedPathTree = descriptors.pathTree;
    this.calculatedFolderContents = descriptors.folderContents;
    this.calculatedFilteredPathTree = descriptors.filteredPathTree;
    this.calculatedFilteredFolderContents = descriptors.filteredFolderContents;
  }

  public hasPage(path: string): boolean {
    return !!this.pages[path];
  }

  public getPage(path: string): PageDescriptor<any, any, any> {
    return this.pages[path];
  }

  public hasFolder(path: string): boolean {
    return !!this.folders[path];
  }

  public getFolder(path: string): PageFolderDescriptor {
    return this.folders[path];
  }

  public isHidden(path: string): boolean {
    if (this.hasPage(path)) {
      return !!this.getPage(path).hidden;
    }
    if (this.getFolder(path)) {
      return !!this.getFolder(path).hidden;
    }
    return false;
  }

  public get pathTree(): PathTree {
    return this.calculatedPathTree;
  }

  public get folderContents(): FolderContents {
    return this.calculatedFolderContents;
  }

  public get filteredPathTree(): PathTree {
    return this.calculatedFilteredPathTree;
  }

  public get filteredFolderContents(): FolderContents {
    return this.calculatedFilteredFolderContents;
  }

  public buildInstance<TProps, TState, TReducerBuilderData>(
    instantiationData: PageInstantiationData<TReducerBuilderData>,
  ): PageInstance<TProps, TState, TReducerBuilderData> {
    if (!this.hasPage(instantiationData.path)) {
      throw new Error(`No descriptor exists for the provided path (${instantiationData.path})`);
    }
    return new PageInstance(this.pages[instantiationData.path], instantiationData);
  }
}
