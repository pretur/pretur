import { PageInstantiationData } from './pages';
const ls = require('local-storage');

export function save(prefix: string, data: PageInstantiationData<any>[]) {
  ls.set(`${prefix}_PAGES`, data);
}

export function load(prefix: string): PageInstantiationData<any>[] {
  return ls.get(`${prefix}_PAGES`) || [];
}

export function saveActivePage(prefix: string, mutex: string | null) {
  ls.set(`${prefix}_ACTIVE_PAGE`, mutex);
}

export function loadActivePage(prefix: string): string | null {
  return ls.get(`${prefix}_ACTIVE_PAGE`) || null;
}

export function clear(prefix: string) {
  ls.remove(`${prefix}_PAGES`);
  ls.remove(`${prefix}_ACTIVE_PAGE`);
}
