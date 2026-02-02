<script>
  import { calendarOpen, closeCalendar } from '../stores/uiStore.js';
  import { weeklyPlan } from '../stores/weeklyPlanStore.js';

  const formatDateToISO = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayISO = formatDateToISO(new Date());

  $: weekArray = Array.isArray($weeklyPlan)
    ? $weeklyPlan
    : ($weeklyPlan?.week ?? []);

  $: normalizedWeekArray = (weekArray ?? []).map(entry => {
    if (!entry) return entry;
    if (entry.snack && !(entry.meals ?? []).some(m => m?.id === entry.snack?.id && m?.title === entry.snack?.title)) {
      return {
        ...entry,
        meals: [...(entry.meals ?? []), entry.snack]
      };
    }
    return entry;
  });

  $: sortedWeekArray = (normalizedWeekArray ?? [])
    .slice()
    .sort((a, b) => (a?.date ?? '').localeCompare(b?.date ?? ''));

  $: plannedDaysAhead = (sortedWeekArray ?? []).filter(
    d => (d?.date ?? '') >= todayISO && (d?.meals?.length ?? 0) > 0
  ).length;

  function onOverlayKeydown(e) {
    if (e.key === 'Escape' && $calendarOpen) closeCalendar();
  }
</script>

<svelte:window on:keydown={onOverlayKeydown} />

{#if $calendarOpen}
  <div
    class="cal-overlay"
    on:click={closeCalendar}
  >
    <div class="cal-modal" on:click|stopPropagation>
      <div class="cal-inner">
        <div class="cal-head">
          <h2 class="t-section">Kalender</h2>
          <button class="cal-close" type="button" on:click={closeCalendar} aria-label="Schließen">✕</button>
        </div>

        <p class="t-meta">Noch <strong class="t-meta">{plannedDaysAhead}</strong> Tage geplant</p>

        {#if sortedWeekArray?.length}
          <div class="cal-list">
            {#each sortedWeekArray as entry}
              {@const isPlanned = (entry?.meals?.length ?? 0) > 0}
              {@const isPast = (entry?.date ?? '') < todayISO}

              <div class="cal-row {isPlanned ? 'planned' : 'empty'} {isPast ? 'past' : ''}">
                <div class="t-input">{entry.day}</div>
                <div class="t-meta">
                  {#if isPlanned}{entry.meals.length} Mahlzeiten{:else}—{/if}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="t-meta">Noch kein Wochenplan generiert.</p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .cal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.35);
    z-index: 2000;
    display: grid;
    place-items: end center;
    padding: 0;
  }

  .cal-modal {
    width: 100%;
    max-width: 720px;
    background: white;
    border-radius: 18px 18px 0 0;
    padding: 0;
    box-shadow: 0 10px 30px rgba(0,0,0,.22);
    box-sizing: border-box;
  }

  .cal-inner {
    padding-inline: 20px;
    padding-block: 16px;
    box-sizing: border-box;
  }

  .cal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .cal-close {
    border: 1px solid rgba(0,0,0,.15);
    background: transparent;
    border-radius: 999px;
    width: 38px;
    height: 38px;
    cursor: pointer;
  }

  .cal-sub { margin: .5rem 0 1rem 0; }

  .cal-list { display: flex; flex-direction: column; gap: .5rem; }

  .cal-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: .75rem .8rem;
    border: 3px solid rgba(0,0,0,.12);
    border-radius: 14px;
    box-shadow: none;
  }

  .cal-row.planned { border-color: rgba(0,0,0,.12); }
</style>
