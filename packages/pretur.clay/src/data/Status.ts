export default class Status {
  private isSynchronized: boolean;
  private isModified: boolean;
  private isRremoved: boolean;
  private isFresh: boolean;
  private isPending: boolean;

  constructor(synchronized = false) {
    this.isSynchronized = synchronized;
    this.isModified = false;
    this.isRremoved = false;
    this.isFresh = !synchronized;
    this.isPending = false;
  }

  public get synchronized(): boolean {
    return this.isSynchronized;
  }

  public get fresh(): boolean {
    return this.isFresh;
  }

  public get added(): boolean {
    return !this.isSynchronized;
  }

  public get modified(): boolean {
    return this.isModified;
  }

  public get removed(): boolean {
    return this.isRremoved;
  }

  public get pending(): boolean {
    return this.isPending;
  }

  public setDecayed(): Status {
    if (!this.isFresh) {
      return this;
    }

    const clone = this.clone();
    clone.isFresh = false;
    return clone;
  }

  public setModified(): Status {
    if (this.isModified) {
      return this;
    }

    const clone = this.clone();
    clone.isModified = true;
    return clone;
  }

  public setUnmodified(): Status {
    if (!this.isModified) {
      return this;
    }

    const clone = this.clone();
    clone.isModified = false;
    return clone;
  }

  public setRemoved(): Status {
    if (this.isRremoved) {
      return this;
    }

    const clone = this.clone();
    clone.isRremoved = true;
    return clone;
  }

  public setPending(): Status {
    if (this.isPending) {
      return this;
    }

    const clone = this.clone();
    clone.isPending = true;
    return clone;
  }

  public setReady(): Status {
    if (!this.isPending) {
      return this;
    }

    const clone = this.clone();
    clone.isPending = false;
    return clone;
  }

  private clone(): Status {
    const clone = new Status();
    clone.isSynchronized = this.isSynchronized;
    clone.isModified = this.isModified;
    clone.isRremoved = this.isRremoved;
    clone.isFresh = this.isFresh;
    clone.isPending = this.isPending;
    return clone;
  }

}
