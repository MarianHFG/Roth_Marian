import { writable } from 'svelte/store';
import { loadFromLocalStorage, saveToLocalStorage } from './_storage.js';

const defaultTrainingSettings = {
  trainingDays: [],
  trainingTime: {
    Mon: '18:00',
    Tue: '18:00',
    Wed: '18:00',
    Thu: '18:00',
    Fri: '18:00',
    Sat: '18:00',
    Sun: '18:00'
  }
};

function normalizeTrainingSettings(value) {
  const trainingDays = Array.isArray(value?.trainingDays) ? value.trainingDays : [];
  const trainingTime = {
    ...defaultTrainingSettings.trainingTime,
    ...(value?.trainingTime || {})
  };

  // Wenn keine Trainingstage gesetzt sind, Default-Zeiten aus dem Store verwenden
  return {
    trainingDays,
    trainingTime: trainingDays.length ? trainingTime : { ...defaultTrainingSettings.trainingTime }
  };
}

const initialTrainingSettings = normalizeTrainingSettings(
  loadFromLocalStorage('trainingSettings', defaultTrainingSettings)
);
export const trainingSettings = writable(initialTrainingSettings);

trainingSettings.subscribe(value => {
  saveToLocalStorage('trainingSettings', value);
});

export function setTrainingSettings(partial) {
  trainingSettings.update(current => ({
    ...current,
    ...partial
  }));
}
