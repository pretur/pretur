import { Action } from 'pretur.redux';
import { SubQuery } from 'pretur.sync';
import UniqueReducible from '../UniqueReducible';
import Value from '../data/Value';
import Includer from './Includer';
import Filterer from './Filterer';
import Attributor from './Attributor';

export default class SubQuerier extends UniqueReducible {
  private subQueryIncluder: Includer;
  private subQueryFilterer: Filterer;
  private subQueryAttributor: Attributor;
  private subQueryRequired: Value<boolean>;

  constructor(subquery?: SubQuery) {
    super();
    if (!subquery) {
      return;
    }
    this.subQueryIncluder = new Includer(subquery.include);
    this.subQueryFilterer = new Filterer(subquery.filters);
    this.subQueryAttributor = new Attributor(subquery.attributes);
    this.subQueryRequired = new Value(undefined, true, !!subquery.required);
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
    if (include) {
      subquery.include = include;
    }

    const filters = this.subQueryFilterer.plain;
    if (filters) {
      subquery.filters = filters;
    }

    const attributes = this.subQueryAttributor.plain;
    if (attributes) {
      subquery.attributes = attributes;
    }

    const required = this.subQueryRequired.value;
    if (required) {
      subquery.required = true;
    }

    return subquery;
  }

  public reduce(action: Action<any, any>): this {
    const includer = this.subQueryIncluder.reduce(action);
    const filterer = this.subQueryFilterer.reduce(action);
    const attributor = this.subQueryAttributor.reduce(action);
    const required = this.subQueryRequired.reduce(action);

    if (
      includer !== this.subQueryIncluder ||
      filterer !== this.subQueryFilterer ||
      attributor !== this.subQueryAttributor ||
      required !== this.subQueryRequired
    ) {
      const clone = this.clone();
      clone.subQueryIncluder = includer;
      clone.subQueryFilterer = filterer;
      clone.subQueryAttributor = attributor;
      clone.subQueryRequired = required;
      return clone;
    }

    return this;
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.subQueryIncluder = this.subQueryIncluder;
    clone.subQueryFilterer = this.subQueryFilterer;
    clone.subQueryAttributor = this.subQueryAttributor;
    clone.subQueryRequired = this.subQueryRequired;
  }

  protected createInstance(): this {
    return <this>new SubQuerier();
  }
}
