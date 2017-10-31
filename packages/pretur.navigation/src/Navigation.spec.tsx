/// <reference types="mocha" />

// tslint:disable:no-invalid-this
import { expect } from 'chai';
import * as React from 'react';
import { buildNode, NodeStateType } from 'reducible-node';
import { createRenderer } from 'react-addons-test-utils';
import { Pages, Page, buildPage, folder } from './pages';
import { Navigator } from './navigator';
import { Navigation, NavigationPassedProps } from './Navigation';

const node = buildNode(() => ({
  stuff: {
    value: 3,
    reduce({ value }: any) {
      if (value) {
        return { value, reduce: this.reduce };
      }
      return this;
    },
  },
}));

interface Params {
  param1: number;
}

type Props = NavigationPassedProps<NodeStateType<typeof node>, Params>;

const component: React.StatelessComponent<Props> = props => {
  return <input type="number" value={String(props.state)} />;
};

const tree = {
  'a': folder('A', {
    'd': folder('D', {
      'e': buildPage(component, node, { title: 'E' }),
    }),
  }),
};

const navigator = new Navigator(new Pages(tree));

describe('NavPage', () => {

  it('should render nothing when no page is open', () => {
    const renderer = createRenderer();
    renderer.render(<Navigation navigator={navigator} />);
    expect(renderer.getRenderOutput()).to.be.null;
  });

  it('should render the active page and pass down the expecetd props', () => {
    let nav = navigator;
    const dispatch: any = (a: any) => nav = nav.reduce(a);

    nav.open(dispatch, { mutex: '1', path: 'a/d/e', openedFrom: '3', params: { param1: 1 } });

    const renderer = createRenderer();
    renderer.render(<Navigation navigator={nav} />);
    const output = renderer.getRenderOutput<React.ReactElement<Props>>();

    expect(output.type).to.be.equals(component);
    expect(output.props.mutex).to.be.equals('1');
    expect(output.props.parent).to.be.undefined;
    expect(output.props.path).to.be.equals('a/d/e');
    expect(output.props.openedFrom).to.be.equals('3');
    expect(output.props.state.stuff.value).to.be.equals(3);
    expect(output.props.title).to.be.equals('E');
    expect(output.props.params.param1).to.be.equals(1);
    expect(output.props.navigator).to.be.equals(nav);
  });

  it('should render the page identified by mutex and pass down the expecetd props', () => {
    let nav = navigator;
    const dispatch: any = (a: any) => nav = nav.reduce(a);

    nav.open(dispatch, { mutex: '1', path: 'a/d/e', parent: '2', params: { param1: 1 } });

    const renderer = createRenderer();
    renderer.render(<Navigation navigator={nav} mutex="1" />);
    const output = renderer.getRenderOutput<React.ReactElement<Props>>();

    expect(output.type).to.be.equals(component);
    expect(output.props.mutex).to.be.equals('1');
    expect(output.props.parent).to.be.equals('2');
    expect(output.props.path).to.be.equals('a/d/e');
    expect(output.props.state.stuff.value).to.be.equals(3);
    expect(output.props.title).to.be.equals('E');
    expect(output.props.params.param1).to.be.equals(1);
    expect(output.props.navigator).to.be.equals(nav);
  });

});
