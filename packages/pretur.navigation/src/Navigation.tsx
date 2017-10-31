import * as React from 'react';
import { Navigator } from './navigator';
import { Page } from './pages';

export interface NavigationPassedProps<P extends Page> {
  mutex: string;
  parent: string | undefined;
  path: string;
  openedFrom: string | undefined;
  params: P['type']['params'];
  state: P['type']['state'];
  title: string;
  navigator: Navigator;
}

export interface NavigationProps {
  navigator: Navigator;
  mutex?: string;
}

export function Navigation(
  { navigator, mutex }: NavigationProps,
): React.ReactElement<NavigationPassedProps<Page<any, any>>> {
  const page = navigator.pageFromMutex(mutex) || navigator.active;
  if (!page) {
    // tslint:disable-next-line:no-null-keyword
    return null!;
  }
  const Component = page.page.component;

  return (
    <Component
      mutex={page.mutex}
      parent={page.parent}
      path={page.path}
      openedFrom={page.openedFrom}
      state={page.state}
      params={page.params}
      title={page.title}
      navigator={navigator} />
  );
}
