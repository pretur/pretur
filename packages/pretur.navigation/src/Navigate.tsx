import * as React from 'react';
import { I18nBundle } from 'pretur.i18n';

import { Navigator } from './navigator';

export interface NavigatePassedProps<TState> {
  mutex: string;
  path: string;
  state: TState;
  title: I18nBundle;
  navigator: Navigator;
}

export interface NagivateProps {
  navigator: Navigator;
}

export function Navigate(
  {navigator}: NagivateProps,
): React.ReactElement<NavigatePassedProps<any>> | null {
  if (!navigator.active) {
    // tslint:disable-next-line:no-null-keyword
    return null;
  }
  const Component = navigator.active.descriptor.component;
  return (
    <Component
      mutex={navigator.active.mutex}
      path={navigator.active.path}
      state={navigator.active.state}
      title={navigator.active.title}
      navigator={navigator}
    />
  );
}
