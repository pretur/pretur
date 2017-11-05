import { PageOccurrence } from './pages';
const ls = require('local-storage');

export function save(prefix: string, data: PageOccurrence[]) {
  ls.set(`${prefix}_NAVIGATION_PAGES`, data);
}

export function load(prefix: string): PageOccurrence[] {
  return ls.get(`${prefix}_NAVIGATION_PAGES`) || [];
}

export function saveActivePage(prefix: string, mutex: string | undefined) {
  if (typeof mutex === 'string') {
    ls.set(`${prefix}_NAVIGATION_ACTIVE_PAGE`, mutex);
  } else {
    ls.remove(`${prefix}_NAVIGATION_ACTIVE_PAGE`);
  }
}

export function loadActivePage(prefix: string): string | undefined {
  return ls.get(`${prefix}_NAVIGATION_ACTIVE_PAGE`) || undefined;
}

export function clear(prefix: string) {
  ls.remove(`${prefix}_NAVIGATION_PAGES`);
  ls.remove(`${prefix}_NAVIGATION_ACTIVE_PAGE`);
}
