import AbstractType from './AbstractType';

export interface EnumValue<TKey extends string> {
  name: TKey;
  i18nKey: string;
}

export default class EnumType<TKey extends string> extends AbstractType {
  public name: string;
  public values: EnumValue<TKey>[];
  private _typename: string;

  public get typeName(): string {
    return this._typename;
  }

  public static is(obj: any): obj is EnumType<string> {
    return obj instanceof EnumType;
  }

  public static create<TKey extends string>(
    name: string,
    values: Array<[TKey, string] | EnumValue<TKey>>,
    typeName?: string
  ): EnumType<TKey> {
    return new EnumType<TKey>(name, values, typeName);
  }

  private constructor(
    name: string,
    values: Array<[TKey, string] | EnumValue<TKey>>,
    typeName = 'string'
  ) {
    super();

    this.name = name;
    this._typename = typeName;

    this.values = values
      .map(value => Array.isArray(value) ? ({ name: value[0], i18nKey: value[1] }) : value)
      .filter(v => v);

    if (process.env.NODE_ENV !== 'production') {
      if (this.values.length === 0) {
        throw new Error(`enum ${name} contains no value.`);
      }

      this.values.forEach(pair => {
        if (typeof pair.name !== 'string') {
          throw new Error(`enum ${name} has a value with no name.`);
        }

        if (this.values.filter(p => p.name === pair.name).length > 1) {
          throw new Error(`enum ${name} has duplicate value names of ${pair.name}.`);
        }
      });
    }

  }
}
