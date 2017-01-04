import { I18nBundle } from 'pretur.i18n';
import { Reducible, Dispatch } from 'pretur.redux';
import { Synchronizer } from 'pretur.sync';
import { CLAY_DATA_CLEAR } from './actions';
import nextId from '../nextId';
import Value from './Value';
import Set from './Set';

export type RecordTag = 'normal' | 'new' | 'removed';

export type Schema<T> = {
  [P in keyof T]: [typeof Set | typeof Record, Schema<T[P]>] | typeof Value;
};

export type Fields<T> = {
  [P in keyof T]: Record<T[P], Fields<T[P]>> | Set<any> | Value<T[P]>;
};

export class Record<T, F extends Fields<T>> implements Reducible {
  public readonly uniqueId: number;
  public readonly original: Record<T, F>;
  public readonly tag: RecordTag;
  public readonly schema: Schema<T>;
  public readonly fields: F;

  constructor(
    schema: Schema<T>,
    fields?: Partial<T>,
    tag: RecordTag = 'normal',
    original?: Record<T, F>,
    uniqueId?: number,
  ) {
    this.uniqueId = typeof uniqueId === 'number' ? uniqueId : nextId();
    this.original = original ? original : this;
    this.tag = tag;
    this.schema = schema;
    this.fields = <F>{};
    if (fields) {

    }
  }

  public get error(): I18nBundle {
    return this.validate();
  }

  public clear(dispatch: Dispatch): void {
    dispatch(CLAY_DATA_CLEAR.create.unicast(this.uniqueId));
  }

  public setRemoved(): this {
    if (this.statusInstance.removed) {
      return this;
    }

    const clone = this.original.clone();
    clone.statusInstance = this.statusInstance.setRemoved();
    return clone;
  }

  public setUnremoved(): this {
    if (!this.statusInstance.removed) {
      return this;
    }

    const clone = this.original.clone();
    clone.statusInstance = this.statusInstance.setUnremoved();
    return clone;
  }

  protected checkValidity(): boolean {
    return !this.validate() && this.validateFields();
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.original = this.original;
  }

  public abstract appendSynchronizationModels(synchronizer: Synchronizer): void;
  public abstract buildInsertModel(): T;

  protected abstract validate(): I18nBundle;
  protected abstract validateFields(): boolean;
}
