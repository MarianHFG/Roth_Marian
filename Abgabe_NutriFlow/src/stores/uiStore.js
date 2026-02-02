import { writable } from 'svelte/store';

export const calendarOpen = writable(false);

export function openCalendar() {
  calendarOpen.set(true);
}

export function closeCalendar() {
  calendarOpen.set(false);
}

export function toggleCalendar() {
  calendarOpen.update(v => !v);
}
