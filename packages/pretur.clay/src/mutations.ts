import { SpecPool, Scope, collide } from 'pretur.spec';
import { MutateRequest, Requester, MutateResult } from 'pretur.sync';
import { Set } from './Set';
import { Record } from './Record';
import { toPlain, Clay } from './clay';

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
    if (
      !result.ok ||
      result.cancelled ||
      result.transactionFailed ||
      result.validationError ||
      (result.errors && result.errors.length > 0)
    ) {
      applied = false;
      break;
    }
  }

  return { results, applied };
}

export interface MutationsExtractor {
  extractInsertData(clay: Record<any> | Set<Record<any>>, model: string): object;
  extractUpdateData(clay: Record<any>, model: string): { attributes: string[], data: object };
  extractRemoveIdentifiers(clay: Record<any>, model: string): object;
  getMutations(clay: Set<Record<any>> | Record<any>, model: string): MutateRequest<any>[];
}

export function buildMutationsExtractor(specPool: SpecPool, scope: Scope): MutationsExtractor {
  function extractInsertData(clay: Record<any> | Set<Record<any>>, model: string): object {
    if (clay instanceof Set) {
      const items: any[] = [];

      for (const item of clay.items) {
        items.push(extractInsertData(item, model));
      }

      return items;
    }

    const data: any = {};
    const spec = specPool[model];

    const nonAutoIncrementedOwnedAttributes = spec.attributes
      .filter(attrib => !attrib.autoIncrement && collide(attrib.scope || [], scope))
      .map(attrib => attrib.name);

    for (const attribute of nonAutoIncrementedOwnedAttributes) {
      const value = <Clay>clay.fields[attribute];
      if (value) {
        data[attribute] = toPlain(value);
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
        data[relation.alias] = extractInsertData(clay.fields[relation.alias], relation.model);
      }
    }

    return data;
  }

  function extractUpdateData(
    clay: Record<any>,
    model: string,
  ): { attributes: string[], data: object } {
    const spec = specPool[model];

    const primaries = spec.attributes.filter(attrib => attrib.primary).map(attrib => attrib.name);

    const data: any = {};
    const attributes: string[] = [];

    for (const primary of primaries) {
      data[primary] = toPlain(clay.fields[primary]);
    }

    const mutables = spec.attributes
      .filter(attrib => attrib.mutable && collide(attrib.scope || [], scope))
      .map(attrib => attrib.name);

    for (const mutable of mutables) {
      const attribute = <Clay>clay.fields[mutable];
      if (attribute && attribute.modified) {
        attributes.push(mutable);
        data[mutable] = toPlain(attribute);
      }
    }

    return { attributes, data };
  }

  function extractRemoveIdentifiers(clay: Record<any>, model: string): object {
    const spec = specPool[model];

    const primaries = spec.attributes.filter(attrib => attrib.primary).map(attrib => attrib.name);

    const identifiers: any = {};

    for (const primary of primaries) {
      identifiers[primary] = toPlain(clay.fields[primary]);
    }

    return identifiers;
  }

  function getMutations(clay: Set<Record<any>> | Record<any>, model: string) {
    const requests: MutateRequest<any>[] = [];
    const spec = specPool[model];

    if (clay instanceof Set) {
      for (const item of clay.items) {
        requests.push(...getMutations(item, model));
      }
    } else {
      if (clay.state === 'removed') {
        requests.push(<MutateRequest<any>>{
          model,
          action: 'remove',
          identifiers: extractRemoveIdentifiers(clay, model),
          type: 'mutate',
        });
      } else if (clay.state === 'new') {
        requests.push(<MutateRequest<any>>{
          model,
          action: 'insert',
          data: extractInsertData(clay, model),
          type: 'mutate',
        });
      } else {
        const updateData = extractUpdateData(clay, model);
        if (updateData.attributes.length > 0) {
          requests.push(<MutateRequest<any>>{
            model,
            ...updateData,
            action: 'update',
            type: 'mutate',
          });
        }

        const ownedRelations = spec.relations
          .filter(relation => collide(relation.scope || [], scope));

        for (const relation of ownedRelations) {
          if (clay.fields[relation.alias]) {
            requests.push(...getMutations(clay.fields[relation.alias], relation.model));
          }
        }
      }
    }

    return requests;
  }

  return {
    extractInsertData,
    extractUpdateData,
    extractRemoveIdentifiers,
    getMutations,
  };
}
