/// <reference types="mocha" />

import { expect } from 'chai';
import { buildLocale, internationalize, StringBuilders, combine } from './main';

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

const i1 = internationalize(english, french);

describe('formatter', () => {

  it('should format the string using the main language', () => {
    const format = i1.buildFormatter('en');
    expect(format('C')).to.be.equals('bye');
  });

  it('should format the string using the alt language', () => {
    const format = i1.buildFormatter('fr');
    expect(format('A_B_C_DE')).to.be.equals('bonjour');
  });

  it('should format the string using the main language with data', () => {
    const format = i1.buildFormatter('en');
    expect(format('D', { NAME: 'AAA' })).to.be.equals('AAA');
  });

  it('should format the string using the fallback language', () => {
    const format = i1.buildFormatter('fr');
    expect(format('C')).to.be.equals('bye');
  });

  it('should format the string using the main language with bundle with data', () => {
    const format = i1.buildFormatter('en');
    expect(format({ key: 'D', data: { NAME: 'AAA' } })).to.be.equals('AAA');
  });

  it('should fail when invalid key is provided in dev', () => {
    const format = i1.buildFormatter('en');
    expect(() => format(<any>'blah')).to.throw();
  });

});

const english2 = buildLocale('en', ({ constant, callback }) => ({
  A_B_C_DE2: constant('hello2'),
  C2: callback(() => 'bye2'),
  D2: callback(({ NAME }: { NAME: string }) => NAME + '2'),
}));

const french2 = buildLocale('fr', ({ constant }) => ({
  A_B_C_DE2: constant('bonjour2'),
}));

const i2 = internationalize(english2, french2);

const combined = combine(i1, i2);

describe('combine', () => {

  it('should contain all keys for both i18ns', () => {
    expect(combined.keys.A_B_C_DE).to.be.equals('A_B_C_DE');
    expect(combined.keys.A_B_C_DE2).to.be.equals('A_B_C_DE2');
    expect(combined.keys.C).to.be.equals('C');
    expect(combined.keys.C2).to.be.equals('C2');
    expect(combined.keys.D).to.be.equals('D');
    expect(combined.keys.D2).to.be.equals('D2');
  });

  it('should format the string using the main language', () => {
    const format = combined.buildFormatter('en');
    expect(format('C')).to.be.equals('bye');
    expect(format('C2')).to.be.equals('bye2');
  });

  it('should format the string using the alt language', () => {
    const format = combined.buildFormatter('fr');
    expect(format('A_B_C_DE')).to.be.equals('bonjour');
    expect(format('A_B_C_DE2')).to.be.equals('bonjour2');
  });

  it('should format the string using the main language with data', () => {
    const format = combined.buildFormatter('en');
    expect(format('D', { NAME: 'AAA' })).to.be.equals('AAA');
    expect(format('D2', { NAME: 'AAA' })).to.be.equals('AAA2');
  });

  it('should format the string using the fallback language', () => {
    const format = combined.buildFormatter('fr');
    expect(format('C')).to.be.equals('bye');
    expect(format('C2')).to.be.equals('bye2');
  });

  it('should format the string using the main language with bundle with data', () => {
    const format = combined.buildFormatter('en');
    expect(format(combined.bundle('D', { NAME: 'AAA' }))).to.be.equals('AAA');
    expect(format(combined.bundle('D2', { NAME: 'AAA' }))).to.be.equals('AAA2');
  });

  it('should fail when invalid key is provided in dev', () => {
    const format = combined.buildFormatter('en');
    expect(() => format(<any>'blah')).to.throw();
  });

});
