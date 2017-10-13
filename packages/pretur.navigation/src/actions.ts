import { createActionDescriptor, TargetedActionDescriptor } from 'pretur.redux';
import { PageReplaceOptions, PageOpenOptions, PageCloseOptions } from './navigator';

export const NAVIGATION_TRANSIT_TO_PAGE: TargetedActionDescriptor<string>
  = createActionDescriptor<string>('NAVIGATION_TRANSIT_TO_PAGE');

export const NAVIGATION_OPEN_PAGE: TargetedActionDescriptor<PageOpenOptions>
  = createActionDescriptor<PageOpenOptions>('NAVIGATION_OPEN_PAGE');

export const NAVIGATION_REPLACE_PAGE: TargetedActionDescriptor<PageReplaceOptions>
  = createActionDescriptor<PageReplaceOptions>('NAVIGATION_REPLACE_PAGE');

export const NAVIGATION_CLOSE_PAGE: TargetedActionDescriptor<PageCloseOptions>
  = createActionDescriptor<PageCloseOptions>('NAVIGATION_CLOSE_PAGE');

export const NAVIGATION_LOAD_PAGES: TargetedActionDescriptor
  = createActionDescriptor('NAVIGATION_LOAD_PAGES');

export const NAVIGATION_CLEAR_PAGES: TargetedActionDescriptor
  = createActionDescriptor('NAVIGATION_CLEAR_PAGES');
