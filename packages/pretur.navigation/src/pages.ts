import { ComponentClass, StatelessComponent } from 'react';
import { ReducibleNode } from 'reducible-node';
import { PageInstance } from './pageInstance';
import { buildDescriptorsFromTree } from './buildDescriptorsFromTree';

export interface PageTreeRoot {
  [node: string]: PageTreeFolder | PageTreeLeaf;
}

export interface PageTreeFolder {
  title: string;
  path?: string;
  hidden?: boolean;
  contents: PageTreeRoot;
}

export interface PageTreeLeaf {
  title?: string;
  path?: string;
  hidden?: boolean;
  persistent?: boolean;
  component: ComponentClass<any> | StatelessComponent<any>;
  node: ReducibleNode<any>;
}

export interface Page<TProps, TState> {
  title?: string;
  path: string;
  hidden: boolean;
  persistent: boolean;
  component: ComponentClass<TProps> | StatelessComponent<TProps>;
  node: ReducibleNode<TState>;
}

export function buildPage<TProps, TState, TReducerBuilderData>(
  component: ComponentClass<TProps> | StatelessComponent<TProps>,
  node: node<TReducerBuilderData, TState>,
  titleKey: string,
  dynamicOrHidden?: boolean,
  persistent?: boolean,
): Page<TProps, TState, TReducerBuilderData> {
  return <Page<TProps, TState, TReducerBuilderData>>{
    component,
    hidden: dynamicOrHidden,
    persistent,
    node,
    title,
  };
}

export interface PageFolderDescriptor {
  path: string;
  title: string;
  hidden?: boolean;
}

export interface PageDescriptor<TProps, TState, TReducerBuilderData> {
  path: string;
  title: string;
  hidden?: boolean;
  persistent?: boolean;
  component: ComponentClass<TProps> | StatelessComponent<TProps>;
  reducerBuilder: PageReducerBuilder<TReducerBuilderData, TState>;
}

export interface PageInstantiationData<Parameters = {}> {
  path: string;
  mutex: string;
  title: string;
  parameters: Parameters;
  parent?: string;
  openedFrom?: string;
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
    for (const page of descriptors.pages) {
      this.pages[page.path] = page;
    }

    this.folders = {};
    for (const folder of descriptors.folders) {
      this.folders[folder.path] = folder;
    }

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
