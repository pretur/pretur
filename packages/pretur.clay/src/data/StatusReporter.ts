import UniqueReducible from '../UniqueReducible';
import Status from './Status';

abstract class StatusReporter extends UniqueReducible {
  protected statusInstance: Status;

  constructor(synchronized?: boolean) {
    super();
    this.statusInstance = new Status(synchronized);
  }

  public get status(): Status {
    return this.statusInstance;
  }

  public get valid(): boolean {
    return this.checkValidity();
  }

  protected clone(): this {
    const clone = this.createInstance();
    this.cloneOverride(clone);
    return clone;
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.statusInstance = this.statusInstance;
  }

  protected abstract checkValidity(): boolean;
}

export default StatusReporter;
