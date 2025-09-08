import { createFeatureSelector, createSelector } from '@ngrx/store';
import { GuestState } from './guest.state';

// Feature selector for the guest state
export const selectGuestState = createFeatureSelector<GuestState>('guest');

// Selector for the entire guest state (useful for effects)
export const selectGuest = createSelector(selectGuestState, (state) => state);
