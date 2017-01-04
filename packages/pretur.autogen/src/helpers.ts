import { basename as pathBasename, dirname as pathDirname } from 'path';
import { uniq, uniqBy, get } from 'lodash';
import { SafeString } from 'handlebars';
import { camelize, pluralize, singularize, underscore as inflectionUnderscore } from 'inflection';

export function safe(str: string) {
  return new SafeString(String(str));
}

export function toLower(str: string) {
  return safe((String(str)).toLowerCase());
}

export function toUpper(str: string) {
  return safe((String(str)).toUpperCase());
}

export function camel(str: string) {
  return safe(camelize(String(str), true));
}

export function pascal(str: string) {
  return safe(camelize(String(str), false));
}

export function underscore(str: string) {
  return safe(inflectionUnderscore(String(str), true));
}

export function plural(str: string) {
  return safe(pluralize(String(str)));
}

export function singular(str: string) {
  return safe(singularize(String(str)));
}

export function basename(str: string) {
  return safe(pathBasename(String(str)));
}

export function dirname(str: string) {
  return safe(pathDirname(String(str)));
}

export function literal(value: any) {
  if (value instanceof SafeString) {
    value = value.toString();
  }

  // tslint:disable-next-line:no-null-keyword
  if (value === null) {
    return safe('null');
  }

  switch (typeof value) {
    case 'string':
      return safe(`'${value}'`);
    case 'symbol':
      return safe(`Symbol()`);
    case 'boolean':
    case 'number':
      return safe(String(value));
    case 'function':
      return safe(`(${value.toString()})`);
    case 'object':
      return safe(JSON.stringify(value));
    case 'undefined':
      return safe('undefined');
  }
  return safe('');
}

export function dedup(array: any[], path?: string): any[] {
  if (!path) {
    return uniq(array);
  }
  return uniqBy(array, path);
}

export function concat(...arrays: any[][]): any[] {
  return (<any[]>[]).concat(...arrays.filter(array => Array.isArray(array)));
}

export function filter(array: any[], path: string): any[] {
  return Array.isArray(array)
    ? array.filter(item => get(item, path))
    : [];
}
