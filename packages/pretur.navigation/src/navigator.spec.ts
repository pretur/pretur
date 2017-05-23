/// <reference types="mocha" />

import { expect } from 'chai';
import { Pages, PageTreeRoot } from '../src/pages';
import { Navigator } from '../src/navigator';
import * as actions from '../src/actions';
import * as persist from '../src/persist';

// tslint:disable-next-line:no-null-keyword
const component = () => null!;
const reducerBuilder: any
  = () => (s = { value: 1 }, { value }: { value: any }) => value ? { value } : s;

const tree: PageTreeRoot = {
  'a': {
    contents: {
      'd': {
        contents: {
          'e': {
            component,
            hidden: true,
            reducerBuilder,
            titleKey: 'E',
          },
        },
        titleKey: 'D',
      },
      'g': {
        contents: {
          'e': {
            component,
            persistent: false,
            reducerBuilder,
            titleKey: 'E',
          },
        },
        titleKey: 'G',
      },
    },
    titleKey: 'A',
  },
  'f': {
    component,
    reducerBuilder,
    titleKey: 'F',
  },
  'k': {
    component,
    reducerBuilder,
    titleKey: 'F',
  },
};

const navigator = new Navigator(new Pages(tree), 'ADMIN');

function check(nav: Navigator, open: string[], active: string | undefined, store = true) {

  expect(nav.all.map(instance => instance.path)).to.deep.equal(open);

  if (!active) {
    expect(nav.active).to.be.undefined;
  } else {
    expect(nav.active!.mutex).to.be.equals(active);
  }

  expect(nav.activeMutex).to.be.equals(active);

  if (store) {
    checkStore(nav, open, active);
  }
}

function checkStore(_: Navigator, open: string[], active: string | undefined) {
  expect(persist.load('ADMIN').map(i => i.path)).to.be.deep.equal(open);
  expect(persist.loadActivePage('ADMIN')).to.be.equals(active);
}

describe('Navigator', () => {

  describe('dispatch/reduce', () => {

    describe('open', () => {

      it('should open a page and set active page to it', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });

        check(nav, ['a/d/e'], '1');
      });

      it('should ignore when the target is the current page', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        check(nav, ['a/d/e'], '1');

        const previousNav = nav;

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        check(nav, ['a/d/e'], '1');

        expect(nav).to.be.equals(previousNav);
      });

      it('should insert a page after a given index and set active page to it', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'f' });
        nav.open(dispatch, { mutex: '3', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '4', path: 'f', insertAfterMutex: '2' });

        check(nav, ['a/d/e', 'f', 'f', 'a/d/e'], '4');

        nav.open(dispatch, { mutex: '5', path: 'f', parent: '3', insertAfterMutex: '3' });

        check(nav, ['a/d/e', 'f', 'f', 'a/d/e', 'f'], '5');

        nav.open(dispatch, { mutex: '6', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '7', path: 'a/d/e' });

        check(nav, ['a/d/e', 'f', 'f', 'a/d/e', 'f', 'a/d/e', 'a/d/e'], '7');

        nav.open(dispatch, { mutex: '8', path: 'f', parent: '3', insertAfterMutex: '6' });

        check(nav, ['a/d/e', 'f', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'a/d/e'], '8');
      });

      it('should throw when opening a page with invalid parent', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        expect(() => nav.open(dispatch, { mutex: '3', path: 'a/d/e', parent: '2' })).to.throw();
      });

      it('should throw when opening a page as a child of itself', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        expect(() => nav.open(dispatch, { mutex: '2', path: 'a/d/e', parent: '2' })).to.throw();
      });

      it('should throw when trying to nest more than one level', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'a/d/e', parent: '1' });
        expect(() => nav.open(dispatch, { mutex: '3', path: 'a/d/e', parent: '2' })).to.throw();
      });

      it('should throw when trying to insert a page before parent', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'f' });
        nav.open(dispatch, { mutex: '3', path: 'a/d/e' });
        expect(() =>
          nav.open(dispatch, { mutex: '4', path: 'f', parent: '3', insertAfterMutex: '2' }),
        ).to.throw();
      });

      it('should ignore pages with unknown path', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'blah1' });
        nav.open(dispatch, { mutex: '2', path: 'blah2' });
        nav.open(dispatch, { mutex: '3', path: 'blah3' });
        nav.open(dispatch, { mutex: '4', path: 'blah4' });

        check(nav, [], undefined);
        expect(nav).to.be.equals(navigator);
      });

      it('should leave store unchanged when opening non persistent pages', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'f' });
        nav.open(dispatch, { mutex: '3', path: 'a/d/e' });

        check(nav, ['a/d/e', 'f', 'a/d/e'], '3');

        nav.open(dispatch, { mutex: '4', path: 'a/g/e' });
        nav.open(dispatch, { mutex: '5', path: 'f', parent: '4' });

        check(nav, ['a/d/e', 'f', 'a/d/e', 'a/g/e', 'f'], '5', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e'], '3');
      });

      it('should transit to pages with already open mutex instead', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'f', parent: '1' });
        nav.open(dispatch, { mutex: '3', path: 'a/d/e' });

        check(nav, ['a/d/e', 'f', 'a/d/e'], '3');

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });

        check(nav, ['a/d/e', 'f', 'a/d/e'], '1');
      });

    });

    describe('replace', () => {

      it('should behave like open when target mutex exists', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.replace(dispatch, '2', { mutex: '1', path: 'a/d/e' });

        check(nav, ['a/d/e'], '1');
      });

      it('should throw when replacing with a page with different parent', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'f' });
        nav.open(dispatch, { mutex: '3', path: 'a/d/e', parent: '1' });

        expect(
          () => nav.replace(dispatch, '3', { mutex: '4', path: 'a/d/e', parent: '2' }),
        ).to.throw();

        expect(
          () => nav.replace(dispatch, '3', { mutex: '4', path: 'a/d/e' }),
        ).to.throw();

        expect(
          () => nav.replace(dispatch, '2', { mutex: '4', path: 'a/d/e', parent: '1' }),
        ).to.throw();
      });

      it('should transit to pages with already open mutex instead', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'f' });
        nav.open(dispatch, { mutex: '3', path: 'a/d/e' });

        check(nav, ['a/d/e', 'f', 'a/d/e'], '3');

        nav.replace(dispatch, 'blah', { mutex: '1', path: 'a/d/e' });

        check(nav, ['a/d/e', 'f', 'a/d/e'], '1');
      });

      it('should properly replace an already open page', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'f' });
        nav.open(dispatch, { mutex: '3', path: 'a/d/e' });

        check(nav, ['a/d/e', 'f', 'a/d/e'], '3');

        nav.replace(dispatch, '2', { mutex: '4', path: 'a/d/e' });

        check(nav, ['a/d/e', 'a/d/e', 'a/d/e'], '4');
      });

      it('should properly replace an already open page with children', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'f' });
        nav.open(dispatch, { mutex: '3', path: 'f', parent: '2' });
        nav.open(dispatch, { mutex: '4', path: 'a/d/e', parent: '2' });
        nav.open(dispatch, { mutex: '5', path: 'f', parent: '2' });
        nav.open(dispatch, { mutex: '6', path: 'a/d/e' });

        check(nav, ['a/d/e', 'f', 'f', 'a/d/e', 'f', 'a/d/e'], '6');

        nav.replace(dispatch, '2', { mutex: '7', path: 'a/d/e' });

        check(nav, ['a/d/e', 'a/d/e', 'a/d/e'], '7');
      });

      it('should ignore pages with unknown path', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.replace(dispatch, 'blah', { mutex: '1', path: 'blah1' });
        nav.replace(dispatch, 'blah', { mutex: '2', path: 'blah2' });
        nav.replace(dispatch, 'blah', { mutex: '3', path: 'blah3' });
        nav.replace(dispatch, 'blah', { mutex: '4', path: 'blah4' });

        check(nav, [], undefined);
        expect(nav).to.be.equals(navigator);
      });

      it('should remove the replaced page from store when the new page is not persistent', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'f' });
        nav.open(dispatch, { mutex: '2.5', path: 'f', parent: '2' });
        nav.open(dispatch, { mutex: '3', path: 'a/d/e' });

        check(nav, ['a/d/e', 'f', 'f', 'a/d/e'], '3');

        nav.replace(dispatch, '2', { mutex: '4', path: 'a/g/e' });

        check(nav, ['a/d/e', 'a/g/e', 'a/d/e'], '4', false);
        checkStore(nav, ['a/d/e', 'a/d/e'], '3');
      });

    });

    describe('close', () => {

      let nav: Navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);
      beforeEach('open pages for testing close', () => {
        persist.clear('ADMIN');
        nav = navigator;
        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'f' });
        nav.open(dispatch, { mutex: '3', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '4', path: 'f' });

        check(nav, ['a/d/e', 'f', 'a/d/e', 'f'], '4');
      });

      it('should ignore if the mutex is not open', () => {
        const previousNav = nav;
        nav.close(dispatch, undefined!);
        nav.close(dispatch, 'blah');
        expect(previousNav).to.be.equals(nav);
      });

      it('should close the page if it exists', () => {
        nav.close(dispatch, '2');
        check(nav, ['a/d/e', 'a/d/e', 'f'], '4');
        nav.close(dispatch, '3');
        check(nav, ['a/d/e', 'f'], '4');
        nav.close(dispatch, '1');
        nav.close(dispatch, '1');
        check(nav, ['f'], '4');
      });

      it('should close the page and all it\'s children', () => {
        nav.open(dispatch, { mutex: '5', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '6', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '7', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '8', path: 'a/d/e', parent: '5' });
        nav.open(dispatch, { mutex: '9', path: 'f' });
        nav.open(dispatch, { mutex: '10', path: 'a/d/e', parent: '9' });
        nav.transit(dispatch, '4');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'f', 'a/d/e', 'f', 'a/d/e'], '4');
        nav.close(dispatch, '5');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'f', 'a/d/e'], '4');
        nav.close(dispatch, '9');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f'], '4');
      });

      it('should leave store unchanged when closing non persistent pages', () => {
        nav.open(dispatch, { mutex: '5', path: 'a/g/e' });
        nav.open(dispatch, { mutex: '6', path: 'a/g/e' });
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/g/e', 'a/g/e'], '6', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e', 'f'], '4');

        nav.transit(dispatch, '1');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/g/e', 'a/g/e'], '1', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e', 'f'], '1');

        nav.close(dispatch, '5');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/g/e'], '1', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e', 'f'], '1');

        nav.transit(dispatch, '6');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/g/e'], '6', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e', 'f'], '1');

        nav.close(dispatch, '6');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f'], '4', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e', 'f'], '4');
      });

      it('should leave store unchanged when closing pages with non persistent parent', () => {
        nav.open(dispatch, { mutex: '5', path: 'a/g/e' });
        nav.open(dispatch, { mutex: '6', path: 'a/d/e', parent: '5' });
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/g/e', 'a/d/e'], '6', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e', 'f'], '4');
      });

      it('should clear active page when active page targets a non persistent page', () => {
        nav.open(dispatch, { mutex: '5', path: 'a/g/e' });
        nav.open(dispatch, { mutex: '6', path: 'a/d/e' });
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/g/e', 'a/d/e'], '6', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e'], '6');

        nav.close(dispatch, '6');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/g/e'], '5', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e', 'f'], undefined);
      });

      it('should properly change the active page after it has been closed', () => {
        nav.close(dispatch, '4');
        check(nav, ['a/d/e', 'f', 'a/d/e'], '3');
        nav.transit(dispatch, '1');
        check(nav, ['a/d/e', 'f', 'a/d/e'], '1');
        nav.close(dispatch, '1');
        check(nav, ['f', 'a/d/e'], '2');
        nav.close(dispatch, '2');
        check(nav, ['a/d/e'], '3');
      });

      it('should properly change the active page when there are nesting present', () => {
        nav.open(dispatch, { mutex: '5', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '6', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '7', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '8', path: 'a/d/e' });
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'f', 'a/d/e'], '8');
        nav.close(dispatch, '8');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'f'], '5');
      });

      it('should properly change the active page when there are nesting present (messy)', () => {
        nav.open(dispatch, { mutex: '5', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '6', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '7', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '8', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '9', path: 'a/d/e' });
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'a/d/e'], '9');
        nav.close(dispatch, '9');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f'], '7');
      });

      it('should properly change the active page when it\' the only child', () => {
        nav.open(dispatch, { mutex: '5', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '6', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '7', path: 'a/d/e' });
        nav.transit(dispatch, '6');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'a/d/e'], '6');
        nav.close(dispatch, '6');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'a/d/e'], '5');
      });

      it('should properly change the active page when it\'s the only child (messy)', () => {
        nav.open(dispatch, { mutex: '5', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '6', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '7', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '8', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '9', path: 'a/d/e' });
        nav.transit(dispatch, '8');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'a/d/e', 'a/d/e', 'f', 'a/d/e'], '8');
        nav.close(dispatch, '8');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'a/d/e', 'a/d/e', 'a/d/e'], '5');
      });

      it('should properly change the active page when it has siblings', () => {
        nav.open(dispatch, { mutex: '5', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '6', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '7', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '8', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '9', path: 'a/d/e' });
        nav.transit(dispatch, '8');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'f', 'f', 'a/d/e'], '8');
        nav.close(dispatch, '8');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'f', 'a/d/e'], '7');
        nav.transit(dispatch, '6');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'f', 'a/d/e'], '6');
        nav.close(dispatch, '6');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'a/d/e'], '7');
      });

      it('should properly change the active page when it has siblings (messy)', () => {
        nav.open(dispatch, { mutex: '5', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '6', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: 'a', path: 'k' });
        nav.open(dispatch, { mutex: '7', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: 'b', path: 'k' });
        nav.open(dispatch, { mutex: 'c', path: 'k' });
        nav.open(dispatch, { mutex: '8', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '9', path: 'k' });
        nav.transit(dispatch, '8');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'k', 'f', 'k', 'k', 'f', 'k'], '8');
        nav.close(dispatch, '8');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'k', 'f', 'k', 'k', 'k'], '7');
        nav.transit(dispatch, '6');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'k', 'f', 'k', 'k', 'k'], '6');
        nav.close(dispatch, '6');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'k', 'f', 'k', 'k', 'k'], '7');
      });

      it('should properly change the active page when it is the parent of active', () => {
        nav.open(dispatch, { mutex: '5', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '6', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '7', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '8', path: 'f', parent: '5' });
        nav.open(dispatch, { mutex: '9', path: 'a/d/e' });
        nav.transit(dispatch, '8');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e', 'f', 'f', 'f', 'a/d/e'], '8');
        nav.close(dispatch, '5');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'f', 'a/d/e'], '4');
      });

      it('should properly change the active page to the provided goto when provided', () => {
        nav.close(dispatch, '4', '1');
        check(nav, ['a/d/e', 'f', 'a/d/e'], '1');
      });

      it('should ignore goto when invalid', () => {
        nav.close(dispatch, '4', 'blah');
        check(nav, ['a/d/e', 'f', 'a/d/e'], '3');
      });

      it('should ignore goto when self referring', () => {
        nav.close(dispatch, '4', '4');
        check(nav, ['a/d/e', 'f', 'a/d/e'], '3');
      });

      it('should set active page to undefined if all pages are closed', () => {
        nav.close(dispatch, '1');
        nav.close(dispatch, '2');
        nav.close(dispatch, '3');
        nav.close(dispatch, '4');
        check(nav, [], undefined);
      });

    });

    describe('transit', () => {

      let nav: Navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);
      beforeEach('open pages for testing close', () => {
        persist.clear('ADMIN');
        nav = navigator;
        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'f' });
        nav.open(dispatch, { mutex: '3', path: 'a/d/e', parent: '2' });

        check(nav, ['a/d/e', 'f', 'a/d/e'], '3');
      });

      it('should ignore if the mutex is not open', () => {
        const previousNav = nav;
        nav.transit(dispatch, 'blah');
        expect(previousNav).to.be.equals(nav);
      });

      it('should ignore when the target is the current page', () => {
        const previousNav = nav;
        nav.transit(dispatch, '3');
        check(nav, ['a/d/e', 'f', 'a/d/e'], '3');
        expect(previousNav).to.be.equals(nav);
      });

      it('should transit to undefined properly', () => {
        nav.transit(dispatch, undefined);
        check(nav, ['a/d/e', 'f', 'a/d/e'], undefined);
      });

      it('should leave store unchanged when transiting to non persistent pages', () => {
        nav.open(dispatch, { mutex: '4', path: 'a/g/e' });
        nav.open(dispatch, { mutex: '5', path: 'a/g/e' });
        check(nav, ['a/d/e', 'f', 'a/d/e', 'a/g/e', 'a/g/e'], '5', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e'], '3');

        nav.transit(dispatch, '4');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'a/g/e', 'a/g/e'], '4', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e'], '3');

        nav.transit(dispatch, '5');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'a/g/e', 'a/g/e'], '5', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e'], '3');

        nav.transit(dispatch, '2');
        check(nav, ['a/d/e', 'f', 'a/d/e', 'a/g/e', 'a/g/e'], '2', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e'], '2');
      });

      it('should peroperly transit to the target mutex', () => {
        nav.transit(dispatch, '1');
        check(nav, ['a/d/e', 'f', 'a/d/e'], '1');
        nav.transit(dispatch, '3');
        check(nav, ['a/d/e', 'f', 'a/d/e'], '3');
        nav.transit(dispatch, '2');
        check(nav, ['a/d/e', 'f', 'a/d/e'], '2');
      });

    });

    describe('clear', () => {

      it('should properly clear all and active pages', () => {
        let nav: Navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);
        persist.clear('ADMIN');
        nav = navigator;
        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'f' });
        nav.open(dispatch, { mutex: '3', path: 'a/d/e', parent: '2' });

        check(nav, ['a/d/e', 'f', 'a/d/e'], '3');
        nav.clear(dispatch);
        check(nav, [], undefined);
      });

    });

    describe('load', () => {

      it('should return self if persistent store is empty or has invalid paths', () => {
        let nav: Navigator = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);
        persist.clear('ADMIN');

        nav.load(dispatch);

        expect(nav).to.be.equals(navigator);

        persist.save('ADMIN', [
          { mutex: '1', path: 'blah!' },
          { mutex: '2', path: 'blah!blah!' },
          { mutex: '3', path: 'blah!blah!blah!' },
        ]);
        persist.saveActivePage('ADMIN', '2');

        nav.load(dispatch);

        expect(nav).to.be.equals(navigator);
      });

      it('should properly load instances and the active page from persistent store', () => {
        let nav: Navigator = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);
        persist.clear('ADMIN');
        persist.save('ADMIN', [
          { mutex: '1', path: 'a/d/e' },
          { mutex: '2', path: 'f' },
          { mutex: '3', path: 'a/d/e', parent: '2' },
        ]);
        persist.saveActivePage('ADMIN', '3');

        nav.load(dispatch);

        check(nav, ['a/d/e', 'f', 'a/d/e'], '3');
      });

      it('should ignore unknown paths', () => {
        let nav: Navigator = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);
        persist.clear('ADMIN');
        persist.save('ADMIN', [
          { mutex: '1', path: 'a/d/e' },
          { mutex: '2', path: 'blah!' },
          { mutex: '3', path: 'a/d/e', parent: '1' },
        ]);
        persist.saveActivePage('ADMIN', '2');

        nav.load(dispatch);

        check(nav, ['a/d/e', 'a/d/e'], undefined, false);
      });

      it('should tolerate undefined active page', () => {
        let nav: Navigator = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);
        persist.clear('ADMIN');
        persist.save('ADMIN', [
          { mutex: '1', path: 'a/d/e' },
          { mutex: '2', path: 'a/d/e' },
        ]);

        nav.load(dispatch);

        check(nav, ['a/d/e', 'a/d/e'], undefined);
      });

    });

  });

  describe('composite reduction', () => {

    let nav: Navigator;
    const dispatch: any = (a: any) => nav = nav.reduce(a);
    beforeEach('open pages for testing close', () => {
      persist.clear('ADMIN');
      nav = navigator;
      nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
      nav.open(dispatch, { mutex: '2', path: 'f' });
      nav.open(dispatch, { mutex: '3', path: 'a/d/e' });

      check(nav, ['a/d/e', 'f', 'a/d/e'], '3');
    });

    it('should properly initialize page states', () => {
      nav.all.forEach(page => expect(page!.state).to.be.deep.equal({ value: 1 }));
    });

    it('should absorb actions that target it', () => {
      const action1: any = actions.NAVIGATION_CLOSE_PAGE.create.unicast('ADMIN', { mutex: '2' });
      action1['value'] = 10;
      const newNav1 = nav.reduce(action1);
      expect(nav.active!.state.value).to.be.equals(1);
      expect(newNav1.active!.state.value).to.be.equals(1);

      const action2: any = actions.NAVIGATION_OPEN_PAGE.create.unicast('ADMIN', {
        mutex: '3',
        path: 'a/d/e',
      });

      action2['value'] = 10;
      const newNav2 = nav.reduce(action2);
      expect(nav.active!.state.value).to.be.equals(1);
      expect(newNav2.active!.state.value).to.be.equals(1);

      const action3: any = actions.NAVIGATION_TRANSIT_TO_PAGE.create.unicast('ADMIN', '3');
      action3['value'] = 10;
      const newNav3 = nav.reduce(action3);
      expect(nav.active!.state.value).to.be.equals(1);
      expect(newNav3.active!.state.value).to.be.equals(1);
    });

  });

  describe('all', () => {

    it('should return an empty map', () => {
      expect(navigator.all.map(instance => instance.path)).to.deep.equal([]);
    });

    it('should return all open pages in correct order', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
      nav.open(dispatch, { mutex: '2', path: 'a/d/e' });
      nav.open(dispatch, { mutex: '3', path: 'f' });
      nav.open(dispatch, { mutex: '4', path: 'a/d/e' });
      nav.open(dispatch, { mutex: '2', path: 'a/d/e' });
      nav.open(dispatch, { mutex: '3', path: 'f' });
      nav.open(dispatch, { mutex: '5', path: 'f' });

      expect(nav.all.map(instance => instance.path)).to.deep.equal([
        'a/d/e',
        'a/d/e',
        'f',
        'a/d/e',
        'f',
      ]);
    });

  });

  describe('roots', () => {

    it('should return an empty map', () => {
      expect(navigator.roots.map(instance => instance.path)).to.deep.equal([]);
    });

    it('should return all open root pages in correct order', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
      nav.open(dispatch, { mutex: '2', path: 'a/d/e', parent: '1' });
      nav.open(dispatch, { mutex: '3', path: 'f', parent: '1' });
      nav.open(dispatch, { mutex: '4', path: 'a/d/e' });
      nav.open(dispatch, { mutex: '2', path: 'a/d/e', parent: '1' });
      nav.open(dispatch, { mutex: '3', path: 'f', parent: '4' });
      nav.open(dispatch, { mutex: '5', path: 'f' });

      expect(nav.roots.map(instance => instance.mutex)).to.deep.equal(['1', '4', '5']);
      expect(nav.roots.map(instance => instance.path)).to.deep.equal(['a/d/e', 'a/d/e', 'f']);
    });

  });

  describe('active', () => {

    it('should return undefined when there are no active pages', () => {
      expect(navigator.active).to.be.undefined;
    });

    it('should return the current active page', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '5', path: 'f' });

      expect(nav.active!.mutex).to.be.equals('5');
    });

  });

  describe('activeMutex', () => {

    it('should return undefined when there are no active pages', () => {
      expect(navigator.activeMutex).to.be.undefined;
    });

    it('should return the current active page\'s mutex', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '5', path: 'f' });

      expect(nav.activeMutex).to.be.equals('5');
    });

  });

  describe('activeRootMutex', () => {

    it('should return undefined when there are no active pages', () => {
      expect(navigator.activeRootMutex).to.be.undefined;
    });

    it('should return the current active page\'s mutex when current page is root', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '5', path: 'f' });
      nav.open(dispatch, { mutex: '6', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '7', path: 'a/d/e', parent: '5' });

      nav.transit(dispatch, '5');

      expect(nav.activeRootMutex).to.be.equals('5');
    });

    it('should return the parent mutex of current active page', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '5', path: 'f' });
      nav.open(dispatch, { mutex: '6', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '7', path: 'a/d/e', parent: '5' });

      nav.transit(dispatch, '6');

      expect(nav.activeMutex).to.be.equals('6');
      expect(nav.activeRootMutex).to.be.equals('5');
    });

  });

  describe('activeRootIndex', () => {

    it('should return -1 when there are no active pages', () => {
      expect(navigator.activeRootIndex).to.be.equals(-1);
    });

    it('should return the current active page\'s index when current page is root', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '5', path: 'f' });
      nav.open(dispatch, { mutex: '6', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '7', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '8', path: 'f' });
      nav.open(dispatch, { mutex: '9', path: 'a/d/e', parent: '8' });
      nav.open(dispatch, { mutex: '10', path: 'a/d/e', parent: '8' });

      nav.transit(dispatch, '5');
      expect(nav.activeRootIndex).to.be.equals(0);

      nav.transit(dispatch, '8');
      expect(nav.activeRootIndex).to.be.equals(1);
    });

    it('should return the parent root index of current active page', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '5', path: 'f' });
      nav.open(dispatch, { mutex: '6', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '7', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '8', path: 'f' });
      nav.open(dispatch, { mutex: '9', path: 'a/d/e', parent: '8' });
      nav.open(dispatch, { mutex: '10', path: 'a/d/e', parent: '8' });
      nav.open(dispatch, { mutex: '11', path: 'f' });

      nav.transit(dispatch, '6');

      expect(nav.activeMutex).to.be.equals('6');
      expect(nav.activeRootIndex).to.be.equals(0);

      nav.transit(dispatch, '9');

      expect(nav.activeMutex).to.be.equals('9');
      expect(nav.activeRootIndex).to.be.equals(1);

      nav.transit(dispatch, '11');

      expect(nav.activeMutex).to.be.equals('11');
      expect(nav.activeRootIndex).to.be.equals(2);
    });

  });

  describe('indexAsChildOfActiveRoot', () => {

    it('should return -1 when there are no active pages', () => {
      expect(navigator.indexAsChildOfActiveRoot).to.be.equals(-1);
    });

    it('should return -1 when the current page is not a child', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '5', path: 'f' });
      nav.open(dispatch, { mutex: '6', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '7', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '8', path: 'f' });
      nav.open(dispatch, { mutex: '9', path: 'a/d/e', parent: '8' });
      nav.open(dispatch, { mutex: '10', path: 'a/d/e', parent: '8' });

      nav.transit(dispatch, '5');
      expect(nav.indexAsChildOfActiveRoot).to.be.equals(-1);

      nav.transit(dispatch, '8');
      expect(nav.indexAsChildOfActiveRoot).to.be.equals(-1);
    });

    it('should return the index relative to it\'s siblings when active page is a child', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '5', path: 'f' });
      nav.open(dispatch, { mutex: '6', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '7', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '8', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '9', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '10', path: 'f' });
      nav.open(dispatch, { mutex: '11', path: 'a/d/e', parent: '10' });
      nav.open(dispatch, { mutex: '12', path: 'a/d/e', parent: '10' });
      nav.open(dispatch, { mutex: '13', path: 'a/d/e', parent: '10' });
      nav.open(dispatch, { mutex: '14', path: 'a/d/e', parent: '10' });
      nav.open(dispatch, { mutex: '15', path: 'a/d/e', parent: '10' });

      nav.transit(dispatch, '6');
      expect(nav.indexAsChildOfActiveRoot).to.be.equals(0);

      nav.transit(dispatch, '9');
      expect(nav.indexAsChildOfActiveRoot).to.be.equals(3);

      nav.transit(dispatch, '12');
      expect(nav.indexAsChildOfActiveRoot).to.be.equals(1);

      nav.transit(dispatch, '13');
      expect(nav.indexAsChildOfActiveRoot).to.be.equals(2);

      nav.transit(dispatch, '15');
      expect(nav.indexAsChildOfActiveRoot).to.be.equals(4);

    });

  });

  describe('hasChildren', () => {

    it('should return true when there are one or more children', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '5', path: 'f' });
      nav.open(dispatch, { mutex: '6', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '7', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '8', path: 'f' });
      nav.open(dispatch, { mutex: '9', path: 'a/d/e', parent: '8' });

      expect(nav.hasChildren('5')).to.be.true;
      expect(nav.hasChildren('8')).to.be.true;
    });

    it('should return false when there are no children', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '5', path: 'f' });
      nav.open(dispatch, { mutex: '6', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '7', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '8', path: 'f' });
      nav.open(dispatch, { mutex: '9', path: 'a/d/e', parent: '8' });
      nav.open(dispatch, { mutex: '10', path: 'f' });

      expect(nav.hasChildren('10')).to.be.false;
      expect(nav.hasChildren('11')).to.be.false;
    });

  });

  describe('childrenOf', () => {

    it('should return the list of children when there are one or more children', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '5', path: 'f' });
      nav.open(dispatch, { mutex: '6', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '7', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '8', path: 'f' });
      nav.open(dispatch, { mutex: '9', path: 'a/d/e', parent: '8' });

      expect(nav.childrenOf('5').map(page => page.mutex)).to.deep.equal(['6', '7']);
      expect(nav.childrenOf('8').map(page => page.mutex)).to.deep.equal(['9']);
    });

    it('should return empty array when there are no children', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '5', path: 'f' });
      nav.open(dispatch, { mutex: '6', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '7', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '8', path: 'f' });
      nav.open(dispatch, { mutex: '9', path: 'a/d/e', parent: '8' });
      nav.open(dispatch, { mutex: '10', path: 'f' });

      expect(nav.childrenOf('10')).to.deep.equal([]);
      expect(nav.childrenOf('11')).to.deep.equal([]);
    });

  });

  describe('pageFromMutex', () => {

    it('should return the page identified by mutex', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '5', path: 'f' });
      nav.open(dispatch, { mutex: '6', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '7', path: 'a/d/e', parent: '5' });
      nav.open(dispatch, { mutex: '8', path: 'f' });
      nav.open(dispatch, { mutex: '9', path: 'a/d/e', parent: '8' });
      nav.open(dispatch, { mutex: '10', path: 'f' });

      expect(nav.pageFromMutex('6')).not.to.be.undefined;
      expect(nav.pageFromMutex('6')!.path).be.equals('a/d/e');
      expect(nav.pageFromMutex('8')).not.to.be.undefined;
      expect(nav.pageFromMutex('8')!.path).be.equals('f');
      expect(nav.pageFromMutex('10')).not.to.be.undefined;
      expect(nav.pageFromMutex('10')!.path).be.equals('f');
      expect(nav.pageFromMutex('11')).to.be.undefined;
    });

  });

});
