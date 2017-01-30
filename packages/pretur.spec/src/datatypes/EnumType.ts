import AbstractType from './AbstractType';

export interface EnumValue<TKey extends string> {
  name: TKey;
  i18nKey: string;
}

export default class EnumType<TKey extends string> extends AbstractType {
  public readonly name: string;
  public readonly values: EnumValue<TKey>[];

  public static is(obj: AbstractType): obj is EnumType<string> {
    return obj instanceof EnumType;
  }

  public static create<TKey extends string>(
    name: string,
    values: ([TKey, string] | EnumValue<TKey>)[],
  ): EnumType<TKey> {
    return new EnumType<TKey>(name, values);
  }

  constructor(enumName: string, values: ([TKey, string] | EnumValue<TKey>)[]) {
    super();
    this.name = enumName;
    this.values = values
      .map(value => Array.isArray(value) ? ({ i18nKey: value[1], name: value[0] }) : value)
      .filter(Boolean);

    if (process.env.NODE_ENV !== 'production') {
      if (this.values.length === 0) {
        throw new Error(`enum ${enumName} contains no value.`);
      }

      for (const { name } of this.values) {
        if (typeof name !== 'string') {
          throw new Error(`enum ${name} has a value with no name.`);
        }

        if (this.values.filter(p => p.name === name).length > 1) {
          throw new Error(`enum ${name} has duplicate value names of ${name}.`);
        }
      }
    }

  }
}
