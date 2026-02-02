<script>
  import { setProfileSettings } from '../stores/profileStore.js';
  import { onMount } from 'svelte';
  import { navigate } from '../router.js';
	
  const STORAGE_KEY = 'calorieCalculatorForm';
  let hydrated= false;

  let age = 30;
  let weight = 70; // kg
  let height = 175; // cm
  let gender = 'male';
  let activity = 1.55; // moderate by default
  let goal = 'maintain'; // currently not used in calculation (ok for later)
  let step = 1;

  let manualCalories = null;
  let manualProtein = null;
  let manualCarbs = null;
  let manualFat = null;

onMount(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    age = data.age ?? age;
    weight = data.weight ?? weight;
    height = data.height ?? height;
    gender = data.gender ?? gender;
    activity = data.activity ?? activity;
    goal = data.goal ?? goal;
    adjustment = data.adjustment ?? adjustment;
  } catch (e) {
    console.error('Failed to load calorie calculator form:', e);
  } finally {
	hydrated = true;
  }
});


const activities = [
    { label: 'Sitzend (wenig/keine Aktivität)', value: 1.2 },
    { label: 'Leicht aktiv (1–3 Tage/Woche)', value: 1.375 },
    { label: 'Mäßig aktiv (3–5 Tage/Woche)', value: 1.55 },
    { label: 'Sehr aktiv (6–7 Tage/Woche)', value: 1.725 },
    { label: 'Extra aktiv (sehr hartes Training)', value: 1.9 }
  ];

  // BMR (Mifflin-St Jeor)
  $: bmr = gender === 'male'
    ? 10 * Number(weight) + 6.25 * Number(height) - 5 * Number(age) + 5
    : 10 * Number(weight) + 6.25 * Number(height) - 5 * Number(age) - 161;

  $: tdee = Math.round(bmr * Number(activity));

  let adjustment = 0; // kcal
  $: adjustedCalories = tdee + Number(adjustment);

  $: canIncrease = Number(adjustment) < 1000;
  $: canDecrease = Number(adjustment) > -1000;

  // Macros
  $: gramsProtein = Math.round(Number(weight) * 2);
  $: gramsFat = Math.round(Number(weight) * 0.8);

  $: kcalProtein = gramsProtein * 4;
  $: kcalFat = gramsFat * 9;

  $: remainingCalories = adjustedCalories - (kcalProtein + kcalFat);
  $: kcalCarbs = remainingCalories > 0 ? Math.round(remainingCalories) : 0;
  $: gramsCarbs = Math.round(kcalCarbs / 4);
  $: lowCalories = remainingCalories < 0;

  function reset() {
    age = 30;
    weight = 70;
    height = 175;
    gender = 'male';
    activity = 1.55;
    adjustment = 0;
  }

  function changeCalories(delta) {
    const next = Number(adjustment) + delta;
    adjustment = Math.max(-1000, Math.min(1000, next));
  }

  function saveToProfile() {
    setProfileSettings({
      calories: Number(manualCalories ?? adjustedCalories) || 0,
      protein: Number(manualProtein ?? gramsProtein) || 0,
      carbs: Number(manualCarbs ?? gramsCarbs) || 0,
      fat: Number(manualFat ?? gramsFat) || 0
    });
  }

  function goToResults() {
    manualCalories = adjustedCalories;
    manualProtein = gramsProtein;
    manualCarbs = gramsCarbs;
    manualFat = gramsFat;
    step = 2;
  }

  function changeTargetCalories(delta) {
    if (manualCalories === null || manualCarbs === null) return;
    const next = Math.max(0, Number(manualCalories) + delta);
    const deltaCarbs = Math.round((next - Number(manualCalories)) / 4);
    manualCalories = next;
    manualCarbs = Math.max(0, Number(manualCarbs) + deltaCarbs);
  }

  function changeTargetMacro(key, delta) {
    if (manualProtein === null || manualCarbs === null || manualFat === null) return;
    if (key === 'protein') manualProtein = Math.max(0, Number(manualProtein) + delta);
    if (key === 'carbs') manualCarbs = Math.max(0, Number(manualCarbs) + delta);
    if (key === 'fat') manualFat = Math.max(0, Number(manualFat) + delta);
    manualCalories = Math.max(0, Math.round(manualProtein * 4 + manualCarbs * 4 + manualFat * 9));
  }

$: if (hydrated) {
  const data = { age, weight, height, gender, activity, goal, adjustment };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save calorie calculator form:', e);
  }
}



</script>


<style>
  .cc-page {
    --pad: 20px;
    --gap-tight: 5px;
    --gap-cta: 20px;
    --gap-item: 30px;
    --gap-divider: 30px;
    padding-inline: var(--pad);
     padding-top: 67px;
    padding-bottom: 50px;
  }

  .cc-divider {
    height: 1px;
    background: rgba(0,0,0,.08);
    margin: var(--gap-divider) 0;
    width: 100vw;
    margin-left: calc(var(--pad) * -1);
    margin-right: calc(var(--pad) * -1);
  }
  .form-field { display: flex; flex-direction: column; gap: var(--gap-tight); margin-bottom: var(--gap-item); }
  .form-field label { margin-bottom: 0; }
  .form-field .t-section + .t-meta,
  .form-field .t-section + p,
  header .t-section + .t-meta {
    margin-top: var(--gap-tight);
  }

  .input-pill {
    border-radius: 10px;
    border: 3px solid rgba(0,0,0,.12);
    padding: 0.7rem 0.9rem;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,.08);
  }

  .pill-row { display: flex; flex-wrap: wrap; gap: var(--gap-item); }
  .pill-row--gender { gap: 10px; }
  .pill-row--goal { gap: 10px; }
  .pill-button {
    border-radius: 999px;
    border: 3px solid rgba(0,0,0,.12);
    background: #fff;
    padding: 0.65rem 1rem;
    box-shadow: 0 2px 6px rgba(0,0,0,.08);
    cursor: pointer;
  }
  .pill-button.active {
    border-color: transparent;
    background: #bfe37a;
    color: #fff;
  }

  .stepper {
    display: grid;
    grid-template-columns: 28px 1fr 28px;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.3rem;
    border: 1px solid rgba(0,0,0,.12);
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,.08);
  }
  .stepper-btn {
    width: 26px;
    height: 26px;
    border-radius: 999px;
    border: 1px solid rgba(0,0,0,.2);
    background: #fff;
    color: #000;
    font-weight: 700;
    cursor: pointer;
    display: grid;
    place-items: center;
  }

  .cc-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap-item); }
  .cc-card { display: flex; flex-direction: column; gap: 0.35rem; }
  .cc-card-value { display: flex; align-items: baseline; justify-content: center; gap: 0.35rem; width: 100%; }

  .cc-actions { display: flex; flex-direction: column; align-items: flex-start; gap: var(--gap-cta); margin-top: var(--gap-cta); }
  .cc-actions-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap-item); width: 100%; }
  .cc-primary {
    width: 100%;
    border-radius: 999px;
    border: none;
    background: #bfe37a;
    color: #fff;
    padding: 0.9rem 1rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,.12);
  }
  .cc-secondary {
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


<main class="page-container cc-page">
  {#if step === 1}
    <section class="section">
      <header>
        <h2 class="t-section">Kalorienrechner</h2>
        <p class="t-meta">Finde deine Werte heraus</p>
      </header>

      <div class="form-field">
        <label class="t-meta">Alter</label>
        <input class="input-pill t-input" type="number" bind:value={age} min="10" placeholder="Alter" />
      </div>

      <div class="grid-2">
        <div class="form-field">
          <label class="t-meta">Gewicht</label>
          <input class="input-pill t-input" type="number" bind:value={weight} min="20" step="0.1" placeholder="Gewicht" />
        </div>
        <div class="form-field">
          <label class="t-meta">Größe</label>
          <input class="input-pill t-input" type="number" bind:value={height} min="80" step="0.1" placeholder="Größe" />
        </div>
      </div>

      <div class="form-field">
        <label class="t-meta">Geschlecht</label>
        <div class="pill-row pill-row--gender">
          <button class={`pill-button ${gender === 'male' ? 'active' : ''}`} type="button" on:click={() => (gender = 'male')}>Männlich</button>
          <button class={`pill-button ${gender === 'female' ? 'active' : ''}`} type="button" on:click={() => (gender = 'female')}>Weiblich</button>
        </div>
      </div>

      <div class="form-field">
        <label class="t-meta">Ziel</label>
        <div class="pill-row pill-row--goal">
          <button class={`pill-button ${goal === 'lose' ? 'active' : ''}`} type="button" on:click={() => (goal = 'lose')}>Abnehmen</button>
          <button class={`pill-button ${goal === 'gain' ? 'active' : ''}`} type="button" on:click={() => (goal = 'gain')}>Zunehmen</button>
          <button class={`pill-button ${goal === 'maintain' ? 'active' : ''}`} type="button" on:click={() => (goal = 'maintain')}>Halten</button>
        </div>
      </div>

      <div class="form-field">
        <label class="t-meta">Aktivitätslevel</label>
        <select class="input-pill t-input" bind:value={activity}>
          {#each activities as a}
            <option value={a.value}>{a.label}</option>
          {/each}
        </select>
      </div>

      <div class="cc-divider"></div>
      <div class="cc-actions">
        <button class="cc-primary" type="button" on:click={goToResults}>Jetzt berechnen</button>
        <div class="cc-actions-row">
          <button class="cc-secondary" type="button" on:click={() => navigate('/profile')}>Zurück</button>
          <button class="cc-secondary" type="button" on:click={reset}>Zurücksetzen</button>
        </div>
      </div>
    </section>
  {:else}
    <section class="section">
      <header>
        <h2 class="t-section">Tägliche Zielwerte</h2>
        <p class="t-meta">Passe deine Werte nach Belieben an</p>
      </header>

      <div class="cc-grid">
        <div class="cc-card">
          <div class="t-meta">Kalorien</div>
          <div class="cc-card-value">
            <span class="t-section">{manualCalories}</span>
            <span class="t-meta">kcal</span>
          </div>
          <div class="stepper">
            <button class="stepper-btn" type="button" on:click={() => changeTargetCalories(-100)} disabled={!canDecrease}>−</button>
            <div class="t-meta">100 kcal</div>
            <button class="stepper-btn" type="button" on:click={() => changeTargetCalories(100)} disabled={!canIncrease}>+</button>
          </div>
        </div>

        <div class="cc-card">
          <div class="t-meta">Eiweiß</div>
          <div class="cc-card-value">
            <span class="t-section">{manualProtein}</span>
            <span class="t-meta">g</span>
          </div>
          <div class="stepper">
            <button class="stepper-btn" type="button" on:click={() => changeTargetMacro('protein', -10)}>−</button>
            <div class="t-meta">10 g</div>
            <button class="stepper-btn" type="button" on:click={() => changeTargetMacro('protein', 10)}>+</button>
          </div>
        </div>

        <div class="cc-card">
          <div class="t-meta">Kohlenhydrate</div>
          <div class="cc-card-value">
            <span class="t-section">{manualCarbs}</span>
            <span class="t-meta">g</span>
          </div>
          <div class="stepper">
            <button class="stepper-btn" type="button" on:click={() => changeTargetMacro('carbs', -10)}>−</button>
            <div class="t-meta">10 g</div>
            <button class="stepper-btn" type="button" on:click={() => changeTargetMacro('carbs', 10)}>+</button>
          </div>
        </div>

        <div class="cc-card">
          <div class="t-meta">Fette</div>
          <div class="cc-card-value">
            <span class="t-section">{manualFat}</span>
            <span class="t-meta">g</span>
          </div>
          <div class="stepper">
            <button class="stepper-btn" type="button" on:click={() => changeTargetMacro('fat', -10)}>−</button>
            <div class="t-meta">10 g</div>
            <button class="stepper-btn" type="button" on:click={() => changeTargetMacro('fat', 10)}>+</button>
          </div>
        </div>
      </div>

      <div class="cc-divider"></div>
      <div class="cc-actions">
        <button class="cc-primary" type="button" on:click={saveToProfile}>Speichern</button>
        <button class="cc-secondary" type="button" on:click={() => (step = 1)}>Zurück</button>
      </div>
    </section>
  {/if}
</main>
