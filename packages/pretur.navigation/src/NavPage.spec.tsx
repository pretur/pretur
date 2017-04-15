/// <reference types="mocha" />

import { expect } from 'chai';
import * as React from 'react';
import { createRenderer } from 'react-addons-test-utils';
import { Pages, PageTreeRoot } from '../src/pages';
import { Navigator } from '../src/navigator';
import { NavPage, NavPagePassedProps } from '../src/NavPage';

const component: React.StatelessComponent<NavPagePassedProps<number>> = props => {
  return <input type="number" value={String(props.state)} />;
};

const reducerBuilder: any = () => (s = 3, { value }: { value: any }) => value ? value : s;

const tree: PageTreeRoot = {
  'a': {
    contents: {
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
    titleKey: 'A',
  },
};

const navigator = new Navigator(new Pages(tree), 'ADMIN');

describe('NavPage', () => {

  it('should render nothing when no page is open', () => {
    const renderer = createRenderer();
    renderer.render(<NavPage navigator={navigator} />);
    expect(renderer.getRenderOutput()).to.be.null;
  });

  it('should render the active page and pass down the expecetd props', () => {
    let nav = navigator;
    const dispatch: any = (a: any) => nav = nav.reduce(a);

    nav.open(dispatch, { mutex: '1', path: 'a/d/e', openedFrom: '3' });

    const renderer = createRenderer();
    renderer.render(<NavPage navigator={nav} />);
    const output = renderer.getRenderOutput<React.ReactElement<NavPagePassedProps<number>>>();

    expect(output.type).to.be.equals(component);
    expect(output.props.mutex).to.be.equals('1');
    expect(output.props.parent).to.be.undefined;
    expect(output.props.path).to.be.equals('a/d/e');
    expect(output.props.openedFrom).to.be.equals('3');
    expect(output.props.state).to.be.equals(3);
    expect(output.props.title.key).to.be.equals('E');
    expect(output.props.navigator).to.be.equals(nav);
  });

  it('should render the page identified by mutex and pass down the expecetd props', () => {
    let nav = navigator;
    const dispatch: any = (a: any) => nav = nav.reduce(a);

    nav.open(dispatch, { mutex: '1', path: 'a/d/e', parent: '2' });

    const renderer = createRenderer();
    renderer.render(<NavPage navigator={nav} mutex="1" />);
    const output = renderer.getRenderOutput<React.ReactElement<NavPagePassedProps<number>>>();

    expect(output.type).to.be.equals(component);
    expect(output.props.mutex).to.be.equals('1');
    expect(output.props.parent).to.be.equals('2');
    expect(output.props.path).to.be.equals('a/d/e');
    expect(output.props.state).to.be.equals(3);
    expect(output.props.title.key).to.be.equals('E');
    expect(output.props.navigator).to.be.equals(nav);
  });

});
