
<script>
  import { navigate } from '../router.js';
  import { profileSettings, setProfileSettings } from '../stores/profileStore.js';

  let isVegetarian = $profileSettings.isVegetarian ?? false;

  $: isVegetarian = $profileSettings.isVegetarian ?? false;

  function handleVegetarianChange(event) {
    setProfileSettings({ isVegetarian: event.target.checked });
  }
</script>


<style>
  .profile-page {
    --pad: 20px;
    --gap-tight: 5px;
    --gap-cta: 20px;
    --gap-item: 30px;
    --gap-divider: 30px;
    padding-inline: var(--pad);
    padding-top: 67px;
    padding-bottom: 50px;
  }

  .profile-header { }
  .profile-header .t-hero + .t-meta { margin-top: var(--gap-tight); }

  .profile-block { display: flex; flex-direction: column; gap: var(--gap-item); padding: var(--gap-divider) 0; }
  .profile-block + .profile-block { position: relative; }
  .profile-block + .profile-block::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 100vw;
    height: 1px;
    background: rgba(0,0,0,.08);
    transform: translateX(-50%);
  }

  .profile-row {
    display: grid;
    grid-template-columns: 79px 1fr;
    gap: var(--gap-item);
    align-items: center;
  }

  .profile-info {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 79px;
    gap: 0;
  }

  .profile-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .profile-avatar {
    width: 79px;
    height: 79px;
    border-radius: 999px;
    background: #bfe37a;
    display: grid;
    place-items: center;
  }

  .profile-avatar svg { width: 42px; height: 42px; fill: #fff; }

  .profile-toggle {
    width: 48px;
    height: 24px;
    border-radius: 999px;
    background: #f0f0f0;
    position: relative;
    display: inline-block;
  }

  .profile-toggle-input {
    position: absolute;
    inset: 0;
    opacity: 0;
    margin: 0;
    cursor: pointer;
  }

  .profile-toggle-knob {
    position: absolute;
    top: 0;
    left: 0;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: #9e9e9e;
    transition: transform 180ms ease, background 180ms ease;
  }

  .profile-toggle-input:checked + .profile-toggle-knob {
    transform: translateX(24px);
    background: #bfe37a;
  }

  .profile-link {
    display: grid;
    grid-template-columns: 44px 1fr;
    gap: var(--gap-item);
    align-items: center;
    cursor: pointer;
  }

  .profile-link-text {
    display: flex;
    flex-direction: column;
    gap: var(--gap-tight);
  }

  .profile-icon {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: #fff;
    display: grid;
    place-items: center;
    border: 3px solid #f0f0f0;
    box-shadow: 0 6px 16px rgba(0,0,0,.12);
  }

  .profile-icon img {
    width: 22px;
    height: 22px;
    display: block;
  }
</style>


<main class="page-container profile-page">
  <section class="section">
    <header class="profile-header" style="margin-bottom: 20px;">
      <h1 class="t-section">Profil</h1>
      <p class="t-meta">Persönliches</p>
    </header>

    <div class="profile-block" style="margin-top: -20px;">
      <div class="profile-row">
        <div class="profile-avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4 0-7 2-7 4v2h14v-2c0-2-3-4-7-4z" />
          </svg>
        </div>
        <div class="profile-info">
          <div class="profile-text">
            <div class="t-section">Name</div>
            <p class="t-meta">Ich bin vegetarisch</p>
          </div>
          <label class="profile-toggle">
            <input
              class="profile-toggle-input"
              type="checkbox"
              bind:checked={isVegetarian}
              on:change={handleVegetarianChange}
              aria-label="Ich bin vegetarisch"
            />
            <span class="profile-toggle-knob" aria-hidden="true"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="profile-block">
      <div class="profile-link" on:click={() => navigate('/calorie')}>
        <div class="profile-icon" aria-hidden="true">
          <img src="/Icons/RechnerIcon.svg" alt="" />
        </div>
        <div class="profile-link-text">
          <div class="t-section">Kalorienrechner</div>
          <p class="t-meta">Berechne deine persönlichen Werte</p>
        </div>
      </div>
    </div>

    <div class="profile-block">
      <div class="profile-link" on:click={() => navigate('/training')}>
        <div class="profile-icon" aria-hidden="true">
          <img src="/Icons/HantelIcon.svg" alt="" />
        </div>
        <div class="profile-link-text">
          <div class="t-section">Trainingsplanung</div>
          <p class="t-meta">Gib an wann du trainierst</p>
        </div>
      </div>
    </div>

    <div class="profile-block">
      <div class="profile-link" on:click={() => navigate('/plan')}>
        <div class="profile-icon" aria-hidden="true">
          <img src="/Icons/MahlzeitIcon.svg" alt="" />
        </div>
        <div class="profile-link-text">
          <div class="t-section">Mahlzeiten Plan</div>
          <p class="t-meta">Sieh dir den gesamten Plan an</p>
        </div>
      </div>
    </div>
  </section>
</main>



