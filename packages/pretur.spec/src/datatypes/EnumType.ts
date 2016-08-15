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

    const filteredValues = values.filter(Array.isArray);

    if (process.env.NODE_ENV !== 'production') {
      if (filteredValues.length === 0) {
        throw new Error(`enum ${name} contains no value.`);
      }
    }

    this.values = filteredValues
      .map(value => Array.isArray(value) ? ({ name: value[0], i18nKey: value[1] }) : value);
  }
}
