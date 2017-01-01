import {
  PageDescriptor,
  PageFolderDescriptor,
  PathTree,
  FolderContents,
  PageTreeRoot,
  PageFolder,
  Page,
} from './pages';

export interface Descriptors {
  pages: PageDescriptor<any, any, any>[];
  folders: PageFolderDescriptor[];
  pathTree: PathTree;
  folderContents: FolderContents;
  filteredPathTree: PathTree;
  filteredFolderContents: FolderContents;
}

function byPath(descriptor: PageFolderDescriptor | PageDescriptor<any, any, any>) {
  return descriptor.path;
}

function visible(descriptor: PageFolderDescriptor | PageDescriptor<any, any, any>) {
  return !descriptor.hidden;
}

export function buildDescriptorsFromTree(root: PageTreeRoot): Descriptors {
  const pages: PageDescriptor<any, any, any>[] = [];
  const folders: PageFolderDescriptor[] = [];
  const pathTree: PathTree = [];
  const filteredPathTree: PathTree = [];

  buildPageFolderTree(root, pages, folders, pathTree, filteredPathTree, [], false);

  const folderContents = buildFolderContents(folders.map(byPath), pages.map(byPath));
  const filteredFolderContents = buildFolderContents(
    folders.filter(visible).map(byPath),
    pages.filter(visible).map(byPath),
  );

  return { pages, folders, pathTree, folderContents, filteredPathTree, filteredFolderContents };
}

function buildPageFolderTree(
  root: PageTreeRoot,
  pages: PageDescriptor<any, any, any>[],
  folders: PageFolderDescriptor[],
  pathTree: PathTree,
  filteredPathTree: PathTree,
  chain: string[],
  hidden: boolean,
): void {

  pathTree.push(chain.join('/'));
  filteredPathTree.push(chain.join('/'));

  Object.keys(root).forEach(path => {
    const newChain = chain.concat(path);
    const absolutePath = newChain.join('/');

    if ((<PageFolder>root[path]).contents) {
      const folder = <PageFolder>root[path];
      folder.path = absolutePath;
      const folderHidden = hidden ? true : Boolean(folder.hidden);

      const newPathTree: PathTree = [];
      const newFilteredPathTree: PathTree = [];
      pathTree.push(newPathTree);

      const folderDescriptor: PageFolderDescriptor = {
        hidden: folderHidden,
        path: absolutePath,
        titleKey: folder.titleKey,
      };

      folders.push(folderDescriptor);

      buildPageFolderTree(
        folder.contents,
        pages,
        folders,
        newPathTree,
        newFilteredPathTree,
        newChain,
        folderHidden,
      );

      if (newFilteredPathTree.length > 1 && !folderHidden) {
        filteredPathTree.push(newFilteredPathTree);
      }

      if (newFilteredPathTree.length <= 1) {
        folderDescriptor.hidden = true;
      }

    } else {
      const page = <Page<any, any, any>>root[path];
      page.path = absolutePath;
      const pageHidden = hidden ? true : page.hidden;

      pathTree.push(absolutePath);

      if (!pageHidden) {
        filteredPathTree.push(absolutePath);
      }

      pages.push({
        component: page.component,
        hidden: pageHidden,
        path: absolutePath,
        persistent: page.persistent,
        reducerBuilder: page.reducerBuilder,
        titleKey: page.titleKey,
      });

    }

  });
}

function buildFolderContents(folders: string[], pages: string[]): FolderContents {
  const folderContents: FolderContents = {};

  folderContents[''] = pages.slice();

  folders.forEach(folder => {
    folderContents[folder] = [];
    pages.forEach(page => {
      if (page.indexOf(folder) !== -1) {
        folderContents[folder].push(page);
      }
    });
    folderContents[folder].sort();
  });

  return folderContents;
}
