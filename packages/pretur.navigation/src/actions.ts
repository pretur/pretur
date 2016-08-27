import { createTargetedActionDescriptor, TargetedActionDescriptor } from 'pretur.redux';
import { PageInstantiationData } from './pages';

export const NAVIGATION_OPEN_PAGE: TargetedActionDescriptor<PageInstantiationData<any>, void>
  = createTargetedActionDescriptor<PageInstantiationData<any>, void>('NAVIGATION_OPEN_PAGE');

export const NAVIGATION_TRANSIT_TO_PAGE: TargetedActionDescriptor<string | null, void>
  = createTargetedActionDescriptor<string | null, void>('NAVIGATION_TRANSIT_TO_PAGE');

export const NAVIGATION_CLOSE_PAGE: TargetedActionDescriptor<string, void>
  = createTargetedActionDescriptor<string, void>('NAVIGATION_CLOSE_PAGE');

export const NAVIGATION_LOAD_PAGES: TargetedActionDescriptor<void, void>
  = createTargetedActionDescriptor<void, void>('NAVIGATION_LOAD_PAGES');

export const NAVIGATION_CLEAR_PAGES: TargetedActionDescriptor<void, void>
  = createTargetedActionDescriptor<void, void>('NAVIGATION_CLEAR_PAGES');
