import { Action } from 'pretur.redux';
import { SubQuery } from 'pretur.sync';
import UniqueReducible from '../UniqueReducible';
import Includer from './Includer';
import Filterer from './Filterer';
import Attributor from './Attributor';

export default class SubQuerier extends UniqueReducible {
  private subQueryIncluder: Includer;
  private subQueryFilterer: Filterer;
  private subQueryAttributor: Attributor;

  constructor(subquery: SubQuery | null) {
    super();
    if (subquery === null) {
      return;
    }
    this.subQueryIncluder = new Includer(subquery.include);
    this.subQueryFilterer = new Filterer(subquery.filters);
    this.subQueryAttributor = new Attributor(subquery.attributes);
  }

  public get includer(): Includer {
    return this.subQueryIncluder;
  }

  public get filterer(): Filterer {
    return this.subQueryFilterer;
  }

  public get attributor(): Attributor {
    return this.subQueryAttributor;
  }

  public get plain(): SubQuery {
    const subquery = <SubQuery>{};

    const include = this.subQueryIncluder.plain;
    if (include !== null) {
      subquery.include = include;
    }

    const filters = this.subQueryFilterer.plain;
    if (filters !== null) {
      subquery.filters = filters;
    }

    const attributes = this.subQueryAttributor.plain;
    if (attributes !== null) {
      subquery.attributes = attributes;
    }

    return subquery;
  }

  public reduce(action: Action<any, any>): this {
    const includer = this.subQueryIncluder.reduce(action);
    const filterer = this.subQueryFilterer.reduce(action);
    const attributor = this.subQueryAttributor.reduce(action);

    if (
      includer !== this.subQueryIncluder ||
      filterer !== this.subQueryFilterer ||
      attributor !== this.subQueryAttributor
    ) {
      const clone = this.clone();
      clone.subQueryIncluder = includer;
      clone.subQueryFilterer = filterer;
      clone.subQueryAttributor = attributor;
      return clone;
    }

    return this;
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.subQueryIncluder = this.subQueryIncluder;
    clone.subQueryFilterer = this.subQueryFilterer;
    clone.subQueryAttributor = this.subQueryAttributor;
  }

  protected createInstance(): this {
    return <this>new SubQuerier(null);
  }
}
