import { isEqual } from 'lodash';
import { I18nBundle } from 'pretur.i18n';
import { Validator } from 'pretur.validation';
import { Action, Dispatch } from 'pretur.redux';
import StatusReporter from './StatusReporter';
import {
  CLAY_DATA_CLEAR,
  CLAY_DATA_DECAY,
  CLAY_DATA_SET_VALUE,
  CLAY_DATA_SET_ERROR,
} from './actions';

class Value<T> extends StatusReporter {
  private originalValue: this | null;
  private valueValidator: Validator<T> | null;
  private rawValue: T;
  private errorBundle: I18nBundle | null;

  constructor(validator?: Validator<T> | null, synchronized = false, value?: T) {
    super(synchronized);
    this.originalValue = synchronized ? this : null;
    this.valueValidator = validator || null;
    this.rawValue = value!;
    this.errorBundle = validator ? validator(value!) : null;
  }

  public get value(): T {
    return this.rawValue;
  }

  public get original(): this | null {
    return this.originalValue;
  }

  public get error(): I18nBundle | null {
    return this.errorBundle;
  }

  public reduce(action: Action<any, any>): this {
    if (CLAY_DATA_CLEAR.is(this.uniqueId, action)) {
      if (!this.originalValue) {
        return this;
      }

      return this.originalValue;
    }

    if (CLAY_DATA_DECAY.is(this.uniqueId, action)) {
      if (!this.statusInstance.fresh) {
        return this;
      }

      const clone = this.clone();
      clone.statusInstance = this.statusInstance.setDecayed();
      return clone;
    }

    if (CLAY_DATA_SET_VALUE.is(this.uniqueId, action)) {
      if (isEqual(this.rawValue, action.payload)) {
        return this;
      }

      if (this.originalValue && isEqual(this.originalValue.value, action.payload)) {
        return this.originalValue;
      }

      const clone = this.clone();

      if (clone.valueValidator) {
        clone.errorBundle = clone.valueValidator(action.payload);
      }

      clone.rawValue = action.payload;
      if (this.statusInstance.fresh) {
        clone.statusInstance = this.statusInstance.setDecayed();
      } else if (this.statusInstance.synchronized && !this.statusInstance.modified) {
        clone.statusInstance = this.statusInstance.setModified();
      }
      return clone;
    }

    if (CLAY_DATA_SET_ERROR.is(this.uniqueId, action)) {
      const clone = this.clone();
      clone.errorBundle = action.payload!;
      return clone;
    }

    return this;
  }

  public clear(dispatch: Dispatch): void {
    dispatch(CLAY_DATA_CLEAR.create.unicast(this.uniqueId));
  }

  public decay(dispatch: Dispatch): void {
    dispatch(CLAY_DATA_DECAY.create.unicast(this.uniqueId));
  }

  public set(dispatch: Dispatch, value: T): void {
    dispatch(CLAY_DATA_SET_VALUE.create.unicast(this.uniqueId, value));
  }

  public setError(dispatch: Dispatch, error: I18nBundle): void {
    dispatch(CLAY_DATA_SET_ERROR.create.unicast(this.uniqueId, error));
  }

  protected checkValidity(): boolean {
    if (!this.errorBundle) {
      return true;
    }
    return false;
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.originalValue = this.originalValue;
    clone.valueValidator = this.valueValidator;
    clone.rawValue = this.rawValue;
    clone.errorBundle = this.errorBundle;
  }

  protected createInstance(): this {
    return <this>new Value();
  }
}

export default Value;
