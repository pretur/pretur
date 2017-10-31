import { Reducible, Action } from 'reducible-node';
import { PageOccurrence, Page } from './pages';

export class PageInstance<TParams = {}, TState = {}>
  implements Reducible<PageInstance<TParams, TState>> {
  private node: Reducible<TState>;

  public readonly occurrence: PageOccurrence<TParams>;
  public readonly page: Page<TParams, TState>;

  constructor(page: Page<TParams, TState>, occurrence: PageOccurrence<TParams>) {
    if (page === undefined || occurrence === undefined) {
      return;
    }

    this.occurrence = occurrence;
    this.page = page;

    this.node = page.node();

    if (!this.node) {
      throw new Error('The node did not return the initial state.');
    }
  }

  public get path(): string {
    return this.page.path;
  }

  public get mutex(): string {
    return this.occurrence.mutex;
  }

  public get parent(): string | undefined {
    return this.occurrence.parent;
  }

  public get openedFrom(): string | undefined {
    return this.occurrence.openedFrom;
  }

  public get title(): string | undefined {
    return this.occurrence.title || this.page.title;
  }

  public get state(): TState {
    return this.node;
  }

  public get params(): TParams {
    return this.occurrence.params || <TParams>{};
  }

  public reduce(action: Action<any>): this {
    const newState = this.node.reduce(action);
    if (newState === this.state) {
      return this;
    }

    const clone = <this>new PageInstance(this.page, this.occurrence);
    clone.node = newState;
    return clone;
  }
}
