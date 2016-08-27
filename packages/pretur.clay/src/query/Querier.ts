import { Action } from 'pretur.redux';
import { Query } from 'pretur.sync';
import Value from '../data/Value';
import UniqueReducible from '../UniqueReducible';
import Includer from './Includer';
import Filterer from './Filterer';
import Attributor from './Attributor';
import Paginator from './Paginator';
import Orderer from './Orderer';

export default class Querier extends UniqueReducible {
  private queryModel: string;
  private queryById: number;
  private queryCount: boolean;
  private queryIncluder: Includer;
  private queryFilterer: Filterer;
  private queryAttributor: Attributor;
  private queryPaginator: Paginator;
  private queryOrderer: Orderer;
  private queryExtra: Value<any>;
  private shouldExtraCausePaginationReset: boolean;

  constructor(query: Query, shouldExtraCausePaginationReset = false) {
    super();
    if (query === null) {
      return;
    }
    this.queryModel = query.model!;
    this.queryById = query.byId!;
    this.queryCount = !!query.count;
    this.queryIncluder = new Includer(query.include);
    this.queryFilterer = new Filterer(query.filters);
    this.queryAttributor = new Attributor(query.attributes);
    this.queryPaginator = new Paginator(query.pagination);
    this.queryOrderer = new Orderer(query.order);
    this.queryExtra = new Value(null, false, query.extra);
    this.shouldExtraCausePaginationReset = shouldExtraCausePaginationReset;
  }

  public get model(): string {
    return this.queryModel;
  }

  public get byId(): number {
    return this.queryById;
  }

  public get count(): boolean {
    return this.queryCount;
  }

  public get includer(): Includer {
    return this.queryIncluder;
  }

  public get filterer(): Filterer {
    return this.queryFilterer;
  }

  public get attributor(): Attributor {
    return this.queryAttributor;
  }

  public get paginator(): Paginator {
    return this.queryPaginator;
  }

  public get orderer(): Orderer {
    return this.queryOrderer;
  }

  public get extra(): Value<any> {
    return this.queryExtra;
  }

  public get plain(): Query {
    const query = <Query>{};

    query.model = this.queryModel;

    if (typeof this.queryById === 'number') {
      query.byId = this.queryById;
    }

    const include = this.queryIncluder.plain;
    if (include !== null) {
      query.include = include;
    }

    const filters = this.queryFilterer.plain;
    if (filters !== null) {
      query.filters = filters;
    }

    const attributes = this.queryAttributor.plain;
    if (attributes !== null) {
      query.attributes = attributes;
    }

    if (this.queryCount === true) {
      query.count = true;
    }

    const pagination = this.queryPaginator.plain;
    if (pagination !== null) {
      query.pagination = pagination;
    }

    const order = this.queryOrderer.plain;
    if (order !== null) {
      query.order = order;
    }

    query.extra = this.queryExtra.value;

    return query;
  }

  public reduce(action: Action<any, any>): this {
    const includer = this.queryIncluder.reduce(action);
    const filterer = this.queryFilterer.reduce(action);
    const attributor = this.queryAttributor.reduce(action);
    const paginator = this.queryPaginator.reduce(action);
    const orderer = this.queryOrderer.reduce(action);
    const extra = this.queryExtra.reduce(action);

    if (
      includer !== this.queryIncluder ||
      filterer !== this.queryFilterer ||
      attributor !== this.queryAttributor ||
      paginator !== this.queryPaginator ||
      orderer !== this.queryOrderer ||
      extra !== this.queryExtra
    ) {
      const clone = this.clone();
      let shouldResetPagination = false;

      if (filterer !== this.queryFilterer ||
        attributor !== this.queryAttributor ||
        orderer !== this.queryOrderer) {
        shouldResetPagination = true;
      }

      if (this.shouldExtraCausePaginationReset && extra !== this.queryExtra) {
        shouldResetPagination = true;
      }

      if (paginator !== this.queryPaginator) {
        shouldResetPagination = false;
      }

      clone.queryIncluder = includer;
      clone.queryFilterer = filterer;
      clone.queryAttributor = attributor;

      if (shouldResetPagination) {
        clone.queryPaginator = new Paginator({ take: paginator.take! });
      } else {
        clone.queryPaginator = paginator;
      }

      clone.queryOrderer = orderer;
      clone.queryExtra = extra;
      return clone;
    }

    return this;
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.queryModel = this.queryModel;
    clone.queryById = this.queryById;
    clone.queryCount = this.count;
    clone.queryIncluder = this.queryIncluder;
    clone.queryFilterer = this.queryFilterer;
    clone.queryAttributor = this.queryAttributor;
    clone.queryPaginator = this.queryPaginator;
    clone.queryOrderer = this.queryOrderer;
    clone.queryExtra = this.queryExtra;
    clone.shouldExtraCausePaginationReset = this.shouldExtraCausePaginationReset;
  }

  protected createInstance(): this {
    return <this>new Querier(null!);
  }
}
