export interface Bundle<K extends string = string, D = any> {
  key: K;
  data?: D;
}

export interface StringBuilder<D = any> {
  (data?: D): string;
}

export interface StringBuilders {
  constant(str: string): StringBuilder<undefined>;
  callback<D>(callback: (data?: D) => string): StringBuilder<D>;
  messageFormat<D>(formatString: string): StringBuilder<D>;
}

export type Definition<T> = {
  [P in keyof T]: StringBuilder<T[P]>;
};

export interface Locale<T> {
  locale: string;
  definition: (builders: StringBuilders) => Definition<T>;
}

export function buildLocale<T>(
  locale: string,
  definition: (stringBuilders: StringBuilders) => Definition<T>,
): Locale<T> {
  return { locale, definition };
}

export type Keys<T> = {
  [P in keyof T]: P;
};

export interface Bundler<T> {
  <K extends keyof T>(key: K, data?: T[K]): Bundle<K, T[K]>;
}

export interface Formatter<T> {
  <K extends keyof T>(key: K, data?: T[K]): string;
  <K extends keyof T>(bundle: Bundle<K, T[K]>): string;
}

export interface Internationalization<T> {
  keys: Keys<T>;
  bundle: Bundler<T>;
  buildFormatter(locale: string): Formatter<T>;
}

function createStringBuilders(locale: string): StringBuilders {
  const MessageFormat = require('messageformat');
  const mf = new MessageFormat(locale);

  return {
    constant(str: string) {
      return () => str;
    },
    callback(cb: (data?: any) => string) {
      return cb;
    },
    messageFormat(formatString: string) {
      return mf.compile(formatString);
    },
  };
}

function format<T>(
  definition: Definition<T>,
  fallback: Definition<T> | undefined,
  bundleOrKey: Bundle | string,
  data?: any,
): string {
  if (process.env.NODE_ENV !== 'production' && !definition) {
    throw new TypeError('definition must be provided');
  }

  if (bundleOrKey && typeof bundleOrKey === 'object') {
    const targetKey = definition[bundleOrKey.key] || (fallback && fallback[bundleOrKey.key]);
    if (process.env.NODE_ENV !== 'production' && !targetKey) {
      throw new TypeError('provided bundle key does not exist in definition or the fallback');
    }
    return targetKey(bundleOrKey.data);
  }

  if (typeof bundleOrKey === 'string') {
    const targetKey = definition[bundleOrKey] || (fallback && fallback[bundleOrKey]);
    if (process.env.NODE_ENV !== 'production' && !targetKey) {
      throw new TypeError('provided key does not exist in definition or the fallback');
    }
    return targetKey(data);
  }

  return '';
}

export function internationalize<T>(
  main: Locale<T>,
  ...alts: Locale<Partial<T>>[],
): Internationalization<T> {
  const mainDefinition = main.definition(createStringBuilders(main.locale));

  const keys = <Keys<T>>{};

  for (const key of Object.keys(mainDefinition)) {
    keys[key] = key;
  }

  function bundle<K extends keyof T>(key: K, data?: T[K]) {
    return { key, data };
  }

  function buildFormatter(locale: string): Formatter<T> {
    if (locale === main.locale) {
      return (bundleOrKey: Bundle | string, data?: any) =>
        format(mainDefinition, undefined, bundleOrKey, data);
    }

    const target = alts.find(alt => alt.locale === locale);

    if (!target) {
      throw new Error(`The provided locale ${locale} does not exist in the list of languages.`);
    }

    const targetDefinition = target.definition(createStringBuilders(locale));

    return (bundleOrKey: Bundle | string, data?: any) =>
      format(targetDefinition, mainDefinition, bundleOrKey, data);
  }

  return { keys, bundle, buildFormatter };
}
