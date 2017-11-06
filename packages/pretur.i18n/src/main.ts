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
    const targetKey = (<any>definition)[bundleOrKey.key] ||
      (fallback && (<any>fallback)[bundleOrKey.key]);

    if (process.env.NODE_ENV !== 'production' && !targetKey) {
      throw new TypeError('provided bundle key does not exist in definition or the fallback');
    }
    return targetKey(bundleOrKey.data);
  }

  if (typeof bundleOrKey === 'string') {
    const targetKey = (<any>definition)[bundleOrKey] ||
      (fallback && (<any>fallback)[bundleOrKey]);

    if (process.env.NODE_ENV !== 'production' && !targetKey) {
      throw new TypeError('provided key does not exist in definition or the fallback');
    }
    return targetKey(data);
  }

  return '';
}

function bundle(key: any, data?: any) {
  return { key, data };
}

export interface Internationalization<T> {
  keys: Keys<T>;
  bundle: Bundler<T>;
  buildFormatter(locale: string): Formatter<T>;
}

export function internationalize<T>(
  main: Locale<T>,
  ...alts: Locale<Partial<T>>[],
): Internationalization<T> {
  const mainDefinition = main.definition(createStringBuilders(main.locale));

  const keys = <Keys<T>>{};

  for (const key of Object.keys(mainDefinition)) {
    (<any>keys)[key] = key;
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

export function combine<T1, T2>(
  i18n1: Internationalization<T1>,
  i18n2: Internationalization<T2>,
): Internationalization<T1 & T2> {
  const keys = { ...(<any>i18n1.keys), ...(<any>i18n2.keys) };

  function buildFormatter(locale: string): Formatter<T1 & T2> {
    const formatter1 = i18n1.buildFormatter(locale);
    const formatter2 = i18n2.buildFormatter(locale);

    return (bundleOrKey: Bundle | string, data?: any) => {
      const key = typeof bundleOrKey === 'string' ? bundleOrKey : bundleOrKey.key;
      if (process.env.NODE_ENV !== 'production' && !keys[key]) {
        throw new TypeError('provided key does not exist in any of the provided i18ns');
      }

      if ((<any>i18n2.keys)[key]) {
        return formatter2(<any>bundleOrKey, data);
      }

      return formatter1(<any>bundleOrKey, data);
    };
  }

  return { keys, bundle, buildFormatter };
}
