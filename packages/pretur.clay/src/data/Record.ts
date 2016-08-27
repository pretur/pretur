import { I18nBundle } from 'pretur.i18n';
import { Dispatch } from 'pretur.redux';
import { Synchronizer } from 'pretur.sync';
import { CLAY_DATA_CLEAR } from './actions';
import StatusReporter from './StatusReporter';

abstract class Record<TInsert> extends StatusReporter {
  private originalRecord: this;

  constructor(synchronized?: boolean) {
    super(synchronized);
    this.originalRecord = this;
  }

  public get original(): this {
    return this.originalRecord;
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

    const clone = this.originalRecord.clone();
    clone.statusInstance = this.statusInstance.setRemoved();
    return clone;
  }

  protected checkValidity(): boolean {
    return !this.validate() && this.validateFields();
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.originalRecord = this.originalRecord;
  }

  public abstract appendSynchronizationModels(synchronizer: Synchronizer): void;
  public abstract buildInsertModel(): TInsert;

  protected abstract validate(): I18nBundle;
  protected abstract validateFields(): boolean;
}

export default Record;
