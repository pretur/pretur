/// <reference types="mocha" />

import { expect } from 'chai';
import { StatelessComponent } from 'react';
import { buildNode } from 'reducible-node';
import { Pages, buildPage, folder } from './pages';

// tslint:disable-next-line:no-null-keyword
const component: StatelessComponent<void> = () => null!;
const node = buildNode(() => ({ value: 'state!' }));

const tree = {
  'a': folder('A', {
    'b': folder('B', {
      'c': buildPage(component, node, { title: 'C' }),
    }),
    'd': folder('D', {
      'e': buildPage(component, node, { title: 'E', hidden: true }),
    }),
  }),
  'f': buildPage(component, node, { title: 'F' }),
};

describe('buildPage', () => {

  it('should properly build a page', () => {
    const page = buildPage(component, node, { title: 'A' });
    expect(page.component).to.be.equals(component);
    expect(page.node).to.be.equals(node);
    expect(page.title).to.be.equals('A');
    expect(page.hidden).to.be.equals(false);
    expect(page.persistent).to.be.equals(true);
  });

  it('should properly build a page with persistent=false', () => {
    const page = buildPage(component, node, { title: 'A', persistent: false });
    expect(page.component).to.be.equals(component);
    expect(page.node).to.be.equals(node);
    expect(page.title).to.be.equals('A');
    expect(page.hidden).to.be.equals(false);
    expect(page.persistent).to.be.equals(false);
  });

  it('should properly build a page with hidden=true', () => {
    const page = buildPage(component, node, { title: 'A', hidden: true });
    expect(page.component).to.be.equals(component);
    expect(page.node).to.be.equals(node);
    expect(page.title).to.be.equals('A');
    expect(page.hidden).to.be.equals(true);
    expect(page.persistent).to.be.equals(true);
  });

});

describe('Pages', () => {

  it('should correctly determine whether is has a folder of specified path', () => {
    const pages = new Pages('', tree);
    expect(pages.hasFolder('a/d')).to.be.true;
  });

  it('should correctly determine whether is has a page of specified path', () => {
    const pages = new Pages('', tree);
    expect(pages.hasPage('a/d/e')).to.be.true;
  });

  it('should correctly determine whether the specified path is hidden', () => {
    const pages = new Pages('', tree);
    expect(pages.isHidden('a/d/e')).to.be.true;
    expect(pages.isHidden('a/b/c')).to.be.false;
  });

  it('should return a folder of specified path', () => {
    const pages = new Pages('', tree);
    expect(pages.getFolder('a/d').title).to.be.equals('D');
  });

  it('should return a page of specified path', () => {
    const pages = new Pages('', tree);
    expect(pages.getPage('a/b/c').title).to.be.equals('C');
  });

  it('should build valid page instances with unique ids', () => {
    const pages = new Pages('', tree);
    const ins1 = pages.buildInstance({ mutex: '1', path: 'a/b/c' });
    const ins2 = pages.buildInstance({ mutex: '2', path: 'a/d/e' });
    const ins3 = pages.buildInstance({ mutex: '3', path: 'f', parent: '2' });
    expect(ins1.path).to.be.equals('a/b/c');
    expect(ins2.path).to.be.equals('a/d/e');
    expect(ins3.path).to.be.equals('f');
    expect(ins1.mutex).to.be.equals('1');
    expect(ins2.mutex).to.be.equals('2');
    expect(ins3.mutex).to.be.equals('3');
    expect(ins1.parent).to.be.undefined;
    expect(ins2.parent).to.be.undefined;
    expect(ins3.parent).to.be.equals('2');
  });

  it('should fail to build a page from an unknown path', () => {
    const pages = new Pages('', tree);
    expect(() => pages.buildInstance({ mutex: '1', path: 'blah!' })).to.throw();
  });

});
