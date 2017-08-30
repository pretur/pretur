import { SpecType } from 'pretur.spec';

export type Primitive = string | number | boolean | Date | null;

export interface RangeObjectType {
  value: Primitive;
  inclusive: boolean;
}

export type RangeType = [Primitive | Primitive] | [RangeObjectType, RangeObjectType];

export interface Operators<F> {
  $gt?: F;
  $gte?: F;
  $lt?: F;
  $lte?: F;
  $ne?: F | null;
  $eq?: F | null;
  $not?: F | null;
  $between?: [F, F];
  $notBetween?: [F, F];
  $in?: F[] | null;
  $notIn?: F[] | null;
  $like?: string | { $any: string[] };
  $notLike?: string | { $any: string[] };
  $iLike?: string | { $any: string[] };
  $notILike?: string | { $any: string[] };
  $regexp?: string;
  $notRegexp?: string;
  $iRegexp?: string;
  $notIRegexp?: string;
  $overlap?: Primitive[] | RangeType[];
  $contains?: Primitive[] | Primitive | RangeType;
  $contained?: Primitive[] | RangeType;
  $any?: Primitive[];
  $adjacent?: RangeType;
  $strictLeft?: RangeType;
  $strictRight?: RangeType;
  $noExtendRight?: RangeType;
  $noExtendLeft?: RangeType;
  $col?: string;
}

export type Nested<F> = {
  [P in keyof F]?: FilterValue<F[P]> | (Nested<F[P]> & Operators<F[P]>);
};

export type FilterValue<F> = F | null | Nested<F> | Operators<F>;

export type FilterFields<T extends SpecType> = {
  [P in keyof T['fields']]?: FilterValue<T['fields'][P]>;
};

export type FilterNested<T extends SpecType> =
  & {[P in keyof T['records']]?: FilterFields<T['records'][P]> & FilterNested<T['records'][P]>}
  & {[P in keyof T['sets']]?: FilterFields<T['sets'][P]> & FilterNested<T['sets'][P]>};

export interface FilterCombinations<T extends SpecType> {
  $or?: Filter<T> | Filter<T>[];
  $and?: Filter<T> | Filter<T>[];
  $not?: Filter<T> | Filter<T>[];
}

export type Filter<T extends SpecType> = FilterFields<T> & FilterNested<T> & FilterCombinations<T>;
