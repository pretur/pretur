import { Reducible, Action } from 'pretur.redux';

let id = 0;
function nextId() {
  id += 1;
  return id;
}

abstract class UniqueReducible implements Reducible {
  private globallyUniqueId: number;

  constructor() {
    this.globallyUniqueId = nextId();
  }

  public get uniqueId(): number {
    return this.globallyUniqueId;
  }

  public abstract reduce(action: Action<any, any>): this;

  protected clone(): this {
    const clone = this.createInstance();
    this.cloneOverride(clone);
    return clone;
  }

  protected cloneOverride(clone: this): void {
    clone.globallyUniqueId = this.globallyUniqueId;
  }

  protected abstract createInstance(): this;
}

export default UniqueReducible;
