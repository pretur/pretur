import { createTargetedActionDescriptor, TargetedActionDescriptor } from 'pretur.redux';
import { PageReplaceOptions, PageOpenOptions, PageCloseOptions } from './navigator';

export const NAVIGATION_TRANSIT_TO_PAGE: TargetedActionDescriptor<string>
  = createTargetedActionDescriptor<string>('NAVIGATION_TRANSIT_TO_PAGE');

export const NAVIGATION_OPEN_PAGE: TargetedActionDescriptor<PageOpenOptions>
  = createTargetedActionDescriptor<PageOpenOptions>('NAVIGATION_OPEN_PAGE');

export const NAVIGATION_REPLACE_PAGE: TargetedActionDescriptor<PageReplaceOptions>
  = createTargetedActionDescriptor<PageReplaceOptions>('NAVIGATION_REPLACE_PAGE');

export const NAVIGATION_CLOSE_PAGE: TargetedActionDescriptor<PageCloseOptions>
  = createTargetedActionDescriptor<PageCloseOptions>('NAVIGATION_CLOSE_PAGE');

export const NAVIGATION_LOAD_PAGES: TargetedActionDescriptor
  = createTargetedActionDescriptor('NAVIGATION_LOAD_PAGES');

export const NAVIGATION_CLEAR_PAGES: TargetedActionDescriptor
  = createTargetedActionDescriptor('NAVIGATION_CLEAR_PAGES');
