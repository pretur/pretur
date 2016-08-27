import { ComponentClass, StatelessComponent } from 'react';
import { Map } from 'immutable';
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
  dynamic = false
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
  reducerBuilderData?: TReducerBuilderData;
  titleData?: any;
}

export type PathTreeNode = string | PathTree;
export interface PathTree extends Array<PathTreeNode> { }

export interface FolderContents {
  [folder: string]: string[];
}

export class Pages {
  private pages: Map<string, PageDescriptor<any, any, any>>;
  private folders: Map<string, PageFolderDescriptor>;
  private calculatedPathTree: PathTree;
  private calculatedFolderContents: FolderContents;
  private calculatedFilteredPathTree: PathTree;
  private calculatedFilteredFolderContents: FolderContents;

  constructor(root: PageTreeRoot) {
    const descriptors = buildDescriptorsFromTree(root);
    this.pages = Map<string, PageDescriptor<any, any, any>>(
      descriptors.pages.map(d => [d.path, d])
    );
    this.folders = Map<string, PageFolderDescriptor>(descriptors.folders.map(d => [d.path, d]));
    this.calculatedPathTree = descriptors.pathTree;
    this.calculatedFolderContents = descriptors.folderContents;
    this.calculatedFilteredPathTree = descriptors.filteredPathTree;
    this.calculatedFilteredFolderContents = descriptors.filteredFolderContents;
  }

  public hasPage(path: string): boolean {
    return this.pages.has(path);
  }

  public getPage(path: string): PageDescriptor<any, any, any> {
    return this.pages.get(path);
  }

  public hasFolder(path: string): boolean {
    return this.folders.has(path);
  }

  public getFolder(path: string): PageFolderDescriptor {
    return this.folders.get(path);
  }

  public isHidden(path: string): boolean | null {
    if (this.hasPage(path)) {
      return !!this.getPage(path).hidden;
    }
    if (this.getFolder(path)) {
      return !!this.getFolder(path).hidden;
    }
    return null;
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
    instantiationData: PageInstantiationData<TReducerBuilderData>
  ): PageInstance<TProps, TState, TReducerBuilderData> {
    if (!this.hasPage(instantiationData.path)) {
      throw new Error(`No descriptor exists for the provided path (${instantiationData.path})`);
    }
    return new PageInstance(this.pages.get(instantiationData.path), instantiationData);
  }
}
