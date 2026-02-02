import { writable } from 'svelte/store';
import page from 'page';

// Store für aktuelle Route
export const currentRoute = writable('landing');
export const routeParams = writable({});

// Route Definitionen
export function initRouter() {
  page('/', () => {
    currentRoute.set('landing');
    routeParams.set({});
  });

  page('/meal', () => {
    currentRoute.set('meal');
    routeParams.set({});
  });

  page('/profile', () => {
    currentRoute.set('profile');
    routeParams.set({});
  });

  page('/calorie', () => {
    currentRoute.set('calorie');
    routeParams.set({});
  });

  page('/training', () => {
    currentRoute.set('training');
    routeParams.set({});
  });

  page('/plan', () => {
    currentRoute.set('plan');
    routeParams.set({});
  });

  // Fallback auf landing page
  page('*', () => {
    currentRoute.set('landing');
    routeParams.set({});
  });

  page.start();
}

// Navigation Helper
export function navigate(route) {
  page.show(route);
}
