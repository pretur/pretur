import { isEqual } from 'lodash';
import { I18nBundle } from 'pretur.i18n';
import { ValueValidationError } from 'pretur.validation';
import { Action, Dispatch } from 'pretur.redux';
import StatusReporter from './StatusReporter';
import {
  CLAY_DATA_CLEAR,
  CLAY_DATA_DECAY,
  CLAY_DATA_SET_VALUE,
  CLAY_DATA_SET_ERROR,
} from './actions';

class Value<T> extends StatusReporter {
  private originalValue?: this;
  private _validator: string | undefined;
  private rawValue: T;
  private _validationError: ValueValidationError;

  constructor(validator: Validator<T> | undefined, synchronized: boolean, value: T) {
    super(synchronized);
    this.originalValue = synchronized ? this : undefined;
    this._validator = validator || undefined;
    this.rawValue = value;
    this._validationError = validator ? validator(value) : undefined;
  }

  public get value(): T {
    return this.rawValue;
  }

  public get original(): this | undefined {
    return this.originalValue;
  }

  public get error(): I18nBundle | undefined {
    return this._validationError;
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

      if (clone._validator) {
        clone._validationError = clone._validator(clone.value);
      }

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

      if (clone._validator) {
        clone._validationError = clone._validator(action.payload);
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
      clone._validationError = action.payload;
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
    if (!this._validationError) {
      return true;
    }
    return false;
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.originalValue = this.originalValue;
    clone._validator = this._validator;
    clone.rawValue = this.rawValue;
    clone._validationError = this._validationError;
  }

  protected createInstance(): this {
    return <this>new Value(undefined, false, <any>undefined);
  }
}

export default Value;
