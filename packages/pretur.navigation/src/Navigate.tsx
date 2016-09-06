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
  {navigator}: NagivateProps
): React.ReactElement<NavigatePassedProps<any>> {
  if (!navigator.active) {
    return null as any;
  }
  const Component
    = navigator.active.descriptor.component as React.ComponentClass<NavigatePassedProps<any>>;
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
