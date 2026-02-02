<script>
  import { weeklyPlan } from '../stores/weeklyPlanStore.js';
  import { navigate } from '../router.js';

  let expandedMeals = new Set();

  const formatDateLabel = (dateISO) => {
    if (!dateISO) return '';
    const d = new Date(`${dateISO}T12:00:00`);
    return Number.isNaN(d.getTime()) ? dateISO : d.toLocaleDateString('de-DE');
  };

  const MEAL_TYPE_LABELS = {
    'pre-workout': 'Vor dem Training',
    'post-workout': 'Nach dem Training',
    snack: 'Snack',
    normal: 'Normal'
  };

  const formatMealType = (value) => MEAL_TYPE_LABELS[value] ?? value ?? '';

  function toggleMeal(key) {
    const next = new Set(expandedMeals);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    expandedMeals = next;
  }

  $: rawPlan = Array.isArray($weeklyPlan) ? $weeklyPlan : ($weeklyPlan?.week ?? []);
  $: normalizedPlan = (rawPlan ?? []).map(entry => {
    if (!entry) return entry;
    if (entry.snack && !(entry.meals ?? []).some(m => m?.id === entry.snack?.id && m?.title === entry.snack?.title)) {
      return {
        ...entry,
        meals: [...(entry.meals ?? []), entry.snack]
      };
    }
    return entry;
  });
  $: sortedPlan = (normalizedPlan ?? []).slice().sort((a, b) => (a?.date ?? '').localeCompare(b?.date ?? ''));
</script>

<style>
  .plan-page {
    padding-top: 67px;
    padding-bottom: 50px;
  }

  .plan-header { margin-bottom: 0.75rem; }
  .plan-day { display: flex; flex-direction: column; gap: 0.75rem; }
  .plan-day-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    background: none;
    border: none;
    padding: 0;
    text-align: left;
    cursor: pointer;
  }
  .plan-day-title { color: var(--text); }
  .plan-day-date { color: var(--muted); }
  .plan-divider {
    height: 1px;
    background: rgba(0,0,0,.08);
    margin: 1.5rem 0;
    width: 100vw;
    margin-left: calc(50% - 50vw);
  }
  .plan-day-divider {
    height: 1px;
    background: rgba(0,0,0,.08);
    margin: 0.75rem 0 1rem 0;
    width: 100vw;
    margin-left: calc(50% - 50vw);
  }
  .plan-meals { display: flex; flex-direction: column; gap: 0.75rem; }
  .plan-meal-row { display: flex; align-items: center; gap: 0.75rem; }
  .plan-meal-thumb { width: 48px; height: 48px; border-radius: 999px; background: var(--muted); overflow: hidden; flex-shrink: 0; }
  .plan-meal-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .plan-meal-info { flex: 1; }
  .plan-meal-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .plan-meal-list-row { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
  .plan-meal-title { flex: 1; }
  .plan-chevron { width: 20px; height: 20px; color: var(--muted); }
  .plan-meal-toggle { background: none; border: none; padding: 0; cursor: pointer; display: grid; place-items: center; }
  .plan-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 0.75rem; }
  .plan-secondary {
    width: 100%;
    border-radius: 999px;
    border: 1px solid rgba(0,0,0,.15);
    background: #fff;
    padding: 0.85rem 1rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,.08);
  }
</style>

<main class="page-container plan-page">
  <section class="section">
    <header class="plan-header">
      <h1 class="t-hero">Mahlzeitenplan</h1>
      <p class="t-meta">Sieh dir deinen gesamten Plan an.</p>
    </header>

    {#if sortedPlan?.length}
      {#each sortedPlan as day, idx}
        {@const key = day?.date ?? `${day?.day ?? 'day'}-${idx}`}
        <div class="plan-day">
          <div class="plan-day-head">
            <span class="t-title plan-day-title">{day?.day ?? 'Tag'}</span>
            <span class="t-meta plan-day-date">{formatDateLabel(day?.date)}</span>
          </div>

          <div class="plan-day-divider"></div>

          <div class="plan-meal-list">
            {#each day.meals ?? [] as meal, mealIdx}
              {@const mealKey = `${key}-${meal?.id ?? mealIdx}`}
              <div class="plan-meal-list-row">
                <div class="t-input plan-meal-title">{meal.title}</div>
                <button class="plan-meal-toggle" type="button" on:click={() => toggleMeal(mealKey)} aria-expanded={expandedMeals.has(mealKey)}>
                  <svg class="plan-chevron" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" fill="currentColor" />
                  </svg>
                </button>
              </div>

              {#if expandedMeals.has(mealKey)}
                <div class="plan-meal-row">
                  <div class="plan-meal-thumb" aria-hidden={!meal.image}>
                    {#if meal.image}
                      <img src={meal.image} alt={meal.title} loading="lazy" />
                    {/if}
                  </div>
                  <div class="plan-meal-info">
                    <div class="t-meta">{formatMealType(meal.type)}</div>
                    {#if meal.macros}
                      <div class="t-meta">
                        {meal.macros.calories} kcal / {meal.macros.protein}g P / {meal.macros.carbs}g K / {meal.macros.fat}g F
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        {#if idx < sortedPlan.length - 1}
          <div class="plan-divider"></div>
        {/if}
      {/each}
    {:else}
      <p class="t-meta">Noch kein Plan gespeichert. Erstelle zuerst einen Plan im Meal Generator.</p>
    {/if}

    <div class="plan-divider"></div>
    <div class="plan-actions">
      <button class="plan-secondary" type="button" on:click={() => navigate('/profile')}>Zurück</button>
    </div>
  </section>
</main>
