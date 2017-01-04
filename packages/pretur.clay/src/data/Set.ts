import { isEqual } from 'lodash';
import * as Bluebird from 'bluebird';
import { Reducible, Action, Dispatch } from 'pretur.redux';
import { Query } from 'pretur.sync';
import { Record, Schema } from './Record';
import {
  CLAY_DATA_CLEAR,
  CLAY_DATA_RESET,
  CLAY_DATA_ADD_ITEM,
  CLAY_DATA_REMOVE_ITEM,
  CLAY_DATA_UNREMOVE_ITEM,
} from './actions';

class Set<T> implements Reducible {
  private _original: this;
  private _items: Record<T>[];
  private _newItems: Record<T>[];

  constructor(items?: T[]) {
    this._original = this;

    if (items) {
      this._items = items.map(item => new Record<T>(item));
    } else {
      this._items = [];
    }
  }

  public get original(): this {
    return this._original;
  }

  public get items(): OrderedMap<number, TRecord> {
    return this._items;
  }

  public reduce(action: Action<any, any>): this {
    if (CLAY_DATA_CLEAR.is(this.uniqueId, action)) {
      return this._original;
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
      clone.setItems = this._items.set(newItem.uniqueId, newItem);
      return clone;
    }

    if (CLAY_DATA_REMOVE_ITEM.is(this.uniqueId, action) && action.payload) {
      let newItems: OrderedMap<number, TRecord>;

      const target = this._items.get(action.payload);
      if (target.status.added) {
        newItems = this._items.remove(action.payload);
      } else {
        newItems = this._items.set(action.payload, <TRecord>target.setRemoved());
      }

      if (is(this._original._items, newItems)) {
        return this._original;
      }

      const clone = this.clone();
      if (this.statusInstance.synchronized) {
        clone.statusInstance = this.statusInstance.setModified();
      }
      clone.setItems = newItems;
      return clone;
    }

    if (CLAY_DATA_UNREMOVE_ITEM.is(this.uniqueId, action) && action.payload) {
      const target = this._items.get(action.payload);
      const newItems = this._items.set(action.payload, <TRecord>target.setUnremoved());

      if (is(this._original._items, newItems)) {
        return this._original;
      }

      const clone = this.clone();
      clone.setItems = newItems;
      return clone;
    }

    let updated = false;

    const newItems = this._items.withMutations(i => {

      this._items.forEach((item: TRecord) => {
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

      if (is(this._original._items, newItems)) {
        return this._original;
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

  public unremove(dispatch: Dispatch, target: number): void {
    dispatch(CLAY_DATA_UNREMOVE_ITEM.create.unicast(this.uniqueId, target));
  }

  public refresh(dispatch: Dispatch, query: Query, fetcher: Fetcher): Bluebird<number | undefined> {
    const fetchPromise = fetcher.add(query);
    return fetchPromise.then(result => {
      dispatch(CLAY_DATA_RESET.create.unicast(this.uniqueId, result.data || []));
      return result.count || undefined;
    });
  }

  public sync(synchronizer: Synchronizer): void {
    this.appendSynchronizationModels(synchronizer);
  }

  public appendSynchronizationModels(synchronizer: Synchronizer): void {
    this._items.forEach((item: TRecord) => item.appendSynchronizationModels(synchronizer));
  }

  public buildInsertModel(): T[] {
    return this._items
      .filter((item: TRecord) => item.status.added)
      .map((item: TRecord) => item.buildInsertModel())
      .toArray();
  }

  protected checkValidity(): boolean {
    if (this._items.some((item: TRecord) => !item.valid)) {
      return false;
    }
    return true;
  }

  private clone(clone: this): void {
    super.cloneOverride(clone);
    clone._original = this._original;
    clone._items = this._items;
  }

}

export default Set;
