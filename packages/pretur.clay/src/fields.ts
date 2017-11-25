import { Spec, SpecType, Model, SpecPool } from 'pretur.spec';
import { State } from './clay';
import { Value } from './Value';
import { Record } from './Record';
import { Set } from './Set';

export type Fields<T extends SpecType> =
  & {[P in keyof T['fields']]: Value<T['fields'][P]>}
  & {[P in keyof T['records']]: Record<T['records'][P]>}
  & {[P in keyof T['sets']]: Set<T['sets'][P]>};

export function buildFields<T extends SpecType>(
  pool: SpecPool,
  spec: Spec<T>,
  values: Partial<Model<T>> = {},
): Fields<T> {
  const fields: any = {};

  for (const attribute of spec.attributes) {
    fields[attribute.name] = new Value(values[attribute.name]);
  }

  for (const relation of spec.relations) {
    const target = pool[relation.target.scope][relation.target.model];
    if (values[relation.alias]) {
      switch (relation.type) {
        case 'DETAIL':
        case 'MANY_TO_MANY':
          fields[relation.alias] = buildSet(pool, target, values[relation.alias]);
          break;
        default:
          fields[relation.alias] = buildRecord(pool, target, values[relation.alias]);
      }
    }
  }

  return fields;
}

export function buildRecord<T extends SpecType>(
  pool: SpecPool,
  spec: Spec<T>,
  values: Partial<Model<T>> = {},
  state: State = 'normal',
): Record<T> {
  return new Record(buildFields(pool, spec, values), undefined, state);
}

export function buildSet<T extends SpecType>(
  pool: SpecPool,
  spec: Spec<T>,
  items: Partial<Model<T>>[] = [],
): Set<T> {
  return new Set(items.map(item => buildRecord(pool, spec, item)));
}
