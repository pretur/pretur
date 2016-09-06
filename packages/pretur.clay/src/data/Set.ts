import * as Bluebird from 'bluebird';
import { OrderedMap, is } from 'immutable';
import { Action, Dispatch } from 'pretur.redux';
import { Query, Synchronizer, Fetcher } from 'pretur.sync';
import StatusReporter from './StatusReporter';
import Record from './Record';
import {
  CLAY_DATA_CLEAR,
  CLAY_DATA_RESET,
  CLAY_DATA_ADD_ITEM,
  CLAY_DATA_REMOVE_ITEM,
} from './actions';

abstract class Set<TRecord extends Record<T>, T> extends StatusReporter {
  private originalSet: this;
  protected setItems: OrderedMap<number, TRecord>;

  constructor(items?: T[], synchronized = true) {
    super(synchronized);
    this.originalSet = this;

    if (items) {
      this.setItems = OrderedMap<number, TRecord>(items.map(values => {
        const newItem = this.constructItem(true, values);
        return [newItem.uniqueId, newItem];
      }));
    } else {
      this.setItems = OrderedMap<number, TRecord>();
    }
  }

  public get original(): this {
    return this.originalSet;
  }

  public get items(): OrderedMap<number, TRecord> {
    return this.setItems;
  }

  public reduce(action: Action<any, any>): this {
    if (CLAY_DATA_CLEAR.is(this.uniqueId, action)) {
      return this.originalSet;
    }

    if (CLAY_DATA_RESET.is(this.uniqueId, action)) {
      if (!action.payload) {
        return this.original;
      }
      const clone = this.clone();
      clone.statusInstance = this.statusInstance.setUnmodified();
      clone.setItems = OrderedMap<number, TRecord>(action.payload.map(values => {
        const newItem = this.constructItem(true, values);
        return [newItem.uniqueId, newItem];
      }));
      clone.originalSet = clone;
      return clone;
    }

    if (CLAY_DATA_ADD_ITEM.is(this.uniqueId, action)) {
      const clone = this.clone();
      if (this.statusInstance.synchronized) {
        clone.statusInstance = this.statusInstance.setModified();
      }
      const newItem = this.constructItem(false, action.payload);
      clone.setItems = this.setItems.set(newItem.uniqueId, newItem);
      return clone;
    }

    if (CLAY_DATA_REMOVE_ITEM.is(this.uniqueId, action) && action.payload) {
      let newItems: OrderedMap<number, TRecord>;

      const target = this.setItems.get(action.payload);
      if (target.status.added) {
        newItems = this.setItems.remove(action.payload);
      } else {
        newItems = this.setItems.set(action.payload, <TRecord>target.setRemoved());
      }

      if (is(this.originalSet.setItems, newItems)) {
        return this.originalSet;
      }

      const clone = this.clone();
      if (this.statusInstance.synchronized) {
        clone.statusInstance = this.statusInstance.setModified();
      }
      clone.setItems = newItems;
      return clone;
    }

    let updated = false;

    const newItems = this.setItems.withMutations(i => {

      this.setItems.forEach((item: TRecord) => {
        if (item.status.removed) {
          return;
        }

        const newItem = <TRecord>item.reduce(action);
        if (newItem !== item) {
          updated = true;
          i.set(newItem.uniqueId, newItem);
        }
      });

    });

    if (updated) {

      if (is(this.originalSet.setItems, newItems)) {
        return this.originalSet;
      }

      const clone = this.clone();
      if (this.statusInstance.synchronized) {
        clone.statusInstance = this.statusInstance.setModified();
      }
      clone.setItems = newItems;
      return clone;
    }

    return this;
  }

  public clear(dispatch: Dispatch): void {
    dispatch(CLAY_DATA_CLEAR.create.unicast(this.uniqueId));
  }

  public add(dispatch: Dispatch, values?: T): void {
    dispatch(CLAY_DATA_ADD_ITEM.create.unicast(this.uniqueId, values));
  }

  public remove(dispatch: Dispatch, target: number): void {
    dispatch(CLAY_DATA_REMOVE_ITEM.create.unicast(this.uniqueId, target));
  }

  public refresh(dispatch: Dispatch, query: Query, fetcher: Fetcher): Bluebird<number | null> {
    const fetchPromise = fetcher.add(query);
    return fetchPromise.then(result => {
      dispatch(CLAY_DATA_RESET.create.unicast(this.uniqueId, result.data || []));
      return result.count || null;
    });
  }

  public sync(synchronizer: Synchronizer): void {
    this.appendSynchronizationModels(synchronizer);
  }

  public appendSynchronizationModels(synchronizer: Synchronizer): void {
    this.setItems.forEach((item: TRecord) => item.appendSynchronizationModels(synchronizer));
  }

  public buildInsertModel(): T[] {
    return this.setItems
      .filter((item: TRecord) => item.status.added)
      .map((item: TRecord) => item.buildInsertModel())
      .toArray();
  }

  protected checkValidity(): boolean {
    if (this.setItems.some((item: TRecord) => !item.valid)) {
      return false;
    }
    return true;
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.originalSet = this.originalSet;
    clone.setItems = this.setItems;
  }

  protected abstract constructItem(synchronized?: boolean, values?: T): TRecord;
}

export default Set;
