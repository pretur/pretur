export interface I18nFormatter {
  (bundle: I18nBundle): string;
  <K extends string>(key: string): I18nStringBuilder<K, any>;
}

export interface I18nBundle {
  key: string;
  data?: any;
}

export interface I18nStringBuilder<K extends string, D> {
  (data?: D): string;
  key: K;
  path: string;
}

export interface Language {
  [key: string]: I18nStringBuilder<string, any>;
}

export function format(
  language: Language,
  fallback: Language | null,
  bundle: I18nBundle
): string;
export function format(
  language: Language,
  fallback: Language | null,
  key: string
): I18nStringBuilder<string, any>;
export function format(
  language: Language,
  fallback: Language | null,
  bundleOrKey: string | I18nBundle
): any {
  if (process.env.NODE_ENV !== 'production' && !language) {
    throw new TypeError('language must be provided');
  }

  if (bundleOrKey === null) {
    return null;
  }

  if (typeof bundleOrKey === 'object') {
    const targetKey = language[bundleOrKey.key] || (fallback && fallback[bundleOrKey.key]);
    if (process.env.NODE_ENV !== 'production' && !targetKey) {
      throw new TypeError('provided bundle key does not exist in lanugage or the fallback');
    }
    return targetKey(bundleOrKey.data);
  }

  if (typeof bundleOrKey === 'string') {
    const targetKey = language[bundleOrKey] || (fallback && fallback[bundleOrKey]);
    if (process.env.NODE_ENV !== 'production' && !targetKey) {
      throw new TypeError('provided key does not exist in lanugage or the fallback');
    }
    return targetKey;
  }

  if (process.env.NODE_ENV !== 'production') {
    throw new TypeError('key or bundle object expected');
  }
}

export function buildFormatter<F extends I18nFormatter>(
  language: Language,
  fallback: Language | null = null
): F {
  return <F>((bundle: I18nBundle) => format(language, fallback, bundle));
}

export interface MessageFormatParameters {
  [param: string]: any;
}

export interface Compiler {
  constant(str: string): I18nStringBuilder<string, void>;
  callback<D>(callback: (data?: D) => string): I18nStringBuilder<string, D>;
  messageFormat<D extends MessageFormatParameters>(
    formatString: string
  ): I18nStringBuilder<string, D>;
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
      const build = <I18nStringBuilder<string, any>>(() => str);
      return build;
    },
    callback(cb: (data?: any) => string) {
      const build = <I18nStringBuilder<string, any>>(d => cb(d));
      return build;
    },
    messageFormat(formatString: string) {
      const formatter = mf.compile(formatString);
      const build = <I18nStringBuilder<string, any>>((d) => formatter(d));
      return build;
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
  Object.keys(tree).forEach(key => {
    const processedKey = buildKey(prefix, key);
    const processedPath = buildPath(path, key);
    if (typeof tree[key] === 'function') {
      const stringBuilder = tree[key] as I18nStringBuilder<string, any>;
      stringBuilder.key = processedKey;
      stringBuilder.path = processedPath;
      language[processedKey] = stringBuilder;
    } else if (tree[key] && typeof tree[key] === 'object') {
      processDescriptor(tree[key], language, processedKey, processedPath);
    }
  });
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
  ...otherLanguageDescriptors: LanguageDescriptor<any>[]
): Internationalizer<T> {
  const languages: LanguageMap = {};

  const mainLanguage: Language = {};
  processDescriptor(mainLanguageDescriptor.tree, mainLanguage);
  languages[mainLanguageDescriptor.locale] = mainLanguage;

  otherLanguageDescriptors.forEach(languageDescriptor => {
    const lang: Language = {};
    processDescriptor(languageDescriptor.tree, lang);
    languages[languageDescriptor.locale] = lang;
  });

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
