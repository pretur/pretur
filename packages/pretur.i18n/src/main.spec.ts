/// <reference types="mocha" />

import { expect } from 'chai';
import { buildLocale, internationalize, StringBuilders } from './main';

describe('stringBuilders', () => {
  let builders: StringBuilders;

  const locale = buildLocale('en', <any>((b: any) => builders = b));
  internationalize(locale).buildFormatter('en');

  it('should build compiler with valid constant compiler function', () => {
    const formatter = builders.constant('hello');
    expect(formatter()).to.be.equals('hello');
  });

  it('should build compiler with valid callback compiler function', () => {
    const formatter = builders.callback((human: string) => `hello ${human}`);
    expect(formatter('jack')).to.be.equals('hello jack');
  });

  it('should build compiler with valid message-format compiler function', () => {
    const formatter = builders.messageFormat<{ HUMAN: string }>('hello {HUMAN}');
    expect(formatter({ HUMAN: 'jack' })).to.be.equals('hello jack');

    const formatter2 = builders.messageFormat<{ PLACE: number }>(
      'hello {PLACE, selectordinal, other{#th}} human',
    );
    expect(formatter2({ PLACE: 4 })).to.be.equals('hello 4th human');
  });

});

const english = buildLocale('en', ({ constant, callback }) => ({
  A_B_C_DE: constant('hello'),
  C: callback(() => 'bye'),
  D: callback(({ NAME }: { NAME: string }) => NAME),
}));

const french = buildLocale('fr', ({ constant }) => ({
  A_B_C_DE: constant('bonjour'),
}));

const { buildFormatter } = internationalize(english, french);

describe('formatter', () => {

  it('should format the string using the main language', () => {
    const format = buildFormatter('en');
    expect(format('C')).to.be.equals('bye');
  });

  it('should format the string using the alt language', () => {
    const format = buildFormatter('fr');
    expect(format('A_B_C_DE')).to.be.equals('bonjour');
  });

  it('should format the string using the main language with data', () => {
    const format = buildFormatter('en');
    expect(format('D', { NAME: 'AAA' })).to.be.equals('AAA');
  });

  it('should format the string using the fallback language', () => {
    const format = buildFormatter('fr');
    expect(format('C')).to.be.equals('bye');
  });

  it('should format the string using the main language with bundle with data', () => {
    const format = buildFormatter('en');
    expect(format({ key: 'D', data: { NAME: 'AAA' } })).to.be.equals('AAA');
  });

  it('should fail when invalid key is provided in dev', () => {
    const format = buildFormatter('en');
    expect(() => format(<any>'blah')).to.throw();
  });

});
