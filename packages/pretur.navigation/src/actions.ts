import { createTargetedActionDescriptor, TargetedActionDescriptor } from 'pretur.redux';
import { PageInstantiationData } from './pages';
import { NavigatorPageReplaceOptions } from './navigator';

export const NAVIGATION_TRANSIT_TO_PAGE: TargetedActionDescriptor<string, void>
  = createTargetedActionDescriptor<string, void>('NAVIGATION_TRANSIT_TO_PAGE');

export const NAVIGATION_OPEN_PAGE: TargetedActionDescriptor<PageInstantiationData<any>, void>
  = createTargetedActionDescriptor<PageInstantiationData<any>, void>('NAVIGATION_OPEN_PAGE');

export const NAVIGATION_REPLACE_PAGE: TargetedActionDescriptor<NavigatorPageReplaceOptions, void>
  = createTargetedActionDescriptor<NavigatorPageReplaceOptions, void>('NAVIGATION_REPLACE_PAGE');

export const NAVIGATION_CLOSE_PAGE: TargetedActionDescriptor<string, void>
  = createTargetedActionDescriptor<string, void>('NAVIGATION_CLOSE_PAGE');

export const NAVIGATION_LOAD_PAGES: TargetedActionDescriptor<void, void>
  = createTargetedActionDescriptor<void, void>('NAVIGATION_LOAD_PAGES');

export const NAVIGATION_CLEAR_PAGES: TargetedActionDescriptor<void, void>
  = createTargetedActionDescriptor<void, void>('NAVIGATION_CLEAR_PAGES');
