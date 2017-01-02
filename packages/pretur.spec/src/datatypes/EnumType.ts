import AbstractType from './AbstractType';

export interface EnumValue<TKey extends string> {
  name: TKey;
  i18nKey: string;
}

export default class EnumType<TKey extends string> extends AbstractType {
  private _name: string;
  private _values: EnumValue<TKey>[];
  private _typeName: string;

  public static is(obj: any): obj is EnumType<string> {
    return obj instanceof EnumType;
  }

  public static create<TKey extends string>(
    name: string,
    values: ([TKey, string] | EnumValue<TKey>)[],
    typeName?: string,
  ): EnumType<TKey> {
    return new EnumType<TKey>(name, values, typeName);
  }

  public get name(): string {
    return this._name;
  }

  public get values(): EnumValue<TKey>[] {
    return this._values;
  }

  public get typeName(): string {
    return this._typeName;
  }

  private constructor(
    name: string,
    values: ([TKey, string] | EnumValue<TKey>)[],
    typeName = 'string',
  ) {
    super();

    this._name = name;
    this._typeName = typeName;

    this._values = values
      .map(value => Array.isArray(value) ? ({ i18nKey: value[1], name: value[0] }) : value)
      .filter(v => v);

    if (process.env.NODE_ENV !== 'production') {
      if (this._values.length === 0) {
        throw new Error(`enum ${name} contains no value.`);
      }

      this._values.forEach(pair => {
        if (typeof pair.name !== 'string') {
          throw new Error(`enum ${name} has a value with no name.`);
        }

        if (this._values.filter(p => p.name === pair.name).length > 1) {
          throw new Error(`enum ${name} has duplicate value names of ${pair.name}.`);
        }
      });
    }

  }
}
