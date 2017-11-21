import { SpecType, Model, SpecPool, collide } from 'pretur.spec';
import { MutateRequest, Requester, MutateResult } from 'pretur.sync';
import { Set } from './Set';
import { Record } from './Record';
import { toPlain } from './clay';

export interface ApplyMutationsResult {
  results: MutateResult<any>[];
  applied: boolean;
}

export function buildApplyMutations(
  requester: Requester,
): (mutations: MutateRequest<any>[]) => Promise<ApplyMutationsResult> {
  return mutations => applyMutations(requester, mutations);
}

export async function applyMutations(
  requester: Requester,
  mutations: MutateRequest<any>[],
): Promise<ApplyMutationsResult> {
  if (mutations.length === 0) {
    return { results: [], applied: false };
  }

  requester.batchMutateStart();

  const promises: Promise<MutateResult<any>>[] = [];

  for (const mutation of mutations) {
    if (mutation.type !== 'mutate') {
      continue;
    }

    switch (mutation.action) {
      case 'insert':
        promises.push(requester.insert<any>(mutation));
        break;
      case 'update':
        promises.push(requester.update<any>(mutation));
        break;
      case 'remove':
        promises.push(requester.remove<any>(mutation));
        break;
    }
  }

  requester.batchMutateEnd();

  const results = await Promise.all(promises);
  let applied = true;

  for (const result of results) {
    if (result.errors.length > 0) {
      applied = false;
      break;
    }
  }

  return { results, applied };
}

export interface MutationsExtractor {
  extractInsertData<T extends SpecType>(
    clay: Record<T>,
    model: T['name'],
  ): Partial<Model<T>>;
  extractInsertData<T extends SpecType>(
    clay: Set<T>,
    model: T['name'],
  ): Partial<Model<T>>[];

  extractUpdateData<T extends SpecType>(
    record: Record<T>,
    model: T['name'],
  ): Partial<T['fields']>;

  extractRemoveIdentifiers<T extends SpecType>(
    record: Record<T>,
    model: T['name'],
  ): Partial<T['fields']>;

  getMutations<T extends SpecType>(
    clay: Set<T> | Record<T>,
    model: T['name'],
  ): MutateRequest<any>[];
}

export function buildMutationsExtractor(
  specPool: SpecPool,
  scope: string | string[],
): MutationsExtractor {
  function extractInsertData<T extends SpecType>(
    clay: Record<T>,
    model: T['name'],
  ): Partial<Model<T>>;
  function extractInsertData<T extends SpecType>(
    clay: Set<T>,
    model: T['name'],
  ): Partial<Model<T>>[];
  function extractInsertData<T extends SpecType>(
    clay: Record<T> | Set<T>,
    model: T['name'],
  ): Partial<Model<T>> | Partial<Model<T>>[] {
    if (clay instanceof Set) {
      const items: Partial<Model<T>>[] = [];

      for (const item of clay.items) {
        items.push(extractInsertData(item, model));
      }

      return items;
    }

    const data: any = {};
    const spec = specPool[model];

    const nonAutoIncrementedOwnedAttributes = <(keyof T['fields'])[]>spec.attributes
      .filter(attrib => !attrib.autoIncrement && collide(attrib.scope || [], scope))
      .map(attrib => attrib.name);

    for (const attribute of nonAutoIncrementedOwnedAttributes) {
      const value = clay.fields[attribute];
      if (value) {
        data[attribute] = <any>toPlain(value);
      }
    }

    const ownedTargetRelations = spec.relations
      .filter(relation => collide(relation.scope || [], scope))
      .filter(({ type }) =>
        type === 'SUBCLASS' ||
        type === 'MASTER' ||
        type === 'DETAIL' ||
        type === 'MANY_TO_MANY' ||
        type === 'INJECTIVE',
    );

    for (const relation of ownedTargetRelations) {
      if (clay.fields[relation.alias]) {
        data[relation.alias] = <any>extractInsertData(clay.fields[relation.alias], relation.model);
      }
    }

    return data;
  }

  function extractUpdateData<T extends SpecType>(
    record: Record<T>,
    model: T['name'],
  ): Partial<T['fields']> {
    const spec = specPool[model];

    const primaries = spec.attributes.filter(attrib => attrib.primary).map(attrib => attrib.name);

    const data: any = {};

    for (const primary of primaries) {
      data[primary] = toPlain(record.fields[primary]);
    }

    const mutables = spec.attributes
      .filter(attrib => attrib.mutable && collide(attrib.scope || [], scope))
      .map(attrib => attrib.name);

    for (const mutable of mutables) {
      const attribute = record.fields[mutable];
      if (attribute && attribute.modified) {
        data[mutable] = toPlain(attribute);
      }
    }

    return data;
  }

  function extractRemoveIdentifiers<T extends SpecType>(
    record: Record<T>,
    model: T['name'],
  ): Partial<T['fields']> {
    const spec = specPool[model];

    const primaries = spec.attributes.filter(attrib => attrib.primary).map(attrib => attrib.name);

    const identifiers: any = {};

    for (const primary of primaries) {
      identifiers[primary] = toPlain(record.fields[primary]);
    }

    return identifiers;
  }

  function getMutations<T extends SpecType>(
    clay: Set<T> | Record<T>,
    model: T['name'],
  ): MutateRequest<T>[] {
    const requests: MutateRequest<T>[] = [];
    const spec = specPool[model];

    if (clay instanceof Set) {
      for (const item of clay.items) {
        requests.push(...getMutations(item, model));
      }
    } else {
      if (clay.state === 'removed') {
        requests.push(<MutateRequest<T>>{
          action: 'remove',
          identifiers: extractRemoveIdentifiers(clay, model),
          model,
          type: 'mutate',
        });
      } else if (clay.state === 'new') {
        requests.push(<MutateRequest<T>>{
          action: 'insert',
          data: extractInsertData(clay, model),
          model,
          type: 'mutate',
        });
      } else {
        const updates = extractUpdateData(clay, model);
        if (Object.keys(updates).length > 1) {
          requests.push(<MutateRequest<T>>{
            model,
            data: updates,
            action: 'update',
            type: 'mutate',
          });
        }

        const ownedRelations = spec.relations
          .filter(relation => collide(relation.scope || [], scope));

        for (const relation of ownedRelations) {
          if (clay.fields[relation.alias]) {
            requests.push(
              ...getMutations(clay.fields[relation.alias], relation.model),
            );
          }
        }
      }
    }

    return requests;
  }

  return {
    extractInsertData,
    extractRemoveIdentifiers,
    extractUpdateData,
    getMutations,
  };
}
