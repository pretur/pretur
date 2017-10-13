import { createHomingAction, TargetedActionDescriptor } from 'pretur.redux';
import { PageReplaceOptions, PageOpenOptions, PageCloseOptions } from './navigator';

export const NAVIGATION_TRANSIT_TO_PAGE: TargetedActionDescriptor<string>
  = createHomingAction<string>('NAVIGATION_TRANSIT_TO_PAGE');

export const NAVIGATION_OPEN_PAGE: TargetedActionDescriptor<PageOpenOptions>
  = createHomingAction<PageOpenOptions>('NAVIGATION_OPEN_PAGE');

export const NAVIGATION_REPLACE_PAGE: TargetedActionDescriptor<PageReplaceOptions>
  = createHomingAction<PageReplaceOptions>('NAVIGATION_REPLACE_PAGE');

export const NAVIGATION_CLOSE_PAGE: TargetedActionDescriptor<PageCloseOptions>
  = createHomingAction<PageCloseOptions>('NAVIGATION_CLOSE_PAGE');

export const NAVIGATION_LOAD_PAGES: TargetedActionDescriptor
  = createHomingAction('NAVIGATION_LOAD_PAGES');

export const NAVIGATION_CLEAR_PAGES: TargetedActionDescriptor
  = createHomingAction('NAVIGATION_CLEAR_PAGES');
