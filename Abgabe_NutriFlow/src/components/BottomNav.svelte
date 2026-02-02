<script>
  import { navigate } from '../router.js';
  import { currentRoute } from '../router.js';

  function goToHome() { navigate('/'); }
  function goToMeals() { navigate('/meal'); }
  function goToProfile() { navigate('/profile'); }
</script>

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background: white;
    border-top: 1px solid rgba(0,0,0,.12);
    display: flex;
    justify-content: space-around;
    padding: 0.5rem;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    cursor: pointer;
    color: #666;
  }

  .nav-item.active {
    color: #4CAF50;
  }

  .nav-icon {
    width: 32px;
    height: 32px;
    margin-bottom: 0.25rem;
    display: block;
  }

</style>

<nav class="bottom-nav">
  <div class="nav-item {$currentRoute === 'landing' ? 'active' : ''}" on:click={goToHome}>
    {#if $currentRoute === 'landing'}
      <img class="nav-icon" src="/Icons/CurrentHaus.svg" alt="" aria-hidden="true" />
    {:else}
      <img class="nav-icon" src="/Icons/Haus.svg" alt="" aria-hidden="true" />
    {/if}
  </div>
  <div class="nav-item {$currentRoute === 'meal' ? 'active' : ''}" on:click={goToMeals}>
    {#if $currentRoute === 'meal'}
      <img class="nav-icon" src="/Icons/CurrentGenerator.svg" alt="" aria-hidden="true" />
    {:else}
      <img class="nav-icon" src="/Icons/Generator.svg" alt="" aria-hidden="true" />
    {/if}
  </div>
  <div class="nav-item {$currentRoute === 'profile' ? 'active' : ''}" on:click={goToProfile}>
    {#if $currentRoute === 'profile'}
      <img class="nav-icon" src="/Icons/CurrentProfil.svg" alt="" aria-hidden="true" />
    {:else}
      <img class="nav-icon" src="/Icons/Profil.svg" alt="" aria-hidden="true" />
    {/if}
  </div>
</nav>
