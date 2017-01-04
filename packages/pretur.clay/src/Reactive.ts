import * as Bluebird from 'bluebird';
import { Action, Dispatch, emit } from 'pretur.redux';
import { Query, Synchronizer, Fetcher } from 'pretur.sync';
import Querier from './query/Querier';
import Set from './data/Set';
import Record from './data/Record';
import UniqueReducible from './UniqueReducible';
import {
  CLAY_REACTIVE_REFRESH,
  CLAY_REACTIVE_SET_INITIALIZED,
  CLAY_REACTIVE_SET_COUNT,
} from './actions';

export default class Reactive<TSet extends Set<TRecord, T>, TRecord extends Record<T>, T>
  extends UniqueReducible {
  private reactiveSet: TSet;
  private reactiveQuerier: Querier;
  private reactviceInitialized: boolean;
  private reactiveCount: number;
  private buildFetcher?: () => Fetcher;
  private autoRefreshDebounceTime: number;
  private autoRefreshTimerId: number;

  constructor(
    set?: TSet,
    query?: Query,
    buildFetcher?: () => Fetcher,
    autoRefreshDebounceTime = 300,
  ) {
    super();
    if (!set) {
      return;
    }
    this.reactiveSet = set;
    this.reactiveQuerier = new Querier(query);
    this.reactviceInitialized = false;
    this.buildFetcher = buildFetcher;
    this.autoRefreshDebounceTime = autoRefreshDebounceTime;
  }

  public get set() {
    return this.reactiveSet;
  }

  public get querier(): Querier {
    return this.reactiveQuerier;
  }

  public get initialized(): boolean {
    return this.reactviceInitialized;
  }

  public get count(): number {
    return this.reactiveCount;
  }

  public get valid(): boolean {
    return this.reactiveSet.valid;
  }

  public reduce(action: Action<any, any>): this {
    if (CLAY_REACTIVE_REFRESH.is(this.uniqueId, action)) {
      if (!this.buildFetcher) {
        throw new Error('buildFetcher must be provided');
      }

      emit(action, dispatch => {
        if (!this.buildFetcher) {
          throw new Error('buildFetcher must be provided');
        }
        const fetcher = this.buildFetcher();
        this.refresh(dispatch, fetcher);
        fetcher.fetch();
      });

      return this;
    }

    if (CLAY_REACTIVE_SET_INITIALIZED.is(this.uniqueId, action)) {
      if (this.reactviceInitialized) {
        return this;
      }
      const clone = this.clone();
      clone.reactviceInitialized = true;
      return clone;
    }

    if (CLAY_REACTIVE_SET_COUNT.is(this.uniqueId, action)) {
      if (this.reactiveCount === action.payload) {
        return this;
      }
      const clone = this.clone();
      clone.reactiveCount = +action.payload;
      return clone;
    }

    const newSet = this.reactiveSet.reduce(action);
    const newQuerier = this.reactiveQuerier.reduce(action);

    if (newSet !== this.reactiveSet || newQuerier !== this.reactiveQuerier) {
      const clone = this.clone();
      clone.reactiveSet = newSet;
      clone.reactiveQuerier = newQuerier;

      if (
        !(<any>action)[AUTO_REFRESH_TRANSPARENT_KEY] &&
        this.buildFetcher &&
        newQuerier !== this.reactiveQuerier
      ) {
        clearTimeout(clone.autoRefreshTimerId);

        const refresh = function refresh() {
          emit(action, dispatch => {
            if (!clone.buildFetcher) {
              throw new Error('buildFetcher must be provided');
            }

            const fetcher = clone.buildFetcher();
            clone.refresh(dispatch, fetcher);
            fetcher.fetch();
          });
        };

        clone.autoRefreshTimerId = <any>setTimeout(refresh, clone.autoRefreshDebounceTime);
      }

      return clone;
    }

    return this;
  }

  public init(dispatch: Dispatch, fetcher: Fetcher): Bluebird<void> {
    return this.reactiveSet.refresh(dispatch, this.reactiveQuerier.plain, fetcher).then(count => {
      if (!this.reactviceInitialized) {
        dispatch(CLAY_REACTIVE_SET_INITIALIZED.create.unicast(this.uniqueId));
      }
      if (typeof count === 'number') {
        dispatch(CLAY_REACTIVE_SET_COUNT.create.unicast(this.uniqueId, count));
      }
    });
  }

  public initIfNeeded(dispatch: Dispatch, fetcher: Fetcher): void {
    if (!this.reactviceInitialized) {
      this.init(dispatch, fetcher);
    }
  }

  public refresh(dispatch: Dispatch, fetcher: Fetcher): Bluebird<void> {
    return this.reactiveSet.refresh(dispatch, this.reactiveQuerier.plain, fetcher).then(count => {
      if (typeof count === 'number') {
        dispatch(CLAY_REACTIVE_SET_COUNT.create.unicast(this.uniqueId, count));
      }
    });
  }

  public ensureValidity(dispatch: Dispatch): boolean {
    if (this.valid) {
      return true;
    }
    dispatch(CLAY_DATA_DECAY.create.broadcast());
    return false;
  }

  public ensureValidityAndSync(
    dispatch: Dispatch,
    synchronizer: Synchronizer,
    autoDecay = true,
    autoRefresh = true,
  ): boolean {
    if (this.valid) {
      this.reactiveSet.appendSynchronizationModels(synchronizer);

      if (autoRefresh) {
        synchronizer.listen()
          .then(() => dispatch(CLAY_REACTIVE_REFRESH.create.unicast(this.uniqueId)));
      }

      return true;
    }
    if (autoDecay) {
      dispatch(CLAY_DATA_DECAY.create.broadcast());
    }
    return false;
  }

  public skipValidityAndSync(
    dispatch: Dispatch,
    synchronizer: Synchronizer,
    autoRefresh = true,
  ): void {
    this.reactiveSet.appendSynchronizationModels(synchronizer);

    if (autoRefresh) {
      synchronizer.listen()
        .then(() => dispatch(CLAY_REACTIVE_REFRESH.create.unicast(this.uniqueId)));
    }
  }

  protected cloneOverride(clone: this): void {
    super.cloneOverride(clone);
    clone.reactiveSet = this.reactiveSet;
    clone.reactiveQuerier = this.reactiveQuerier;
    clone.reactviceInitialized = this.reactviceInitialized;
    clone.reactiveCount = this.reactiveCount;
    clone.buildFetcher = this.buildFetcher;
    clone.autoRefreshDebounceTime = this.autoRefreshDebounceTime;
    clone.autoRefreshTimerId = this.autoRefreshTimerId;
  }

  protected createInstance(): this {
    return <this>new Reactive<TSet, TRecord, T>();
  }
}
