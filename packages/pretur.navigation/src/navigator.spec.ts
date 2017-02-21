/// <reference types="mocha" />

import { expect } from 'chai';
import { find } from 'lodash';
import { Pages, PageTreeRoot } from '../src/pages';
import { Navigator, deisolate } from '../src/navigator';
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
            reducerBuilder,
            hidden: true,
            titleKey: 'E',
          },
        },
        titleKey: 'D',
      },
      'g': {
        contents: {
          'e': {
            component,
            reducerBuilder,
            persistent: false,
            titleKey: 'E',
          },
        },
        titleKey: 'G',
      },
    },
    titleKey: 'A',
  },
  'f': {
    titleKey: 'F',
    component,
    reducerBuilder,
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

        check(nav, ['a/d/e', 'f', 'a/d/e', 'a/g/e'], '4', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e'], '3');
      });

      it('should transit to pages with already open mutex instead', () => {
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'f' });
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

      it('should leave store unchanged when replacing non persistent pages', () => { //
        persist.clear('ADMIN');
        let nav = navigator;
        const dispatch: any = (a: any) => nav = nav.reduce(a);

        nav.open(dispatch, { mutex: '1', path: 'a/d/e' });
        nav.open(dispatch, { mutex: '2', path: 'f' });
        nav.open(dispatch, { mutex: '3', path: 'a/d/e' });

        check(nav, ['a/d/e', 'f', 'a/d/e'], '3');

        nav.replace(dispatch, '2', { mutex: '4', path: 'a/g/e' });

        check(nav, ['a/d/e', 'a/g/e', 'a/d/e'], '4', false);
        checkStore(nav, ['a/d/e', 'f', 'a/d/e'], '3');
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

      it('should close the page if target is specified by index', () => {
        nav.close(dispatch, 1);
        check(nav, ['a/d/e', 'a/d/e', 'f'], '4');
        nav.close(dispatch, 0);
        check(nav, ['a/d/e', 'f'], '4');
        nav.close(dispatch, 0);
        nav.close(dispatch, 2);
        check(nav, ['f'], '4');
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
        nav.open(dispatch, { mutex: '3', path: 'a/d/e' });

        check(nav, ['a/d/e', 'f', 'a/d/e'], '3');
      });

      it('should ignore if the mutex is not open', () => {
        const previousNav = nav;
        nav.transit(dispatch, 'blah');
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
        nav.open(dispatch, { mutex: '3', path: 'a/d/e' });

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
          { mutex: '3', path: 'a/d/e' },
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
          { mutex: '3', path: 'a/d/e' },
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

    it('should call reduce only on active page', () => {
      const newNav = nav.reduce(<any>{ type: 'STUFF!', value: 10 });
      expect(nav.active!.state.value).to.be.equals(1);
      expect(newNav.active!.state.value).to.be.equals(10);
      expect(find(newNav.all, page => page.mutex === '1')!.state.value).to.be.equals(1);
      expect(find(newNav.all, page => page.mutex === '2')!.state.value).to.be.equals(1);
    });

    it('should call reduce on all pages if the action is deisolated', () => {
      const newNav = nav.reduce(deisolate(<any>{ type: 'STUFF!', value: 10 }));
      expect(nav.active!.state.value).to.be.equals(1);
      expect(newNav.active!.state.value).to.be.equals(10);
      expect(find(newNav.all, page => page.mutex === '1')!.state.value).to.be.equals(10);
      expect(find(newNav.all, page => page.mutex === '2')!.state.value).to.be.equals(10);
      expect(find(newNav.all, page => page.mutex === '3')!.state.value).to.be.equals(10);
    });

    it('should absorb actions that target it', () => {
      const action1: any = actions.NAVIGATION_CLOSE_PAGE.create.unicast('ADMIN', '2');
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

    it('should return the current active page\' mutex', () => {
      persist.clear('ADMIN');
      let nav = navigator;
      const dispatch: any = (a: any) => nav = nav.reduce(a);

      nav.open(dispatch, { mutex: '5', path: 'f' });

      expect(nav.activeMutex).to.be.equals('5');
    });

  });

});
