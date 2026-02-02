<script>
  import { onMount } from 'svelte';
  import { trainingSettings, setTrainingSettings } from '../stores/trainingStore.js';
  import { navigate } from '../router.js';

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Lokaler Form-State
  let trainingForm = { trainingDays: [], trainingTime: {} };

  onMount(() => {
    // Initialisiere aus Store (kopieren)
    trainingForm = {
      trainingDays: Array.isArray($trainingSettings.trainingDays) ? [...$trainingSettings.trainingDays] : [],
      trainingTime: { ...($trainingSettings.trainingTime || {}) }
    };
  });

  function toggleTrainingDay(day) {
    if (trainingForm.trainingDays.includes(day)) {
      // Entferne Tag und Zeit
      trainingForm.trainingDays = trainingForm.trainingDays.filter(d => d !== day);
      const { [day]: _, ...rest } = trainingForm.trainingTime;
      trainingForm.trainingTime = rest;
    } else {
      // Füge Tag hinzu und setze Default-Zeit falls nicht vorhanden
      trainingForm.trainingDays = [...trainingForm.trainingDays, day];
      if (!trainingForm.trainingTime[day]) {
        trainingForm.trainingTime = {
          ...trainingForm.trainingTime,
          [day]: '18:00'
        };
      }
    }
  }

  function handleSave() {
    setTrainingSettings({
      trainingDays: trainingForm.trainingDays,
      trainingTime: trainingForm.trainingTime
    });
  }

  function resetTraining() {
    trainingForm = {
      trainingDays: [],
      trainingTime: { ...($trainingSettings.trainingTime || {}) }
    };
  }
</script>

<style>
  .tp-page {
    --pad: 20px;
    --gap-tight: 5px;
    --gap-cta: 20px;
    --gap-item: 30px;
    --gap-divider: 30px;
    padding-inline: var(--pad);
    padding-top: 67px;
    padding-bottom: 50px;
  }

  .tp-header { margin-bottom: var(--gap-cta); }
  .tp-header .t-section + .t-meta { margin-top: var(--gap-tight); }
  .tp-section { display: flex; flex-direction: column; gap: var(--gap-cta); }
  .tp-label { margin: 0; }
  .tp-days-spacing { margin-bottom: var(--gap-item); }
  .tp-divider {
    height: 1px;
    background: rgba(0,0,0,.08);
    margin: var(--gap-divider) 0;
    width: 100vw;
    margin-left: calc(var(--pad) * -1);
    margin-right: calc(var(--pad) * -1);
  }

  .tp-day-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .tp-day-button {
    border-radius: 999px;
    border: 3px solid rgba(0,0,0,.12);
    background: #fff;
    padding: 0.65rem 0.5rem;
    box-shadow: 0 2px 6px rgba(0,0,0,.08);
    cursor: pointer;
    font: inherit;
  }

  .tp-day-button.active {
    border-color: transparent;
    background: #bfe37a;
    color: #fff;
  }

  .tp-time-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .tp-time-pill {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.6rem 0.85rem;
    border-radius: 10px;
    border: 3px solid rgba(0,0,0,.12);
    background: #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,.08);
  }

  .tp-time-input {
    border: none;
    background: transparent;
    font: inherit;
    text-align: right;
  }

  .tp-actions { display: flex; flex-direction: column; align-items: flex-start; gap: var(--gap-cta); }
  .tp-actions-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--gap-item); width: 100%; }
  .tp-primary {
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
  .tp-secondary {
    width: 100%;
    border-radius: 999px;
    border: 1px solid rgba(0,0,0,.15);
    background: #fff;
    padding: 0.85rem 1rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,.08);
  }

  @media (max-width: 500px) {
    .tp-day-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .tp-time-grid { grid-template-columns: 1fr; }
  }
</style>


<main class="page-container tp-page">
  <section class="section">
    <header class="tp-header">
      <h2 class="t-section">Trainingsplanung</h2>
      <p class="t-meta">Gib an, wann du trainierst.</p>
    </header>

    <div class="tp-section tp-days-spacing">
      <div class="t-meta tp-label">Trainingstage</div>
      <div class="tp-day-grid">
        {#each daysOfWeek as day}
          <button
            class={`tp-day-button ${trainingForm.trainingDays.includes(day) ? 'active' : ''}`}
            type="button"
            on:click={() => toggleTrainingDay(day)}
          >
            {day === 'Mon' ? 'Mo' : day === 'Tue' ? 'Di' : day === 'Wed' ? 'Mi' : day === 'Thu' ? 'Do' : day === 'Fri' ? 'Fr' : day === 'Sat' ? 'Sa' : 'So'}
          </button>
        {/each}
      </div>
    </div>

    <div class="tp-section">
      <div class="t-meta tp-label">Trainingszeiten</div>
      {#if trainingForm.trainingDays.length > 0}
        <div class="tp-time-grid">
          {#each trainingForm.trainingDays as day}
            <label class="tp-time-pill" for="time-{day}">
              <span class="t-input">{day === 'Mon' ? 'Mo' : day === 'Tue' ? 'Di' : day === 'Wed' ? 'Mi' : day === 'Thu' ? 'Do' : day === 'Fri' ? 'Fr' : day === 'Sat' ? 'Sa' : 'So'}</span>
              <input class="tp-time-input t-input" type="time" id="time-{day}" bind:value={trainingForm.trainingTime[day]} />
            </label>
          {/each}
        </div>
      {:else}
        <p class="t-meta">Keine Trainingstage ausgewählt.</p>
      {/if}
    </div>

    <div class="tp-divider"></div>

    <div class="tp-actions">
      <button class="tp-primary" type="button" on:click={handleSave}>Speichern</button>
      <div class="tp-actions-row">
        <button class="tp-secondary" type="button" on:click={() => navigate('/profile')}>Zurück</button>
        <button class="tp-secondary" type="button" on:click={resetTraining}>Zurücksetzen</button>
      </div>
    </div>
  </section>
</main>
