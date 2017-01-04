import { Reducible, Action } from 'pretur.redux';
import { Query } from 'pretur.sync';
import Value from '../data/Value';
import nextId from '../nextId';
import Includer from './Includer';
import Filterer from './Filterer';
import Attributor from './Attributor';
import Paginator from './Paginator';
import Orderer from './Orderer';

export default class Querier<T> implements Reducible {
  private _uniqueId: number;
  private _model: string;
  private _byId?: Partial<T>;
  private _count: boolean;
  private _includer: Includer;
  private _filterer: Filterer;
  private _attributor: Attributor;
  private _paginator: Paginator;
  private _orderer: Orderer;
  private _extra: Value<any>;
  private _shouldExtraCausePaginationReset: boolean;

  constructor(query: Query<T>, shouldExtraCausePaginationReset = false) {
    if (!query) {
      return;
    }
    this._uniqueId = nextId();
    this._model = '' + query.model;
    this._byId = query.byId;
    this._count = !!query.count;
    this._includer = new Includer(query.include);
    this._filterer = new Filterer(query.filters);
    this._attributor = new Attributor(query.attributes);
    this._paginator = new Paginator(query.pagination);
    this._orderer = new Orderer(query.order);
    this._extra = Value.build(query.extra);
    this._shouldExtraCausePaginationReset = shouldExtraCausePaginationReset;
  }

  public get model(): string {
    return this._model;
  }

  public get byId(): Partial<T> | undefined {
    return this._byId;
  }

  public get count(): boolean {
    return this._count;
  }

  public get includer(): Includer {
    return this._includer;
  }

  public get filterer(): Filterer {
    return this._filterer;
  }

  public get attributor(): Attributor {
    return this._attributor;
  }

  public get paginator(): Paginator {
    return this._paginator;
  }

  public get orderer(): Orderer {
    return this._orderer;
  }

  public get extra(): Value<any> {
    return this._extra;
  }

  public get plain(): Query<T> {
    const query = <Query<T>>{};

    query.model = this._model;

    if (this._byId) {
      query.byId = this._byId;
    }

    const include = this._includer.plain;
    if (include) {
      query.include = include;
    }

    const filters = this._filterer.plain;
    if (filters) {
      query.filters = filters;
    }

    const attributes = this._attributor.plain;
    if (Array.isArray(attributes)) {
      query.attributes = attributes;
    }

    if (this._count === true) {
      query.count = true;
    }

    const pagination = this._paginator.plain;
    if (pagination) {
      query.pagination = pagination;
    }

    const order = this._orderer.plain;
    if (order) {
      query.order = order;
    }

    query.extra = this._extra.value;

    return query;
  }

  public reduce(action: Action<any, any>): this {
    const includer = this._includer.reduce(action);
    const filterer = this._filterer.reduce(action);
    const attributor = this._attributor.reduce(action);
    const paginator = this._paginator.reduce(action);
    const orderer = this._orderer.reduce(action);
    const extra = this._extra.reduce(action);

    if (
      includer !== this._includer ||
      filterer !== this._filterer ||
      attributor !== this._attributor ||
      paginator !== this._paginator ||
      orderer !== this._orderer ||
      extra !== this._extra
    ) {
      const clone = this.clone();
      let shouldResetPagination = false;

      if (filterer !== this._filterer ||
        attributor !== this._attributor ||
        orderer !== this._orderer) {
        shouldResetPagination = true;
      }

      if (this._shouldExtraCausePaginationReset && extra !== this._extra) {
        shouldResetPagination = true;
      }

      if (paginator !== this._paginator) {
        shouldResetPagination = false;
      }

      clone._includer = includer;
      clone._filterer = filterer;
      clone._attributor = attributor;

      if (shouldResetPagination) {
        clone._paginator = new Paginator({ take: paginator.take });
      } else {
        clone._paginator = paginator;
      }

      clone.queryOrderer = orderer;
      clone.queryExtra = extra;
      return clone;
    }

    return this;
  }

  private clone(): this {
    const clone = <this>new Querier(undefined!);
    clone._model = this._model;
    clone._byId = this._byId;
    clone._count = this.count;
    clone._includer = this._includer;
    clone._filterer = this._filterer;
    clone._attributor = this._attributor;
    clone._paginator = this._paginator;
    clone._orderer = this._orderer;
    clone._extra = this._extra;
    clone._shouldExtraCausePaginationReset = this._shouldExtraCausePaginationReset;
    return clone;
  }
}
