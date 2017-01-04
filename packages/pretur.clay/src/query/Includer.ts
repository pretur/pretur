import { Action } from 'pretur.redux';
import { QueryInclude } from 'pretur.sync';
import { Map } from 'immutable';
import UniqueReducible from '../UniqueReducible';
import SubQuerier from './SubQuerier';

export default class Includer extends UniqueReducible {
  private includedSubQueriers: Map<string, SubQuerier | boolean>;

  constructor(include?: QueryInclude) {
    super();
    if (include) {
      const keys = Object.keys(include);
      this.includedSubQueriers = Map<string, SubQuerier | boolean>(keys.map(alias => {
        if (include[alias]) {
          return [alias, new SubQuerier(include[alias])];
        }

        if (include[alias] === true) {
          return [alias, true];
        }

        return;
      }).filter(Boolean));

    } else {
      this.includedSubQueriers = Map<string, SubQuerier | boolean>();
    }
  }

  public get subQueriers(): Map<string, SubQuerier | boolean> {
    return this.includedSubQueriers;
  }

  public get plain(): QueryInclude | undefined {
    if (this.includedSubQueriers.size === 0) {
      return;
    }
    const include: QueryInclude = {};

    this.includedSubQueriers.forEach((subQuerier, alias) => {
      if (typeof alias === 'string') {
        if (subQuerier instanceof SubQuerier) {
          include[alias] = subQuerier.plain;
        } else if (subQuerier === true) {
          include[alias] = true;
        }
      }
    });

    return include;
  }

  public reduce(action: Action<any, any>): this {
    let modified = false;
    const newSubQueriers = this.includedSubQueriers.withMutations(s => {

      this.includedSubQueriers.forEach((subQuerier, alias) => {
        if (typeof alias === 'string') {
          if (subQuerier instanceof SubQuerier) {
            const newSubQuerier = subQuerier.reduce(action);
            if (newSubQuerier !== subQuerier) {
              modified = true;
              s.set(alias, newSubQuerier);
            }
          }
        }
      });

    });

    if (modified) {
      const clone = this.clone();
      clone.includedSubQueriers = newSubQueriers;
      return clone;
    }

    return this;
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.includedSubQueriers = this.includedSubQueriers;
  }

  protected createInstance(): this {
    return <this>new Includer();
  }
}
