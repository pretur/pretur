import { PageOccurrence } from './pages';
const ls = require('local-storage');

export function save(data: PageOccurrence[]) {
  ls.set(`__NAVIGATION_PAGES__`, data);
}

export function load(): PageOccurrence[] {
  return ls.get(`__NAVIGATION_PAGES__`) || [];
}

export function saveActivePage(mutex: string | undefined) {
  if (typeof mutex === 'string') {
    ls.set(`__NAVIGATION_ACTIVE_PAGE__`, mutex);
  } else {
    ls.remove(`__NAVIGATION_ACTIVE_PAGE__`);
  }
}

export function loadActivePage(): string | undefined {
  return ls.get(`__NAVIGATION_ACTIVE_PAGE__`) || undefined;
}

export function clear() {
  ls.remove(`__NAVIGATION_PAGES__`);
  ls.remove(`__NAVIGATION_ACTIVE_PAGE__`);
}
