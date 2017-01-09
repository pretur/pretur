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

export function applyMutations(
  requester: Requester,
  mutations: MutationRequest[],
): Bluebird<Result[]> {
  requester.batchStart();

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

  requester.batchEnd();

  return Bluebird.all(promises);
}

export function buildMutationsExtractor(specPool: SpecPool, owner: Owner):
  (clay: Set<Record<any>> | Record<any>, model: string) => MutationRequest[] {

  function buildNestedInsertModel(clay: Record<any> | Set<Record<any>>, model: string): object {
    if (clay instanceof Set) {
      const items: any[] = [];

      for (const item of clay.items) {
        items.push(buildNestedInsertModel(item, model));
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
      if ((<Clay>clay.fields[relation.alias]).modified) {
        data[relation.alias] = buildNestedInsertModel(clay.fields[relation.alias], relation.model);
      }
    }

    return data;
  }

  return function mutations(clay: Set<Record<any>> | Record<any>, model: string) {
    const requests: MutationRequest[] = [];
    const spec = specPool[model];

    if (clay instanceof Set) {
      for (const item of clay.items) {
        requests.push(...mutations(item, model));
      }
    } else {
      const primaries = spec.attributeArray
        .filter(attrib => attrib.primary)
        .map(attrib => attrib.name);

      if (clay.state === 'removed') {
        const identifiers: any = {};

        for (const primary of primaries) {
          identifiers[primary] = toPlain(clay.fields[primary]);
        }

        requests.push(<RemoveRequest<any>>{
          model,
          identifiers,
          type: 'remove',
        });
      } else if (clay.state === 'new') {
        requests.push(<InsertRequest<any>>{
          model,
          data: buildNestedInsertModel(clay, model),
          type: 'insert',
        });
      } else {
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

        requests.push(<UpdateRequest<any>>{
          model,
          attributes,
          data,
          type: 'update',
        });

        const nonVirtualOwnedRelations = spec.nonVirtualRelationArray
          .filter(relation => ownersIntersect(relation.owner || [], owner));

        for (const relation of nonVirtualOwnedRelations) {
          if ((<Clay>clay.fields[relation.alias]).modified) {
            requests.push(...mutations(clay.fields[relation.alias], relation.model));
          }
        }
      }
    }

    return requests;
  };
}
