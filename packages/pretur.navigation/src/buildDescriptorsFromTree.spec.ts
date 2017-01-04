/// <reference types="mocha" />

import { expect } from 'chai';
import { buildDescriptorsFromTree } from '../src/buildDescriptorsFromTree';

// tslint:disable-next-line:no-null-keyword
const component = () => null!;
const reducerBuilder = () => () => 'state!';

const descriptors = buildDescriptorsFromTree({
  'a': {
    contents: {
      'b': {
        contents: {
          'c': {
            component,
            reducerBuilder,
            titleKey: 'C',
          },
        },
        titleKey: 'B',
      },
      'd': {
        contents: {
          'e': {
            component,
            reducerBuilder,
            titleKey: 'E',
          },
        },
        titleKey: 'D',
      },
    },
    hidden: true,
    titleKey: 'A',
  },
  'f': {
    component,
    reducerBuilder,
    titleKey: 'F',
  },
  'g': {
    contents: {
      'h': {
        component,
        reducerBuilder,
        hidden: true,
        titleKey: 'H',
      },
    },
    titleKey: 'G',
  },
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

  it('should properly propagate hidden', () => {
    expect(Array.prototype.concat(
      descriptors.folders.filter(f => !!f.hidden).map(f => f.path),
      descriptors.pages.filter(p => p.hidden).map(p => p.path),
    )).to.deep.equal([
      'a',
      'a/b',
      'a/d',
      'g',
      'a/b/c',
      'a/d/e',
      'g/h',
    ]);
  });

  it('should build valid path tree', () => {
    expect(descriptors.pathTree).to.deep.equal([
      '',
      [
        'a',
        [
          'a/b',
          'a/b/c',
        ],
        [
          'a/d',
          'a/d/e',
        ],
      ],
      'f',
      [
        'g',
        'g/h',
      ],
    ]);
  });

  it('should build valid folder contents', () => {
    expect(descriptors.folderContents).to.deep.equal({
      '': [
        'a/b/c',
        'a/d/e',
        'f',
        'g/h',
      ],
      'a': [
        'a/b/c',
        'a/d/e',
      ],
      'a/b': [
        'a/b/c',
      ],
      'a/d': [
        'a/d/e',
      ],
      'g': [
        'g/h',
      ],
    });
  });

  it('should build valid filtered path tree', () => {
    expect(descriptors.filteredPathTree).to.deep.equal([
      '',
      'f',
    ]);
  });

  it('should build valid folder contents', () => {
    expect(descriptors.filteredFolderContents).to.deep.equal({
      '': [
        'f',
      ],
    });
  });

  it('should augment the initial page and folder objects to include the path', () => {
    const tree = {
      'a': {
        contents: {
          'b': {
            contents: {
              'c': {
                titleKey: 'C',
                component,
                reducerBuilder,
              },
            },
            titleKey: 'B',
          },
          'd': {
            contents: {
              'e': {
                titleKey: 'E',
                component,
                reducerBuilder,
              },
            },
            titleKey: 'D',
          },
        },
        hidden: true,
        titleKey: 'A',
      },
    };

    buildDescriptorsFromTree(tree);

    expect((<any>tree.a)['path']).to.be.equals('a');
    expect((<any>tree.a.contents.b)['path']).to.be.equals('a/b');
    expect((<any>tree.a.contents.b.contents.c)['path']).to.be.equals('a/b/c');
    expect((<any>tree.a.contents.d)['path']).to.be.equals('a/d');
    expect((<any>tree.a.contents.d.contents.e)['path']).to.be.equals('a/d/e');
  });

});
