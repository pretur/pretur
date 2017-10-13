import { createHomingAction, HomingActionDefinition } from 'pretur.redux';
import { PageReplaceOptions, PageOpenOptions, PageCloseOptions } from './navigator';

export const NAVIGATION_TRANSIT_TO_PAGE: HomingActionDefinition<string>
  = createHomingAction<string>('NAVIGATION_TRANSIT_TO_PAGE');

export const NAVIGATION_OPEN_PAGE: HomingActionDefinition<PageOpenOptions>
  = createHomingAction<PageOpenOptions>('NAVIGATION_OPEN_PAGE');

export const NAVIGATION_REPLACE_PAGE: HomingActionDefinition<PageReplaceOptions>
  = createHomingAction<PageReplaceOptions>('NAVIGATION_REPLACE_PAGE');

export const NAVIGATION_CLOSE_PAGE: HomingActionDefinition<PageCloseOptions>
  = createHomingAction<PageCloseOptions>('NAVIGATION_CLOSE_PAGE');

export const NAVIGATION_LOAD_PAGES: HomingActionDefinition
  = createHomingAction('NAVIGATION_LOAD_PAGES');

export const NAVIGATION_CLEAR_PAGES: HomingActionDefinition
  = createHomingAction('NAVIGATION_CLEAR_PAGES');
