/// <reference types="mocha" />

import { expect } from 'chai';
import { StatelessComponent } from 'react';
import { Pages, PageTreeRoot, PageReducerBuilder, buildPage } from '../src/pages';

const component: StatelessComponent<void> = () => null!;
const reducerBuilder: PageReducerBuilder<void, string> = () => () => 'state!';

const tree: PageTreeRoot = {
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
        hidden: true,
        titleKey: 'B',
      },
      'd': {
        contents: {
          'e': {
            component,
            reducerBuilder,
            hidden: true,
            titleKey: 'E',
          },
        },
        titleKey: 'D',
      },
    },
    titleKey: 'A',
  },
  'f': {
    component,
    reducerBuilder,
    titleKey: 'F',
  },
};

describe('buildPage', () => {

  it('should properly build a page', () => {
    const page = buildPage(component, reducerBuilder, 'A', true);
    expect(page.component).to.be.equals(component);
    expect(page.reducerBuilder).to.be.equals(reducerBuilder);
    expect(page.titleKey).to.be.equals('A');
    expect(page.hidden).to.be.equals(true);
    expect(page.persistent).to.be.equals(false);
  });

});

describe('Pages', () => {

  it('should correctly determine whether is has a folder of specified path', () => {
    const pages = new Pages(tree);
    expect(pages.hasFolder('a/d')).to.be.true;
  });

  it('should correctly determine whether is has a page of specified path', () => {
    const pages = new Pages(tree);
    expect(pages.hasPage('a/d/e')).to.be.true;
  });

  it('should correctly determine whether the specified path is hidden', () => {
    const pages = new Pages(tree);
    expect(pages.isHidden('a/d/e')).to.be.true;
    expect(pages.isHidden('a/b')).to.be.true;
    expect(pages.isHidden('a/b/c')).to.be.true;
  });

  it('should return a folder of specified path', () => {
    const pages = new Pages(tree);
    expect(pages.getFolder('a/d').titleKey).to.be.equals('D');
  });

  it('should return a page of specified path', () => {
    const pages = new Pages(tree);
    expect(pages.getPage('a/b/c').titleKey).to.be.equals('C');
  });

  it('should build valid page instances with unique ids', () => {
    const pages = new Pages(tree);
    const ins1 = pages.buildInstance({ mutex: '1', path: 'a/b/c' });
    const ins2 = pages.buildInstance({ mutex: '2', path: 'a/d/e' });
    const ins3 = pages.buildInstance({ mutex: '3', path: 'f' });
    expect(ins1.descriptor.path).to.be.equals('a/b/c');
    expect(ins2.descriptor.path).to.be.equals('a/d/e');
    expect(ins3.descriptor.path).to.be.equals('f');
    expect(ins1.mutex).to.be.equals('1');
    expect(ins2.mutex).to.be.equals('2');
    expect(ins3.mutex).to.be.equals('3');
  });

  it('should fail to build a page from an unknown path', () => {
    const pages = new Pages(tree);
    expect(() => pages.buildInstance({ mutex: '1', path: 'blah!' })).to.throw();
  });

});
