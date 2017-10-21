/// <reference types="mocha" />

import { expect } from 'chai';
import { buildNode } from 'reducible-node';
import { buildDescriptorsFromTree } from './buildDescriptorsFromTree';
import { folder, buildPage } from './pages';

// tslint:disable-next-line:no-null-keyword
const component = () => null!;
const node = buildNode(() => ({}));

const descriptors = buildDescriptorsFromTree({
  'a': folder('A', {
    'b': folder('B', {
      'c': buildPage(component, node, { title: 'C' }),
    }),
    'd': folder('D', {
      'e': buildPage(component, node, { title: 'E' }),
    }),
  }),
  'f': buildPage(component, node, { title: 'F' }),
  'g': folder('G', {
    'h': buildPage(component, node, { hidden: true, title: 'H' }),
  }),
});

describe('buildDescriptorsFromTree', () => {

  it('should build valid page descriptors with correct path', () => {
    expect(descriptors.pages.map(p => p.path)).to.deep.equal([
      'a/b/c',
      'a/d/e',
      'f',
      'g/h',
    ]);
  });

  it('should build valid folder descriptors with correct path', () => {
    expect(descriptors.folders.map(p => p.path)).to.deep.equal([
      'a',
      'a/b',
      'a/d',
      'g',
    ]);
  });

  it('should properly set hidden', () => {
    expect(descriptors.pages.filter(p => p.hidden).map(p => p.path)).to.deep.equal(['g/h']);
  });

  it('should build valid path tree', () => {
    expect(descriptors.pathTree).to.deep.equal([
      '',
      ['a', ['a/b', 'a/b/c'], ['a/d', 'a/d/e']],
      'f',
      ['g', 'g/h'],
    ]);
  });

  it('should build valid folder contents', () => {
    expect(descriptors.folderContents).to.deep.equal({
      '': ['a/b/c', 'a/d/e', 'f', 'g/h'],
      'a': ['a/b/c', 'a/d/e'],
      'a/b': ['a/b/c'],
      'a/d': ['a/d/e'],
      'g': ['g/h'],
    });
  });

  it('should build valid filtered path tree', () => {
    expect(descriptors.filteredPathTree).to.deep.equal([
      '',
      ['a', ['a/b', 'a/b/c'], ['a/d', 'a/d/e']],
      'f',
    ]);
  });

  it('should build valid filtered folder contents', () => {
    expect(descriptors.filteredFolderContents).to.deep.equal({
      '': ['a/b/c', 'a/d/e', 'f'],
      'a': ['a/b/c', 'a/d/e'],
      'a/b': ['a/b/c'],
      'a/d': ['a/d/e'],
      'g': [],
    });
  });

  it('should augment the initial page and folder objects to include the path', () => {
    const tree = {
      'a': folder('A', {
        'b': folder('B', {
          'c': buildPage(component, node, { title: 'C' }),
        }),
        'd': folder('D', {
          'e': buildPage(component, node, { title: 'E' }),
        }),
      }),
    };

    buildDescriptorsFromTree(tree);

    expect(tree.a.path).to.be.equals('a');
    expect(tree.a.contents.b.path).to.be.equals('a/b');
    expect(tree.a.contents.b.contents.c.path).to.be.equals('a/b/c');
    expect(tree.a.contents.d.path).to.be.equals('a/d');
    expect(tree.a.contents.d.contents.e.path).to.be.equals('a/d/e');
  });

});
