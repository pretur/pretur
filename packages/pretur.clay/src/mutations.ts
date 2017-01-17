import * as Bluebird from 'bluebird';
import { SpecPool, Owner, ownersIntersect } from 'pretur.spec';
import { InsertRequest, UpdateRequest, RemoveRequest, Requester, Result } from 'pretur.sync';
import { Set } from './Set';
import { Record } from './Record';
import { toPlain, Clay } from './clay';

export type MutationRequest =
  | InsertRequest<any>
  | UpdateRequest<any>
  | RemoveRequest<any>;

export async function applyMutations(
  requester: Requester,
  mutations: MutationRequest[],
): Bluebird<Result[] | false> {
  if (mutations.length === 0) {
    return false;
  }

  requester.batchMutateStart();

  const promises: Bluebird<Result>[] = [];

  for (const mutation of mutations) {
    switch (mutation.type) {
      case 'insert':
        promises.push(requester.insert(mutation));
        break;
      case 'update':
        promises.push(requester.update(mutation));
        break;
      case 'remove':
        promises.push(requester.remove(mutation));
        break;
    }
  }

  requester.batchMutateEnd();

  return Bluebird.all(promises);
}

export interface MutationsExtractor {
  extractInsertData(clay: Record<any> | Set<Record<any>>, model: string): object;
  extractUpdateData(clay: Record<any>, model: string): { attributes: string[], data: object };
  extractRemoveIdentifiers(clay: Record<any>, model: string): object;
  mutations(clay: Set<Record<any>> | Record<any>, model: string): MutationRequest[];
}

export function buildMutationsExtractor(specPool: SpecPool, owner: Owner): MutationsExtractor {
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

    const nonAutoIncrementedOwnedAttributes = spec.attributeArray
      .filter(attrib => !attrib.autoIncrement && ownersIntersect(attrib.owner || [], owner))
      .map(attrib => attrib.name);

    for (const attribute of nonAutoIncrementedOwnedAttributes) {
      const value = <Clay>clay.fields[attribute];
      if (value && value.modified) {
        data[attribute] = toPlain(value);
      }
    }

    const nonVirtualRelations = spec.nonVirtualRelations;
    const targetRelations = [
      ...nonVirtualRelations.subclass,
      ...nonVirtualRelations.master,
      ...nonVirtualRelations.detail,
      ...nonVirtualRelations.manyToMany,
      ...nonVirtualRelations.injective,
    ];
    const ownedTargetRelations = targetRelations
      .filter(relation => ownersIntersect(relation.owner || [], owner));

    for (const relation of ownedTargetRelations) {
      if (clay.fields[relation.alias] && (<Clay>clay.fields[relation.alias]).modified) {
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

    const primaries = spec.attributeArray
      .filter(attrib => attrib.primary)
      .map(attrib => attrib.name);

    const data: any = {};
    const attributes: string[] = [];

    for (const primary of primaries) {
      data[primary] = toPlain(clay.fields[primary]);
    }

    const mutables = spec.attributeArray
      .filter(attrib => attrib.mutable && ownersIntersect(attrib.owner || [], owner))
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

    const primaries = spec.attributeArray
      .filter(attrib => attrib.primary)
      .map(attrib => attrib.name);

    const identifiers: any = {};

    for (const primary of primaries) {
      identifiers[primary] = toPlain(clay.fields[primary]);
    }

    return identifiers;
  }

  function mutations(clay: Set<Record<any>> | Record<any>, model: string) {
    const requests: MutationRequest[] = [];
    const spec = specPool[model];

    if (clay instanceof Set) {
      if (clay.modified) {
        for (const item of clay.items) {
          requests.push(...mutations(item, model));
        }
      }
    } else {
      if (clay.state === 'removed') {
        requests.push(<RemoveRequest<any>>{
          model,
          identifiers: extractRemoveIdentifiers(clay, model),
          type: 'remove',
        });
      } else if (clay.state === 'new') {
        requests.push(<InsertRequest<any>>{
          model,
          data: extractInsertData(clay, model),
          type: 'insert',
        });
      } else if (clay.modified) {
        const updateData = extractUpdateData(clay, model);
        if (updateData.attributes.length > 0) {
          requests.push(<UpdateRequest<any>>{
            model,
            ...updateData,
            type: 'update',
          });
        }

        const nonVirtualOwnedRelations = spec.nonVirtualRelationArray
          .filter(relation => ownersIntersect(relation.owner || [], owner));

        for (const relation of nonVirtualOwnedRelations) {
          if (clay.fields[relation.alias] && (<Clay>clay.fields[relation.alias]).modified) {
            requests.push(...mutations(clay.fields[relation.alias], relation.model));
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
    mutations,
  };
}
