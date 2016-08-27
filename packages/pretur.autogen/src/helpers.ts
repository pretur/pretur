import { basename as pathBasename, dirname as pathDirname } from 'path';
import { uniq, uniqBy, get } from 'lodash';
const inflection = require('inflection');
const Handlebars = require('handlebars');

export interface SafeString {
  new (str: string): SafeString;
}

export function safe(str: string): SafeString {
  return new Handlebars.SafeString(String(str));
}

export function toLower(str: string): SafeString {
  return safe((String(str)).toLowerCase());
}

export function toUpper(str: string): SafeString {
  return safe((String(str)).toUpperCase());
}

export function camel(str: string): SafeString {
  return safe(inflection.camelize(String(str), true));
}

export function pascal(str: string): SafeString {
  return safe(inflection.camelize(String(str), false));
}

export function underscore(str: string): SafeString {
  return safe(inflection.underscore(String(str), true));
}

export function plural(str: string): SafeString {
  return safe(inflection.pluralize(String(str)));
}

export function singular(str: string): SafeString {
  return safe(inflection.singularize(String(str)));
}

export function basename(str: string): SafeString {
  return safe(pathBasename(String(str)));
}

export function dirname(str: string): SafeString {
  return safe(pathDirname(String(str)));
}

export function literal(value: any): SafeString {
  if (value instanceof Handlebars.SafeString) {
    value = value.toString();
  }

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
