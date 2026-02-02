import { writable } from 'svelte/store';

const KEY = 'weeklyPlan';

function load() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('weeklyPlan load failed:', e);
    return null;
  }
}

function save(value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch (e) {
    console.error('weeklyPlan save failed:', e);
  }
}

export const weeklyPlan = writable(load());

weeklyPlan.subscribe((v) => save(v));

export function setWeeklyPlan(plan) {
  weeklyPlan.set(plan);
}

export function clearWeeklyPlan() {
  weeklyPlan.set(null);
}
