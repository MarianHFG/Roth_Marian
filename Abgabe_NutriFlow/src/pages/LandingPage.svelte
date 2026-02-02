<script>
  import { navigate } from '../router.js';
  import { toggleCalendar } from '../stores/uiStore.js';
  import { weeklyPlan } from '../stores/weeklyPlanStore.js';
  import { profileSettings } from '../stores/profileStore.js';
  import { trainingSettings } from '../stores/trainingStore.js';


  // --- Helpers
  const WEEKDAY_SHORT = ['So','Mo','Di','Mi','Do','Fr','Sa'];

  const MEAL_TYPE_LABELS = {
    'pre-workout': 'Vor dem Training',
    'post-workout': 'Nach dem Training',
    snack: 'Snack',
    normal: 'Normal'
  };

  const formatMealType = (value) => MEAL_TYPE_LABELS[value] ?? value ?? '';

  const formatDateToISO = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayISO = formatDateToISO(new Date());

  // weeklyPlan kann ein Array sein ODER ein Objekt { week: [...] }
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

  // Heute als Index (0=Sunday ... 6=Saturday)
  $: todayIdx = new Date().getDay();

// Nur "ab heute" bis Ende Woche zählen (nicht vergangene Tage)
$: plannedDaysAhead = (sortedWeekArray ?? []).filter(d => (d?.date ?? '') >= todayISO && (d?.meals?.length ?? 0) > 0).length;


  // Heute
  $: todayPlan = (sortedWeekArray ?? []).find(d => d?.date === todayISO) ?? (sortedWeekArray?.[0] ?? null);
  $: nextMeals = todayPlan?.meals ?? [];

  // Anzahl geplanter Tage (mind. 1 Meal)
  $: plannedDaysCount = (sortedWeekArray ?? []).filter(d => (d?.meals?.length ?? 0) > 0).length;

  // --- "Mehr ansehen" Toggle für HEUTE
  let showAllTodayMeals = false;

  // --- Heute: Kalorien-Tracking + Swipe-to-complete
  let eatenMeals = new Set();
  let touchStartX = 0;
  let activeMealKey = '';

  const mealKey = (meal, idx) => meal?.id ?? `${todayISO}-${meal?.title ?? 'meal'}-${idx}`;

  function toggleMealEaten(key) {
    if (!key) return;
    const next = new Set(eatenMeals);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    eatenMeals = next;
  }

  function onMealTouchStart(event, key) {
    activeMealKey = key;
    touchStartX = event?.touches?.[0]?.clientX ?? 0;
  }

  function onMealTouchEnd(event, key) {
    if (activeMealKey !== key) return;
    const endX = event?.changedTouches?.[0]?.clientX ?? 0;
    const deltaX = endX - touchStartX;
    if (deltaX < -60) {
      toggleMealEaten(key);
    }
    activeMealKey = '';
  }

  $: mealsWithKeys = (nextMeals ?? []).map((meal, idx) => ({
    meal,
    key: mealKey(meal, idx)
  }));

  $: orderedMeals = mealsWithKeys.slice().sort((a, b) => {
    const aEaten = eatenMeals.has(a.key) ? 1 : 0;
    const bEaten = eatenMeals.has(b.key) ? 1 : 0;
    return aEaten - bEaten;
  });

  $: visibleMeals = showAllTodayMeals ? orderedMeals : orderedMeals.slice(0, 2);

  $: totalPlannedCalories = (nextMeals ?? []).reduce((sum, meal) => sum + (meal?.macros?.calories ?? 0), 0);
  $: eatenCalories = (nextMeals ?? []).reduce((sum, meal, idx) => {
    const key = mealKey(meal, idx);
    return eatenMeals.has(key) ? sum + (meal?.macros?.calories ?? 0) : sum;
  }, 0);
  $: remainingCalories = Math.max(0, totalPlannedCalories - eatenCalories);
  $: calorieProgress = totalPlannedCalories > 0 ? Math.min(1, eatenCalories / totalPlannedCalories) : 0;

  // Reset, wenn sich Plan/Tag ändert
  let _lastResetKey = '';
  $: {
    const resetKey = `${todayISO}|${(sortedWeekArray ?? []).length}|${plannedDaysCount}`;
    if (resetKey !== _lastResetKey) {
      showAllTodayMeals = false;
      _lastResetKey = resetKey;
    }
  }

  // --- Chips für Plan-Tage
  function getDayState(entry) {
    if (!entry?.date) return 'disabled';
    if (entry.date < todayISO) return 'disabled';
    if (entry.date === todayISO) return 'selected';
    const hasMeals = (entry?.meals?.length ?? 0) > 0;
    return hasMeals ? 'active' : 'disabled';
  }

  function buildWeekChips() {
    return (sortedWeekArray ?? []).map(entry => {
      const d = entry?.date ? new Date(entry.date + 'T12:00:00') : null;
      return {
        key: entry?.date ?? '',
        day: d ? WEEKDAY_SHORT[d.getDay()] : '',
        date: d ? d.getDate() : '',
        state: getDayState(entry)
      };
    });
  }

  $: weekDays = (() => {
    const chips = buildWeekChips();
    const todayIndex = chips.findIndex(chip => chip.state === 'selected');
    if (todayIndex <= 0) return chips;
    return [...chips.slice(todayIndex), ...chips.slice(0, todayIndex)];
  })();

  // --- Navigation
  function goToProfile() { navigate('/profile'); }

  let chatInput = "";
  let chatLoading = false;
  let chatError = "";
  let messages = [
    { role: "assistant", text: "Frag mich zu deinem heutigen Plan (Kalorien, Makros, Snack, Training)." }
  ];

  $: totalPlannedProtein = (nextMeals ?? []).reduce((sum, meal) => sum + (meal?.macros?.protein ?? 0), 0);
  $: totalPlannedCarbs = (nextMeals ?? []).reduce((sum, meal) => sum + (meal?.macros?.carbs ?? 0), 0);
  $: totalPlannedFat = (nextMeals ?? []).reduce((sum, meal) => sum + (meal?.macros?.fat ?? 0), 0);

  $: explainContext = {
    date: todayPlan?.date ?? null,
    meals: (todayPlan?.meals ?? []).map(m => ({
      title: m?.title ?? '',
      type: m?.type ?? '',
      calories: m?.macros?.calories ?? null
    })),
    totals: {
      calories: totalPlannedCalories ?? null,
      protein: totalPlannedProtein ?? null,
      carbs: totalPlannedCarbs ?? null,
      fat: totalPlannedFat ?? null
    },
    profile: {
      calories: $profileSettings?.calories ?? null,
      protein: $profileSettings?.protein ?? null,
      carbs: $profileSettings?.carbs ?? null,
      fat: $profileSettings?.fat ?? null,
      mealsPerDay: $profileSettings?.mealsPerDay ?? null,
      includeSnack: $profileSettings?.includeSnack ?? null
    },
    training: {
      trainingDays: $trainingSettings?.trainingDays ?? null,
      trainingTime: $trainingSettings?.trainingTime ?? null
    }
  };

  async function sendMessage() {
    if (!chatInput.trim() || chatLoading) return;
    const text = chatInput.trim();
    messages = [...messages, { role: "user", text }];
    chatInput = "";
    chatLoading = true;
    chatError = "";

    try {
      const response = await fetch("http://localhost:3000/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context: explainContext })
      });

      if (!response.ok) {
        throw new Error("request_failed");
      }

      const data = await response.json();
      messages = [...messages, { role: "assistant", text: data?.reply ?? "" }];
    } catch (e) {
      chatError = "Die Anfrage ist fehlgeschlagen. Bitte versuche es erneut.";
    } finally {
      chatLoading = false;
    }
  }
</script>



<style>
  /* Scoped styles for LandingPage */

  .landing {
    --pad: 20px;
    --gap-tight: 5px;
    --gap-cta: 20px;
    --gap-item: 30px;
    --gap-divider: 30px;
    padding-inline: var(--pad);
    padding-block: 30px;
  }

  .section {
    padding: var(--gap-divider) 0;
    margin: 0;
  }

  .section:not(:first-of-type) {
    position: relative;
  }

  .section:not(:first-of-type)::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 100vw;
    height: 1px;
    background: rgba(0,0,0,.06);
    transform: translateX(-50%);
  }

  .section-title { margin-bottom: var(--gap-cta); }

  .landing .t-section + .t-meta {
    margin-top: var(--gap-tight);
  }

  .calorie-bar {
    display: flex;
    flex-direction: column;
    gap: var(--gap-cta);
  }

  .calorie-bar-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
  }

  .calorie-value {
    font-weight: 700;
    color: #000;
  }

  .calorie-target {
    color: #b5b5b5;
    font-weight: 500;
  }

  .calorie-progress {
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background: #efefef;
    overflow: hidden;
  }

  .calorie-progress-fill {
    height: 100%;
    background: #bfe37a;
    border-radius: 999px;
    transition: width 0.2s ease;
  }

  .meal-row {
    display: flex;
    align-items: center;
    padding: 0;
  }

  .meal-row + .meal-row {
    margin-top: var(--gap-item);
  }

  .meal-row.eaten {
    opacity: 0.55;
  }

  .meal-row:last-child {
    border-bottom: none;
  }

  .meal-thumbnail {
    width: 60px;
    height: 60px;
    border-radius: 999px;
    background: #f0f0f0;
    overflow: hidden;
    margin-right: 1rem;
    flex-shrink: 0;
  }

  .meal-thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .meal-thumb-placeholder {
    width: 100%;
    height: 100%;
    background: #d9d9d9;
  }

  .meal-info {
    flex: 1;
  }

  .meal-title {
    margin: 0;
    color: var(--text);
    font-weight: 700;
  }

  .meal-subtitle {
    color: #b5b5b5;
    margin: 0.25rem 0;
  }

  .meal-macros {
    color: #b5b5b5;
  }

  .coach-card {
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    overflow: visible;
  }

  .coach-summary {
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: 1.25rem;
    align-items: center;
    padding: 0;
    cursor: pointer;
    list-style: none;
    margin: 0;
  }

  .coach-summary::-webkit-details-marker { display: none; }

  .coach-icon {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: #fff;
    display: grid;
    place-items: center;
    border: 3px solid #f0f0f0;
    box-shadow: 0 6px 16px rgba(0,0,0,.12);
  }

  .coach-icon img {
    width: 22px;
    height: 22px;
    display: block;
  }

  .coach-body {
    padding: 0;
    margin-top: var(--gap-cta);
  }

  .chat-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 220px;
    overflow-y: auto;
    padding-right: 0.25rem;
  }

  .chat-msg {
    padding: 0.5rem 0.65rem;
    border-radius: 12px;
    background: rgba(0,0,0,.04);
  }

  .chat-msg.user {
    align-self: flex-end;
    background: rgba(99,179,93,.12);
  }

  .chat-input-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.5rem;
    margin-top: var(--gap-cta);
  }

  .chat-input {
    border: 1px solid rgba(0,0,0,.12);
    border-radius: 12px;
    padding: 0.6rem 0.7rem;
    background: #fff;
  }

  .chat-send {
    border-radius: 12px;
    border: none;
    background: #bfe37a;
    color: #fff;
    padding: 0.6rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }

  .chat-send:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .chat-error {
    margin-top: 0.5rem;
    color: #c62828;
  }

  .see-more {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 0.75rem 0;
    margin-top: var(--gap-cta);
    background: none;
    border: none;
    color: #b5b5b5;
    cursor: pointer;
  }

  .chevron {
    margin-left: 0.5rem;
    width: 16px;
    height: 16px;
  }

  .calendar-section {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    margin-bottom: var(--gap-item);
  }

  .calendar-icon-small {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-pill);
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 16px rgba(0,0,0,.12);
    border: 3px solid #f0f0f0;
    padding: 0;
  }

  .calendar-icon-img {
    width: 20px;
    height: 20px;
    display: block;
  }

  .calendar-title {
    margin: 0;
    color: var(--text);
  }

  .calendar-subtitle {
    color: #f4a261;
    margin: var(--gap-tight) 0 0 0;
    opacity: 1;
  }

.week-chips{
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.75rem;
  overflow: hidden;          /* kein horizontales Scrollen */
  width: 100%;
}

.chip{
  min-width: 0;              /* wichtig: Grid darf wirklich schrumpfen */
  text-align: center;
  border-radius: 14px;
  padding: 0.6rem 0.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.chip-day{
  margin-bottom: 0.25rem;
  color: #bfe37a;
}

.chip.disabled .chip-day {
  color: #b5b5b5;
}

.chip-date{
  display: grid;
  place-items: center;
  border-radius: 999px;
  width: 32px;
  height: 32px;
}


  .chip.selected .chip-date {
    background: #fff;
    color: #bfe37a;
    border: 2px solid #bfe37a;
  }

  .chip.active .chip-date {
    background: #bfe37a;
    color: #fff;
  }

  .chip.disabled .chip-date {
    background: #f0f0f0;
    color: #b5b5b5;
  }

  .calculator-card {
    display: grid;
    grid-template-columns: 44px 1fr;
    align-items: center;
    gap: 1.25rem;
    padding: 0;
    background: transparent;
    border-radius: var(--radius);
    cursor: pointer;
  }

  .calculator-icon {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: #fff;
    display: grid;
    place-items: center;
    margin-right: 0;
    border: 3px solid #f0f0f0;
    box-shadow: 0 6px 16px rgba(0,0,0,.12);
    box-sizing: border-box;
  }

  .cta-icon {
    width: 24px;
    height: 24px;
    display: block;
  }

  .calculator-text {
    flex: 1;
    color: var(--text);
  }

  @media (min-width: 700px) {
    .hero, .section {
      max-width: var(--container);
      margin: 0 auto;
    }
  }

</style>

<main class="landing">
<!-- Kalorien heute -->
<section class="section">
  <div class="calorie-bar">
    <div class="calorie-bar-head">
      <div class="t-section">Kalorien</div>
      <div class="t-meta">
        <span class="calorie-value">{remainingCalories}</span>
        <span class="calorie-target"> / {totalPlannedCalories}</span>
      </div>
    </div>
    <div class="calorie-progress" aria-hidden="true">
      <div class="calorie-progress-fill" style={`width: ${calorieProgress * 100}%;`}></div>
    </div>
    <div class="t-meta">Heute übrig: {remainingCalories} kcal</div>
  </div>
</section>

<!-- Als nächstes -->
<section class="section">
  <h2 class="t-section">Als nächstes:</h2>

  {#if nextMeals?.length}
    {#each visibleMeals as entry}
      {@const key = entry.key}
      {@const meal = entry.meal}
      <div
        class="meal-row {eatenMeals.has(key) ? 'eaten' : ''}"
        role="button"
        tabindex="0"
        on:click={() => toggleMealEaten(key)}
        on:touchstart={(event) => onMealTouchStart(event, key)}
        on:touchend={(event) => onMealTouchEnd(event, key)}
      >
        <div class="meal-thumbnail" aria-hidden={!meal.image}>
          {#if meal.image}
            <img class="meal-thumb-img" src={meal.image} alt={meal.title} loading="lazy" />
          {:else}
            <div class="meal-thumb-placeholder" aria-hidden="true"></div>
          {/if}
        </div>
        <div class="meal-info">
          <h3 class="t-input">{meal.title}</h3>
          <p class="meal-subtitle">{formatMealType(meal.type)}</p>

          {#if meal.macros}
            <p class="meal-macros">
              {meal.macros.calories} kcal&nbsp;&nbsp;&nbsp;P: {meal.macros.protein}g&nbsp;&nbsp;&nbsp;K: {meal.macros.carbs}g&nbsp;&nbsp;&nbsp;F: {meal.macros.fat}g
            </p>
          {/if}
        </div>
      </div>
    {/each}

    {#if (nextMeals?.length ?? 0) > 2}
      <button class="see-more t-meta" on:click={() => (showAllTodayMeals = !showAllTodayMeals)}>
        {showAllTodayMeals ? 'Weniger anzeigen' : 'Mehr ansehen'}
        <svg class="chevron" viewBox="0 0 24 24">
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
        </svg>
      </button>
    {/if}
  {:else}
    <p class="t-meta">Noch keine Mahlzeiten für heute. Erstelle zuerst einen Wochenplan im Meal-Generator.</p>
  {/if}
</section>

  <!-- Kalenderübersicht -->
  <section class="section">
    <div class="calendar-section">
      <button class="calendar-icon-small" type="button" on:click={toggleCalendar} aria-label="Kalender öffnen">
        <img class="calendar-icon-img" src="/Icons/KalenderIcon.svg" alt="" aria-hidden="true" />
      </button>
      <div>
        <h2 class="t-section">Kalenderübersicht</h2>
        <p class="calendar-subtitle t-meta">noch {plannedDaysAhead} Tage geplant</p>
      </div>
    </div>
    <div class="week-chips">
      {#each weekDays as day}
        <div class="chip {day.state}">
          <div class="chip-day">{day.day}</div>
          <div class="chip-date">{day.date}</div>
        </div>
      {/each}
    </div>
  </section>

<!-- KI-Erklärung -->
<section class="section">
  <details class="coach-card">
    <summary class="coach-summary">
      <div class="coach-icon" aria-hidden="true">
        <img src="/Icons/BotIcon.svg" alt="" />
      </div>
      <div>
        <div class="t-section">Dein Coach</div>
        <p class="t-meta">Stelle Fragen rund ums Thema Ernährung und Training</p>
      </div>
    </summary>

    <div class="coach-body">
      <div class="chat-list" aria-live="polite">
        {#each messages as msg}
          <div class={`chat-msg ${msg.role === 'user' ? 'user' : 'assistant'}`}>
            <div class="t-input">{msg.text}</div>
          </div>
        {/each}
        {#if chatLoading}
          <div class="chat-msg assistant">
            <div class="t-input">Antwort wird geladen …</div>
          </div>
        {/if}
      </div>

      <div class="chat-input-row">
        <input
          class="chat-input t-input"
          type="text"
          placeholder="z. B. Wie sehen meine Makros heute aus?"
          bind:value={chatInput}
          on:keydown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button class="chat-send" type="button" on:click={sendMessage} disabled={chatLoading}>
          Senden
        </button>
      </div>

      {#if chatError}
        <div class="chat-error t-meta">{chatError}</div>
      {/if}
    </div>
  </details>
</section>

  <!-- Kalorienrechner -->
  <section class="section">
    <div class="calculator-card" on:click={goToProfile}>
      <div class="calculator-icon">
        <img class="cta-icon" src="/Icons/RechnerIcon.svg" alt="" aria-hidden="true" />
      </div>
      <div>
        <div class="t-section">Kalorienrechner</div>
        <p class="t-meta">Berechne deine persönlichen Werte</p>
      </div>
    </div>
  </section>

</main>