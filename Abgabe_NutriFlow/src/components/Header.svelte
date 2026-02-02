<script>
  import { navigate } from '../router.js';
  import { weeklyPlan } from '../stores/weeklyPlanStore.js';
  import { toggleCalendar } from '../stores/uiStore.js';

  // Props
  export let title = 'Heute';
  export let subtitle = '';                 // z.B. "Woche 4" oder leer
  export let showCalendarButton = true;     // Kalender-FAB rechts
  export let calendarRoute = '/meal';       // wohin beim Klick

  const WEEKDAY_KEYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  // weeklyPlan kann Array sein oder { week: [...] }
  $: weekArray = Array.isArray($weeklyPlan) ? $weeklyPlan : ($weeklyPlan?.week ?? []);
  $: plannedDaysCount = weekArray.filter(d => (d?.meals?.length ?? 0) > 0).length;

  // Wenn du willst: Untertitel automatisch füllen, falls nicht gesetzt
  // (du kannst das rausnehmen, wenn du lieber überall manuell subtitle setzt)
  function getWeekNumber(date = new Date()) {
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const diffMs = date.getTime() - yearStart.getTime();
  const dayOfYear = Math.floor(diffMs / 86400000) + 1;
  return Math.ceil(dayOfYear / 7);
}

  $: computedSubtitle = subtitle || `Woche ${getWeekNumber()}`;

  function onCalendarClick() {
    navigate(calendarRoute);
  }
</script>

<style>
  .hero {
    background: #fff;
    color: #000;
    padding: 1.4rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    box-shadow: 0 1px 0 rgba(0,0,0,.08);
  }

  .inner {
    max-width: var(--container, 900px);
    margin: 0 auto;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .left { min-width: 0; }
  .title {
    font-size: 2rem;
    font-weight: 800;
    margin: 0;
    line-height: 1.1;
    color: #000;
  }

  .subtitle {
    margin: 0.35rem 0 0 0;
    opacity: 1;
    font-size: 0.98rem;
    color: #f4a261;
    font-weight: 600;
  }

  .planned {
    margin-top: 0.35rem;
    font-size: 0.9rem;
    opacity: 0.7;
    background: transparent;
    padding: 0;
    border-radius: 0;
  }

  .calendar-btn {
    width: 56px;
    height: 56px;
    border-radius: 999px;
    background: #fff;
    border: 3px solid #f0f0f0;
    display: grid;
    place-items: center;
    box-shadow: 0 8px 18px rgba(0,0,0,.16);
    cursor: pointer;
  }

  .calendar-btn:hover { filter: brightness(.98); }

  .calendar-icon-img {
    width: 24px;
    height: 24px;
    display: block;
  }
</style>

<header class="hero" role="banner">
  <div class="inner">
    <div class="left">
      <h1 class="title">{title}</h1>
      <p class="subtitle">{computedSubtitle}</p>

    </div>

    {#if showCalendarButton}
      <button type="button" class="calendar-btn" on:click={toggleCalendar} aria-label="Kalender öffnen">
        <img class="calendar-icon-img" src="/Icons/KalenderIcon.svg" alt="" aria-hidden="true" />
      </button>
    {/if}
  </div>
</header>
