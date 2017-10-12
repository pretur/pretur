import * as React from 'react';
import { Bundle } from 'pretur.i18n';
import { Navigator } from './navigator';

export interface NavPagePassedProps<TState> {
  mutex: string;
  parent: string | undefined;
  path: string;
  openedFrom: string | undefined;
  state: TState;
  title: Bundle;
  navigator: Navigator;
}

export interface NavPageProps {
  navigator: Navigator;
  mutex?: string;
}

export function NavPage(
  { navigator, mutex }: NavPageProps,
): React.ReactElement<NavPagePassedProps<any>> {
  const page = navigator.pageFromMutex(mutex) || navigator.active;
  if (!page) {
    // tslint:disable-next-line:no-null-keyword
    return null!;
  }
  const Component = page.descriptor.component;
  return (
    <Component
      mutex={page.mutex}
      parent={page.parent}
      path={page.path}
      openedFrom={page.openedFrom}
      state={page.state}
      title={page.title}
      navigator={navigator}
    />
  )!;
}
