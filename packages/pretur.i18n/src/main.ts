export interface I18nBundle<K extends string = string, D extends object = any> {
  key: K;
  data?: D;
}

export interface I18nFormatter {
  <B extends I18nBundle = I18nBundle>(bundle: B): string;
  <K extends string = string, D extends object | undefined = undefined>(
    key: K,
  ): I18nStringBuilder<K, D>;
}

export interface I18nStringBuilder<K extends string = string, D extends object | undefined = any> {
  (data?: D): string;
  datatype?: D;
  key: K;
  path: string;
}

export interface Language {
  [key: string]: I18nStringBuilder;
}

export function format<B extends I18nBundle = I18nBundle>(
  language: Language,
  fallback: Language | undefined,
  bundle: B,
): string;
export function format(
  language: Language,
  fallback: Language | undefined,
  key: string,
): I18nStringBuilder;
export function format(
  language: Language,
  fallback: Language | undefined,
  nothing: undefined,
): undefined;
export function format<B extends I18nBundle = I18nBundle>(
  language: Language,
  fallback: Language | undefined,
  bundleOrKeyOrNothing: B | string | undefined,
): string | I18nStringBuilder<string, any> | undefined {
  if (process.env.NODE_ENV !== 'production' && !language) {
    throw new TypeError('language must be provided');
  }

  if (typeof bundleOrKeyOrNothing === 'object') {
    const targetKey
      = language[bundleOrKeyOrNothing.key] || (fallback && fallback[bundleOrKeyOrNothing.key]);
    if (process.env.NODE_ENV !== 'production' && !targetKey) {
      throw new TypeError('provided bundle key does not exist in lanugage or the fallback');
    }
    return targetKey(bundleOrKeyOrNothing.data);
  }

  if (typeof bundleOrKeyOrNothing === 'string') {
    const targetKey
      = language[bundleOrKeyOrNothing] || (fallback && fallback[bundleOrKeyOrNothing]);
    if (process.env.NODE_ENV !== 'production' && !targetKey) {
      throw new TypeError('provided key does not exist in lanugage or the fallback');
    }
    return targetKey;
  }

  return;
}

export function buildFormatter<F = I18nFormatter>(
  language: Language,
  fallback: Language | undefined = undefined,
): F {
  return <any>((input: any) => format(language, fallback, input));
}

export interface Compiler {
  constant(str: string): I18nStringBuilder<string, undefined>;
  callback<D>(callback: (data?: D) => string): I18nStringBuilder<string, D>;
  messageFormat<D extends object>(formatString: string): I18nStringBuilder<string, D>;
  describe<T>(tree: T): LanguageDescriptor<T>;
}

export interface LanguageDescriptor<T> {
  locale: string;
  tree: T;
}

export function buildCompiler(locale: string): Compiler {
  const MessageFormat = require('messageformat');
  const mf = new MessageFormat(locale);

  return {
    constant(str) {
      return <I18nStringBuilder<string, any>>(() => str);
    },
    callback(cb: (data?: any) => string) {
      return <I18nStringBuilder<string, any>>(d => cb(d));
    },
    messageFormat(formatString: string) {
      const formatter = mf.compile(formatString);
      return <I18nStringBuilder<string, any>>((d) => formatter(d));
    },
    describe(tree: any) {
      return {
        locale,
        tree,
      };
    },
  };
}

function buildKey(prefix: string | undefined, key: string) {
  return `${prefix || ''}${prefix ? '_' : ''}${key.toUpperCase()}`;
}

function buildPath(prefix: string | undefined, key: string) {
  return `${prefix || ''}${prefix ? '.' : ''}${key}`;
}

function processDescriptor(tree: any, language: Language, prefix?: string, path?: string): void {
  for (const key of Object.keys(tree)) {
    const processedKey = buildKey(prefix, key);
    const processedPath = buildPath(path, key);
    if (typeof tree[key] === 'function') {
      const stringBuilder = <I18nStringBuilder<string, any>>tree[key];
      stringBuilder.key = processedKey;
      stringBuilder.path = processedPath;
      language[processedKey] = stringBuilder;
    } else if (tree[key] && typeof tree[key] === 'object') {
      processDescriptor(tree[key], language, processedKey, processedPath);
    }
  }
}

export interface LanguageMap {
  [locale: string]: Language;
}

export interface Internationalizer<T> {
  mainTree: T;
  mainLocale: string;
  languages: LanguageMap;
  buildFormatter: <F extends I18nFormatter>(locale: string) => F;
}

export function internationalize<T>(
  mainLanguageDescriptor: LanguageDescriptor<T>,
  ...otherLanguageDescriptors: LanguageDescriptor<any>[],
): Internationalizer<T> {
  const languages: LanguageMap = {};

  const mainLanguage: Language = {};
  processDescriptor(mainLanguageDescriptor.tree, mainLanguage);
  languages[mainLanguageDescriptor.locale] = mainLanguage;

  for (const languageDescriptor of otherLanguageDescriptors) {
    const lang: Language = {};
    processDescriptor(languageDescriptor.tree, lang);
    languages[languageDescriptor.locale] = lang;
  }

  const mainLocale = mainLanguageDescriptor.locale;

  return {
    languages,
    mainLocale,
    mainTree: mainLanguageDescriptor.tree,
    buildFormatter(locale: string) {
      if (locale === mainLocale) {
        return buildFormatter(mainLanguage);
      }

      if (process.env.NODE_ENV !== 'production' && !languages[locale]) {
        throw new Error(`The provided locale ${locale} does not exist in the list of languages.`);
      }

      return buildFormatter(languages[locale], mainLanguage);
    },
  };
}
