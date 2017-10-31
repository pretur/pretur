import { PageFolder, PathTree, PageTreeNode, Page, ValidTreeNode } from './pages';

export interface Descriptors {
  pages: Page<any, any>[];
  folders: PageFolder[];
  pathTree: PathTree;
  folderContents: { [folder: string]: string[] };
  filteredPathTree: PathTree;
  filteredFolderContents: { [folder: string]: string[] };
}

function byPath(descriptor: PageFolder | Page) {
  return descriptor.path;
}

function visible(descriptor: Page) {
  return !descriptor.hidden;
}

export function buildDescriptorsFromTree<T extends ValidTreeNode>(
  root: PageTreeNode<T>,
): Descriptors {
  const pages: Page[] = [];
  const folders: PageFolder[] = [];
  const pathTree: PathTree = [];
  const filteredPathTree: PathTree = [];

  buildPageFolderTree<T>(root, pages, folders, pathTree, filteredPathTree, []);

  const folderContents = buildFolderContents(folders.map(byPath), pages.map(byPath));
  const filteredFolderContents = buildFolderContents(
    folders.map(byPath),
    pages.filter(visible).map(byPath),
  );

  return { pages, folders, pathTree, folderContents, filteredPathTree, filteredFolderContents };
}

function buildPageFolderTree<T extends ValidTreeNode>(
  root: PageTreeNode<T>,
  pages: Page[],
  folders: PageFolder[],
  pathTree: PathTree,
  filteredPathTree: PathTree,
  chain: string[],
): void {

  pathTree.push(chain.join('/'));
  filteredPathTree.push(chain.join('/'));

  for (const path of Object.keys(root)) {
    const newChain = chain.concat(path);
    const absolutePath = newChain.join('/');

    if ((<PageFolder>root[path]).contents) {
      const folder = <PageFolder>root[path];
      folder.path = absolutePath;

      const newPathTree: PathTree = [];
      const newFilteredPathTree: PathTree = [];
      pathTree.push(newPathTree);

      folders.push(folder);

      buildPageFolderTree(
        folder.contents,
        pages,
        folders,
        newPathTree,
        newFilteredPathTree,
        newChain,
      );

      if (newFilteredPathTree.length > 1) {
        filteredPathTree.push(newFilteredPathTree);
      }

    } else {
      const page = <Page>root[path];
      page.path = absolutePath;

      pathTree.push(absolutePath);

      if (!page.hidden) {
        filteredPathTree.push(absolutePath);
      }

      pages.push(page);
    }
  }
}

function buildFolderContents(folders: string[], pages: string[]): { [folder: string]: string[] } {
  const folderContents: { [folder: string]: string[] } = {};

  folderContents[''] = pages.slice();

  for (const folder of folders) {
    folderContents[folder] = [];

    for (const page of pages) {
      if (page.indexOf(folder) !== -1) {
        folderContents[folder].push(page);
      }
    }

    folderContents[folder].sort();
  }

  return folderContents;
}
