import { writable } from 'svelte/store';
import { loadFromLocalStorage, saveToLocalStorage } from './_storage.js';

const defaultProfileSettings = {
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
  mealsPerDay: 3,
  includeSnack: false,
  isVegetarian: false
};

const initialProfileSettings = loadFromLocalStorage('profileSettings', defaultProfileSettings);
export const profileSettings = writable(initialProfileSettings);

profileSettings.subscribe(value => {
  saveToLocalStorage('profileSettings', value);
});

export function setProfileSettings(partial) {
  profileSettings.update(current => ({
    ...current,
    ...partial
  }));
}
