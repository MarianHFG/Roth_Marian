<script>
import { profileSettings } from '../stores/profileStore.js';
import { trainingSettings } from '../stores/trainingStore.js';
import { savedMeals, addMeal } from '../stores/savedMealsStore.js';
import { setWeeklyPlan } from '../stores/weeklyPlanStore.js';
import { INGREDIENTS_DE } from '../data/ingredients_de.js';


let weeklyPlan = null;
let step = 1;
let expandedDays = new Set();
let expandedMeals = new Set();

const clampNonNegative = (value) => Math.max(0, value);
const roundInt = (value) => Math.round(value);
const toDateInputValue = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (dateISO) => {
  if (!dateISO) return '';
  const d = new Date(`${dateISO}T12:00:00`);
  return Number.isNaN(d.getTime()) ? dateISO : d.toLocaleDateString('de-DE');
};

// only options that belong to the generator page
let mealsPerDay = $profileSettings.mealsPerDay ?? 3;
let includeSnack = $profileSettings.includeSnack ?? false;

let calories = clampNonNegative(roundInt($profileSettings.calories ?? 0));
let protein = clampNonNegative(roundInt($profileSettings.protein ?? 0));
let carbs = clampNonNegative(roundInt($profileSettings.carbs ?? 0));
let fat = clampNonNegative(roundInt($profileSettings.fat ?? 0));

let startDate = toDateInputValue(new Date());
let weeksCount = 1;

let inventory = [];
let inventoryInput = "";

const normalize = (value) => String(value || '').trim().toLowerCase();

const MEAL_TYPE_LABELS = {
  'pre-workout': 'Vor dem Training',
  'post-workout': 'Nach dem Training',
  snack: 'Snack',
  normal: 'Normal'
};

const formatMealType = (value) => MEAL_TYPE_LABELS[value] ?? value ?? '';

$: inventoryQuery = normalize(inventoryInput);
$: suggestions = inventoryQuery.length >= 2
  ? INGREDIENTS_DE
      .filter(item => {
        const normalized = normalize(item.label);
        return normalized.startsWith(inventoryQuery) || normalized.includes(inventoryQuery);
      })
      .slice(0, 8)
  : [];

function adjustMealsPerDay(delta) {
  const current = Number(mealsPerDay) || 2;
  mealsPerDay = Math.min(5, Math.max(2, current + delta));
}

function nextStep() {
  if (step === 1) {
    if (calories <= 0 && protein <= 0 && carbs <= 0 && fat <= 0) {
      alert('Bitte setze deine Zielwerte, bevor du fortfährst.');
      return;
    }
  }
  step++;
}

function previousStep() {
  step--;
}

function addIngredient(item) {
  const nextItem = item || suggestions[0];
  if (!nextItem) return;
  const alreadyExists = inventory.some(entry => entry.key === nextItem.key);
  if (!alreadyExists) {
    inventory = [...inventory, nextItem];
  }
  inventoryInput = "";
}

function handleInventoryKeydown(event) {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  if (suggestions.length) {
    addIngredient(suggestions[0]);
  }
}

function removeIngredient(index) {
  inventory = inventory.filter((_, i) => i !== index);
}

function toggleDay(dayKey) {
  const next = new Set(expandedDays);
  if (next.has(dayKey)) {
    next.delete(dayKey);
  } else {
    next.add(dayKey);
  }
  expandedDays = next;
}

function toggleMeal(key) {
  const next = new Set(expandedMeals);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  expandedMeals = next;
}

function adjustCalories(delta) {
  const prevCalories = calories;
  calories = clampNonNegative(roundInt(calories + delta));
  const deltaKcal = calories - prevCalories;
  if (deltaKcal !== 0) {
    const deltaCarbs = roundInt(deltaKcal / 4);
    carbs = clampNonNegative(roundInt(carbs + deltaCarbs));
  }
}

function adjustMacro(type, delta) {
  if (type === 'protein') protein = clampNonNegative(roundInt(protein + delta));
  if (type === 'carbs') carbs = clampNonNegative(roundInt(carbs + delta));
  if (type === 'fat') fat = clampNonNegative(roundInt(fat + delta));
  calories = clampNonNegative(roundInt(protein * 4 + carbs * 4 + fat * 9));
}

function adjustWeeks(delta) {
  weeksCount = Math.min(3, Math.max(1, weeksCount + delta));
}

$: endDate = (() => {
  if (!startDate) return null;
  const base = new Date(startDate);
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() + (weeksCount * 7 - 1));
  return base;
})();

$: formattedEndDate = endDate ? endDate.toLocaleDateString('de-DE') : '—';

$: normalizedPlan = (weeklyPlan ?? []).map(entry => {
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


  async function generatePlan() {
  const payload = {
    calories,
    protein,
    carbs,
    fat,
    isVegetarian: $profileSettings.isVegetarian ?? false,
    mealsPerDay: Number(mealsPerDay),
    includeSnack,
    trainingDays: $trainingSettings.trainingDays,
    trainingTime: $trainingSettings.trainingTime,
    inventory: inventory.map(item => item.key),
    startDate: startDate ? new Date(startDate).toISOString() : null,
    weeksCount
  };

  const response = await fetch("http://localhost:3000/api/generate-weekly-plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  weeklyPlan = data.week ?? null;
  setWeeklyPlan(weeklyPlan);
}

async function generatePlanAndGo() {
  await generatePlan();
  step = 3;
}

</script>

<style>
  .mg-page {
    --pad: 20px;
    --gap-tight: 5px;
    --gap-cta: 20px;
    --gap-item: 30px;
    --gap-divider: 30px;
    --cc-border: 3px solid rgba(0,0,0,.12);
    --cc-shadow: 0 2px 6px rgba(0,0,0,.08);
    --cc-radius: 999px;
    --cc-pill-radius: 999px;
    padding-inline: var(--pad);
    padding-top: 67px;
    padding-bottom: 50px;
  }

  .form-field { display: flex; flex-direction: column; }
  .checkbox { display:flex; align-items:center; gap:0.5rem; }
  .result-grid { display:flex; flex-direction:column; gap:0.5rem; }

  .mg-header { margin-bottom: var(--gap-cta); }
  .mg-header .t-section + .t-meta { margin-top: var(--gap-tight); }
  .mg-section { display: flex; flex-direction: column; gap: var(--gap-cta); }
  .mg-section .t-section + .t-meta { margin-top: var(--gap-tight); }
  .mg-divider { height: 1px; background: rgba(0,0,0,.08); margin: var(--gap-divider) 0; width: 100vw; margin-left: calc(50% - 50vw); }
  .mg-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap-item); }
  .mg-card { padding: 0; border: none; border-radius: 0; background: transparent; box-shadow: none; display: flex; flex-direction: column; gap: var(--gap-tight); }
  .mg-card-label { color: var(--muted); }
  .mg-card-value { display: flex; align-items: baseline; justify-content: center; gap: 0.35rem; width: 100%; }
  .mg-card-value .t-section { font-weight: 700; }
  .mg-stepper { display: grid; grid-template-columns: 28px 1fr 28px; align-items: center; gap: 0.35rem; padding: 0.55rem 0.75rem; border: var(--cc-border); border-radius: var(--cc-radius); background: #fff; box-shadow: var(--cc-shadow); }
  .mg-stepper--bare { border: 0; background: transparent; box-shadow: none; padding: 0; }
  .mg-stepper--compact { max-width: 150px; }
  .mg-stepper--wide { max-width: 200px; }
  .mg-step-btn { width: 26px; height: 26px; border-radius: 999px; border: var(--cc-border); background: #fff; color: transparent; font-weight: 700; cursor: pointer; display: grid; place-items: center; line-height: 1; padding: 0; position: relative; }
  .mg-step-btn::before { content: attr(data-symbol); color: #000; font-size: 16px; font-weight: 700; line-height: 1; display: block; transform: translateY(2px); }
  .mg-step-label { text-align: center; }
  .mg-chip-row { display: flex; flex-wrap: wrap; gap: 10px; }
  .mg-chip { padding: 0.45rem 0.85rem; border-radius: var(--cc-pill-radius); border: var(--cc-border); background: #fff; color: var(--text); box-shadow: var(--cc-shadow); }
  .mg-date-row { display: flex; flex-direction: column; gap: var(--gap-item); }
  .mg-date-pill { display: grid; grid-template-columns: 28px 1fr 20px; align-items: center; gap: 0.5rem; padding: 0.55rem 0.75rem; border-radius: 10px; border: var(--cc-border); background: #fff; box-shadow: var(--cc-shadow); }
  .mg-date-pill img { width: 20px; height: 20px; display: block; }
  .mg-date-input { width: 100%; border: none; background: transparent; font: inherit; color: var(--text); padding: 0; outline: none; }
  .mg-date-input::-webkit-calendar-picker-indicator { opacity: 0; display: none; }
  .mg-weeks-row { display: flex; flex-direction: column; gap: var(--gap-item); }
  .mg-weeks-pill { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 0.5rem; padding: 0.55rem 0.75rem; border-radius: var(--cc-radius); border: var(--cc-border); background: #fff; box-shadow: var(--cc-shadow); }
  .mg-weeks-pill .mg-stepper { background: transparent; border: 0; box-shadow: none; padding: 0; }
  .mg-weeks-label { display: flex; align-items: center; }
  .mg-primary { width: 100%; padding: 0.9rem 1rem; border-radius: 999px; border: none; background: #bfe37a; color: #fff; font-weight: 600; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,.12); }
  .mg-secondary { width: 100%; padding: 0.9rem 1rem; border-radius: 999px; border: 1px solid rgba(0,0,0,.15); background: #fff; color: var(--text); font-weight: 600; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,.08); }
  .mg-pill { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.55rem 0.75rem; border-radius: var(--cc-pill-radius); border: var(--cc-border); background: #fff; box-shadow: var(--cc-shadow); }
  .mg-pill-label { flex: 1; }
  .mg-toggle {
    width: 48px;
    height: 24px;
    border-radius: 999px;
    background: #f0f0f0;
    position: relative;
    display: inline-block;
  }

  .mg-toggle-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    margin: 0;
    cursor: pointer;
  }

  .mg-toggle-knob {
    position: absolute;
    top: 0;
    left: 0;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: #9e9e9e;
    transition: transform 180ms ease, background 180ms ease;
  }

  .mg-toggle-input:checked + .mg-toggle-knob {
    transform: translateX(24px);
    background: #bfe37a;
  }
  .mg-input-pill { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.75rem; border-radius: 10px; border: var(--cc-border); background: #fff; box-shadow: var(--cc-shadow); }
  .mg-input-pill img { width: 20px; height: 20px; display: block; }
  .mg-search-input { flex: 1; border: none; background: transparent; outline: none; }
  .mg-icon-btn { width: 28px; height: 28px; border-radius: 999px; border: 1px solid rgba(0,0,0,.2); background: #fff; color: #000; cursor: pointer; display: grid; place-items: center; }
  .mg-chip-list { display: flex; flex-wrap: wrap; gap: var(--gap-item); }
  .mg-chip--removable { display: inline-flex; align-items: center; gap: 0.4rem; }
  .mg-chip-remove { width: 22px; height: 22px; border-radius: var(--cc-pill-radius); border: var(--cc-border); background: #fff; color: #000; cursor: pointer; line-height: 1; display: grid; place-items: center; box-shadow: var(--cc-shadow); }
  .mg-suggestions { margin-top: var(--gap-cta); display: flex; flex-direction: column; gap: var(--gap-item); }
  .mg-suggestion-item {
    text-align: left;
    border-radius: 10px;
    border: var(--cc-border);
    background: #fff;
    padding: 0.45rem 0.75rem;
    cursor: pointer;
    box-shadow: var(--cc-shadow);
  }
  .plan-day { display: flex; flex-direction: column; gap: var(--gap-item); }
  .plan-day-head { display: flex; align-items: center; justify-content: space-between; gap: var(--gap-item); background: none; border: none; padding: 0; text-align: left; }
  .plan-day-title { color: var(--text); }
  .plan-day-date { color: var(--muted); }
  .plan-divider { height: 1px; background: rgba(0,0,0,.08); margin: var(--gap-divider) 0; width: 100vw; margin-left: calc(50% - 50vw); }
  .plan-day-divider { height: 1px; background: rgba(0,0,0,.08); margin: var(--gap-divider) 0; width: 100vw; margin-left: calc(50% - 50vw); }
  .plan-meal-list { display: flex; flex-direction: column; gap: var(--gap-item); }
  .plan-meal-list-row { display: flex; align-items: center; justify-content: space-between; gap: var(--gap-item); }
  .plan-meal-title { flex: 1; }
  .plan-chevron { width: 20px; height: 20px; color: var(--muted); }
  .plan-meal-toggle { background: none; border: none; padding: 0; cursor: pointer; display: grid; place-items: center; }
  .plan-meal-row { display: flex; align-items: center; gap: var(--gap-item); }
  .plan-meal-thumb { width: 48px; height: 48px; border-radius: 999px; background: var(--muted); overflow: hidden; flex-shrink: 0; }
  .plan-meal-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .plan-meal-info { flex: 1; }

  .nav { display:flex; justify-content:space-between; align-items:center; gap: var(--gap-cta); margin-top: var(--gap-cta); }

  @media (max-width: 360px) {
    .mg-grid { grid-template-columns: 1fr; }
  }
</style>


<!-- ALLE Steps gehören in DIESEN Block -->
  <main class="page-container mg-page">
    <div class="step">
      <div class="content section">

        {#if step === 1}
          <section class="section">
            <header class="mg-header">
              <h2 class="t-section">Tägliche Zielwerte</h2>
              <p class="t-meta">Passe deine Werte nach Belieben an</p>
            </header>

            <div class="mg-section">
              <div>
                
            
              </div>

              <div class="mg-grid">
                <div class="mg-card">
                  <div class="t-meta mg-card-label">Kalorien</div>
                  <div class="mg-card-value">
                    <span class="t-section">{calories}</span>
                    <span class="t-meta">kcal</span>
                  </div>
                  <div class="mg-stepper mg-stepper--compact">
                    <button class="mg-step-btn" type="button" aria-label="Minus" data-symbol="−" on:click={() => adjustCalories(-100)}>−</button>
                    <div class="mg-step-label t-meta">100 kcal</div>
                    <button class="mg-step-btn" type="button" aria-label="Plus" data-symbol="+" on:click={() => adjustCalories(100)}>+</button>
                  </div>
                </div>

                <div class="mg-card">
                  <div class="t-meta mg-card-label">Eiweiß</div>
                  <div class="mg-card-value">
                    <span class="t-section">{protein}</span>
                    <span class="t-meta">g</span>
                  </div>
                  <div class="mg-stepper mg-stepper--compact">
                    <button class="mg-step-btn" type="button" aria-label="Minus" data-symbol="−" on:click={() => adjustMacro('protein', -10)}>−</button>
                    <div class="mg-step-label t-meta">10 g</div>
                    <button class="mg-step-btn" type="button" aria-label="Plus" data-symbol="+" on:click={() => adjustMacro('protein', 10)}>+</button>
                  </div>
                </div>

                <div class="mg-card">
                  <div class="t-meta mg-card-label">Kohlenhydrate</div>
                  <div class="mg-card-value">
                    <span class="t-section">{carbs}</span>
                    <span class="t-meta">g</span>
                  </div>
                  <div class="mg-stepper mg-stepper--compact">
                    <button class="mg-step-btn" type="button" aria-label="Minus" data-symbol="−" on:click={() => adjustMacro('carbs', -10)}>−</button>
                    <div class="mg-step-label t-meta">10 g</div>
                    <button class="mg-step-btn" type="button" aria-label="Plus" data-symbol="+" on:click={() => adjustMacro('carbs', 10)}>+</button>
                  </div>
                </div>

                <div class="mg-card">
                  <div class="t-meta mg-card-label">Fette</div>
                  <div class="mg-card-value">
                    <span class="t-section">{fat}</span>
                    <span class="t-meta">g</span>
                  </div>
                  <div class="mg-stepper mg-stepper--compact">
                    <button class="mg-step-btn" type="button" aria-label="Minus" data-symbol="−" on:click={() => adjustMacro('fat', -10)}>−</button>
                    <div class="mg-step-label t-meta">10 g</div>
                    <button class="mg-step-btn" type="button" aria-label="Plus" data-symbol="+" on:click={() => adjustMacro('fat', 10)}>+</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="mg-divider"></div>

            <div class="mg-section">
              <div>
                <h2 class="t-section">Training</h2>
                <p class="t-meta">Deine Trainingstage</p>
              </div>

              {#if $trainingSettings.trainingDays?.length}
                <div class="mg-chip-row">
                  {#each $trainingSettings.trainingDays as d}
                    <div class="mg-chip">{d} · {$trainingSettings.trainingTime?.[d] ?? '—'}</div>
                  {/each}
                </div>
              {:else}
                <p class="t-meta">Keine Trainingstage gesetzt …</p>
              {/if}
            </div>

            <div class="mg-divider"></div>

            <div class="mg-section">
              <div>
                <h2 class="t-section">Zeitraum</h2>
                <p class="t-meta">Zeitraum und Start festlegen</p>
              </div>

              <div class="mg-date-row">
                
                <div class="mg-date-pill">
                  <img src="/Icons/KalenderIcon.svg" alt="" aria-hidden="true" />
                  <input id="mg-start-date" class="mg-date-input t-input" type="date" bind:value={startDate} />
                </div>
              </div>

              <div class="mg-weeks-row">
               
                <div class="mg-weeks-pill">
                  <div class="mg-weeks-label t-meta">Anzahl der Wochen</div>
                  <div class="mg-stepper mg-stepper--wide">
                    <button class="mg-step-btn" type="button" aria-label="Minus" data-symbol="−" on:click={() => adjustWeeks(-1)}>−</button>
                    <div class="mg-step-label t-input">{weeksCount}</div>
                    <button class="mg-step-btn" type="button" aria-label="Plus" data-symbol="+" on:click={() => adjustWeeks(1)}>+</button>
                  </div>
                </div>
              </div>

              <p class="t-meta">Geplant bis {formattedEndDate}.</p>
            </div>

            <div class="mg-divider"></div>

            <button class="mg-primary" type="button" on:click={() => (step = 2)}>Nächster Schritt</button>
          </section>
        {/if}

{#if step === 2}
  <section class="section">
    <header class="mg-header">
      <h2 class="t-section">Mahlzeiten und Snack</h2>
      <p class="t-meta">Lege fest, wie oft du täglich isst</p>
    </header>

    <div class="mg-section">
      <div class="mg-pill">
        <div class="mg-pill-label t-input">Anzahl an Mahlzeiten</div>
        <div class="mg-stepper mg-stepper--wide mg-stepper--bare">
          <button class="mg-step-btn" type="button" aria-label="Minus" data-symbol="−" on:click={() => adjustMealsPerDay(-1)}>−</button>
          <div class="mg-step-label t-input">{mealsPerDay}</div>
          <button class="mg-step-btn" type="button" aria-label="Plus" data-symbol="+" on:click={() => adjustMealsPerDay(1)}>+</button>
        </div>
      </div>

      <div class="mg-pill">
        <span class="t-input">1 Snack pro Tag hinzufügen</span>
        <label class="mg-toggle">
          <input
            class="mg-toggle-input"
            type="checkbox"
            bind:checked={includeSnack}
            aria-label="1 Snack pro Tag hinzufügen"
          />
          <span class="mg-toggle-knob" aria-hidden="true"></span>
        </label>
      </div>
    </div>

    <div class="mg-divider"></div>

    <div class="mg-section">
      <div>
        <h2 class="t-section">Vorrätige Lebensmittel</h2>
        <p class="t-meta">Gib an, was du zu hause hast</p>
      </div>

      <div class="mg-input-pill">
        <img src="/Icons/LupeIcon.svg" alt="" aria-hidden="true" />
        <input
          class="mg-search-input t-input"
          type="text"
          placeholder="z. B. Hähnchen"
          bind:value={inventoryInput}
          on:keydown={handleInventoryKeydown}
        />
        <button class="mg-icon-btn" type="button" on:click={() => addIngredient(suggestions[0])}>+</button>
      </div>

      {#if suggestions.length}
        <div class="mg-suggestions" role="listbox" aria-label="Suggestions">
          {#each suggestions as suggestion}
            <button class="mg-suggestion-item t-input" type="button" on:click={() => addIngredient(suggestion)}>
              {suggestion.label}
            </button>
          {/each}
        </div>
      {/if}

      {#if inventory.length}
        <div class="mg-chip-list">
          {#each inventory as item, index}
            <div class="mg-chip mg-chip--removable">
              <span class="t-input">{item.label}</span>
              <button class="mg-chip-remove" type="button" on:click={() => removeIngredient(index)} aria-label="Entfernen">×</button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>
{/if}






      </div>

      {#if step === 2}
        <div class="mg-divider"></div>
        <div class="nav" style="flex-direction: column; align-items: flex-start; gap: 0.75rem;">
          <button class="mg-primary" type="button" on:click={generatePlanAndGo}>Plan generieren</button>
          <button class="mg-secondary" type="button" on:click={previousStep}>Zurück</button>
        </div>
      {/if}

      {#if step === 3}
        <section class="section">
          <header class="mg-header">
            <h2 class="t-section">Dein Wochenplan</h2>
            <p class="t-meta">Tippe auf einen Tag, um Details zu sehen.</p>
          </header>

          {#if sortedPlan?.length}
            {#each sortedPlan as day, dayIndex}
              {@const key = day?.date ?? `${day?.day ?? 'day'}-${dayIndex}`}
              <div class="plan-day">
                <div class="plan-day-head">
                  <span class="t-title plan-day-title">{day?.day ?? 'Tag'}</span>
                  <span class="t-meta plan-day-date">{formatDateLabel(day?.date)}</span>
                </div>

                <div class="plan-day-divider"></div>

                <div class="plan-meal-list">
                  {#each day.meals ?? [] as meal, mealIndex}
                    {@const mealKey = `${key}-${meal?.id ?? mealIndex}`}
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

              {#if dayIndex < sortedPlan.length - 1}
                <div class="plan-divider"></div>
              {/if}
            {/each}
          {:else}
            <p class="t-meta">Noch kein Plan generiert.</p>
          {/if}

          <div class="plan-divider"></div>
          <div class="nav" style="flex-direction: column; align-items: flex-start; gap: 0.75rem;">
            <button class="mg-secondary" type="button" on:click={previousStep}>Zurück</button>
          </div>
        </section>
      {/if}

    </div>

  </main>



