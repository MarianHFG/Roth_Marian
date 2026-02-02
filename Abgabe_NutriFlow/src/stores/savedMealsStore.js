import { writable } from 'svelte/store';
import { loadFromLocalStorage, saveToLocalStorage } from './_storage.js';

const initialSavedMeals = loadFromLocalStorage('savedMeals', []);
export const savedMeals = writable(initialSavedMeals);

savedMeals.subscribe(value => {
  saveToLocalStorage('savedMeals', value);
});

export function addMeal(meal) {
  if (!meal || !meal.id) return;
  savedMeals.update(list => {
    if (list.some(m => m.id === meal.id)) return list;
    return [...list, meal];
  });
}

export function removeMeal(id) {
  if (!id) return;
  savedMeals.update(list => list.filter(m => m.id !== id));
}

export function isSaved(id) {
  if (!id) return false;
  let found = false;
  const unsub = savedMeals.subscribe(list => {
    found = list.some(m => m.id === id);
  });
  unsub();
  return found;
}
