/// <reference types="mocha" />

import { expect } from 'chai';
import {
  I18nFormatter,
  I18nStringBuilder,
  Language,
  buildCompiler,
  buildFormatter,
  format,
  internationalize,
} from './main';

const compiler = buildCompiler('en');

describe('buildCompiler', () => {

  it('should fail with invalid locale', () => {
    expect(() => buildCompiler('blahblah')).to.throw();
  });

  it('should build compiler with valid constant compiler function', () => {
    const staticCompile = buildCompiler('en').constant;
    const formatter = staticCompile('hello');
    expect(formatter()).to.be.equals('hello');
  });

  it('should build compiler with valid callback compiler function', () => {
    const callbackCompile = buildCompiler('en').callback;
    const formatter = callbackCompile((human: string) => `hello ${human}`);
    expect(formatter('jack')).to.be.equals('hello jack');
  });

  it('should build compiler with valid message-format compiler function', () => {
    const messageFormatCompile = buildCompiler('en').messageFormat;
    const formatter = messageFormatCompile<{ HUMAN: string }>('hello {HUMAN}');
    expect(formatter({ HUMAN: 'jack' })).to.be.equals('hello jack');

    const formatter2 = messageFormatCompile<{ PLACE: number }>(
      'hello {PLACE, selectordinal, other{#th}} human',
    );
    expect(formatter2({ PLACE: 4 })).to.be.equals('hello 4th human');
  });

  it('should build compiler with valid describe function', () => {
    const describe = buildCompiler('en').describe;
    expect(describe({}).locale).to.be.equals('en');
    expect(describe({ a: 'blah' }).tree.a).to.be.equals('blah');
  });

});

describe('format', () => {

  it('should format the string using the main language', () => {
    const language = <Language>{ A: compiler.constant('B') };
    const str = format(language, undefined, 'A')();
    expect(str).to.be.equals('B');
  });

  it('should format the string using the main language with data', () => {
    const language = <Language>{ A: compiler.callback((d: { C: string }) => 'B' + d.C) };
    const str = format(language, undefined, 'A')({ C: 'C' });
    expect(str).to.be.equals('BC');
  });

  it('should format the string using the fallback language', () => {
    const language = <Language>{ A: compiler.constant('B') };
    const str = format({}, language, 'A')();
    expect(str).to.be.equals('B');
  });

  it('should format the string using the fallback language with data', () => {
    const language = <Language>{ A: compiler.callback((d: { C: string }) => 'B' + d.C) };
    const str = format({}, language, 'A')({ C: 'C' });
    expect(str).to.be.equals('BC');
  });

  it('should format the string using the main language with bundle with data', () => {
    const language = <Language>{ A: compiler.callback((d: { C: string }) => 'B' + d.C) };
    const str = format({}, language, { data: { C: 'C' }, key: 'A' });
    expect(str).to.be.equals('BC');
  });

  it('should fail if it finds no match', () => {
    expect(() => format({}, {}, 'A')({ C: 'C' })).to.throw();
    expect(() => format({}, undefined, 'A')({ C: 'C' })).to.throw();
  });

  it('should fail if it finds no match with bundle', () => {
    expect(() => format({}, {}, { data: { C: 'C' }, key: 'A' })).to.throw();
    expect(() => format({}, undefined, { data: { C: 'C' }, key: 'A' })).to.throw();
  });

  it('should not fail if bundle is not provided', () => {
    expect(() => format({}, {}, undefined)).not.to.throw();
  });

});

describe('buildFormatter', () => {

  it('should build valid formatter', () => {
    const language = <Language>{ A: compiler.constant('B') };
    const language2 = <Language>{ B: compiler.callback((d: { C: string }) => 'B' + d.C) };

    interface Formatter extends I18nFormatter {
      (key: 'A'): I18nStringBuilder<'A', void>;
      (key: 'B'): I18nStringBuilder<'A', { C: string }>;
    }

    const str = buildFormatter<Formatter>(language, language2);
    expect(str('A')()).to.be.equals('B');
    expect(str('B')({ C: 'C' })).to.be.equals('BC');
  });

});

const englishCompiler = buildCompiler('en');

const english = {
  locale: 'en',
  tree: {
    a: {
      b: {
        c: {
          de: englishCompiler.constant('hello'),
        },
      },
    },
    c: englishCompiler.callback(() => 'bye'),
  },
};

const frenchCompiler = buildCompiler('fr');

const french = {
  locale: 'fr',
  tree: { a: { b: { c: { de: frenchCompiler.constant('bonjour') } } } },
};

describe('internationalize', () => {

  it('should properly process keys', () => {
    const i18n = internationalize(english, french);
    expect(i18n.languages['en']['A_B_C_DE'].key).to.be.equals('A_B_C_DE');
    expect(i18n.languages['en']['C'].key).to.be.equals('C');
  });

  it('should properly process path', () => {
    const i18n = internationalize(english, french);
    expect(i18n.languages['en']['A_B_C_DE'].path).to.be.equals('a.b.c.de');
    expect(i18n.languages['en']['C'].path).to.be.equals('c');
  });

  it('should properly assign the main locale to return object', () => {
    const i18n = internationalize(english, french);
    expect(i18n.mainLocale).to.be.equals('en');
  });

  it('should properly expose the main language\'s tree', () => {
    const i18n = internationalize(english, french);
    expect(i18n.mainTree.a.b.c.de.key).to.be.equals('A_B_C_DE');
  });

  it('should properly build the languages', () => {
    const i18n = internationalize(english, french);
    expect(i18n.languages['en']['A_B_C_DE']).to.be.equals(english.tree.a.b.c.de);
    expect(i18n.languages['en']['C']).to.be.equals(english.tree.c);
    expect(i18n.languages['fr']['A_B_C_DE']).to.be.equals(french.tree.a.b.c.de);
  });

  it('should properly build format builder that works on the main language', () => {
    const i18n = internationalize(english, french);
    expect(i18n.buildFormatter('en')('A_B_C_DE')()).to.be.equals('hello');
  });

  it('should properly build format builder that works on the other provided languages', () => {
    const i18n = internationalize(english, french);
    expect(i18n.buildFormatter('fr')('A_B_C_DE')()).to.be.equals('bonjour');
  });

  it(
    'should properly build format builder that works on ' +
    ' the other provided languages with main as fallback',
    () => {
      const i18n = internationalize(english, french);
      expect(i18n.buildFormatter('fr')('C')()).to.be.equals('bye');
    },
  );

});
