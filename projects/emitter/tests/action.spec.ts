import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Actions, NgxsModule, State, StateContext, ofActionDispatched, Store } from '@ngxs/store';

import { throwError } from 'rxjs';

import { Receiver } from '../src/lib/core/decorators/receiver';
import { Emitter } from '../src/lib/core/decorators/emitter';
import { Emittable, OfEmittableActionContext } from '../src/lib/core/internal/internals';
import { NgxsEmitPluginModule } from '../src/lib/emit.module';
import { ofEmittableDispatched, ofEmittableErrored } from '../src/lib/core/operators/of-emittable';

describe('Actions', () => {
    @State<number>({
        name: 'counter',
        defaults: 0
    })
    class CounterState {
        @Receiver()
        public static increment({ setState, getState }: StateContext<number>) {
            setState(getState() + 1);
        }

        @Receiver()
        public static decrement({ setState, getState }: StateContext<number>) {
            setState(getState() - 1);
        }

        @Receiver()
        public static multiplyBy2({ setState, getState }: StateContext<number>) {
            setState(getState() * 2);
        }

        @Receiver()
        public static throwError() {
            return throwError(new Error('Whoops!'));
        }
    }

    @Component({
        template: ''
    })
    class MockComponent {
        @Emitter(CounterState.increment)
        public increment?: Emittable<void | number>;

        @Emitter(CounterState.decrement)
        public decrement?: Emittable<void>;

        @Emitter(CounterState.multiplyBy2)
        public multiplyBy2?: Emittable<void>;

        @Emitter(CounterState.throwError)
        public throwError?: Emittable<void>;
    }

    it('should intercept custom action that is defined in the @Receiver() decorator', () => {
        class Increment {
            public static type = '[Counter] Increment';
        }

        class Decrement {
            public static type = '[Counter] Decrement';
        }

        class MultiplyBy2 {
            public static type = '[Counter] Multiply by 2';
        }

        @State<number>({
            name: 'counter',
            defaults: 0
        })
        class CounterStateWithCustomActions {
            @Receiver({
                action: Increment
            })
            public static increment({ setState, getState }: StateContext<number>) {
                setState(getState() + 1);
            }

            @Receiver({
                action: Decrement
            })
            public static decrement({ setState, getState }: StateContext<number>) {
                setState(getState() - 1);
            }

            @Receiver({
                action: MultiplyBy2
            })
            public static multiplyBy2({ setState, getState }: StateContext<number>) {
                setState(getState() * 2);
            }
        }

        TestBed.configureTestingModule({
            imports: [
                NgxsModule.forRoot([CounterStateWithCustomActions]),
                NgxsEmitPluginModule.forRoot()
            ]
        });

        const store: Store = TestBed.get(Store);
        const actions$: Actions = TestBed.get(Actions);

        actions$.pipe(
            ofActionDispatched(Increment)
        ).subscribe((action) => {
            expect(action.constructor).toBe(Increment);
        });

        store.dispatch(new Increment());
        store.dispatch(new Decrement());
        store.dispatch(new MultiplyBy2());
    });

    it('should intercept only CounterState.increment emitter', () => {
        TestBed.configureTestingModule({
            imports: [
                NgxsModule.forRoot([CounterState]),
                NgxsEmitPluginModule.forRoot()
            ],
            declarations: [
                MockComponent
            ]
        });

        const fixture = TestBed.createComponent(MockComponent);
        const actions$: Actions = TestBed.get(Actions);

        actions$.pipe(
            ofEmittableDispatched(CounterState.increment)
        ).subscribe(({ type, payload }: OfEmittableActionContext<number>) => {
            expect(type).toBe('CounterState.increment');
            expect(payload).toBe(20);
        });

        fixture.componentInstance.decrement!.emit();
        fixture.componentInstance.increment!.emit(20);
        fixture.componentInstance.multiplyBy2!.emit();
    });

    it('should intercept errored emitter', () => {
        TestBed.configureTestingModule({
            imports: [
                NgxsModule.forRoot([CounterState]),
                NgxsEmitPluginModule.forRoot()
            ],
            declarations: [
                MockComponent
            ]
        });

        const fixture = TestBed.createComponent(MockComponent);
        const actions$: Actions = TestBed.get(Actions);

        actions$.pipe(
            ofEmittableErrored(CounterState.throwError)
        ).subscribe(({ type, payload }: OfEmittableActionContext<void>) => {
            expect(type).toBe('CounterState.throwError');
            expect(payload).toBe(undefined);
        });

        fixture.componentInstance.increment!.emit();
        fixture.componentInstance.decrement!.emit();
        fixture.componentInstance.throwError!.emit();
        fixture.componentInstance.multiplyBy2!.emit();
    });
});