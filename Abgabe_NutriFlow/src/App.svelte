<script>
  import Header from "./components/Header.svelte";
  import BottomNav from "./components/BottomNav.svelte";
  import CalendarOverlay from "./components/CalendarOverlay.svelte";
  import LandingPage from "./pages/LandingPage.svelte";
  import MealGenerator from "./pages/MealGenerator.svelte";
  import MealPlan from "./pages/MealPlan.svelte";
  import Profile from "./pages/Profile.svelte";
  import CalorieCalculator from "./pages/CalorieCalculator.svelte";
  import TrainingPlanning from "./pages/TrainingPlanning.svelte";

  import { currentRoute } from "./router.js";
</script>

<Header />

<div class="app-content">
  {#if $currentRoute === 'landing'}
    <LandingPage />
  {:else if $currentRoute === "meal"}
    <MealGenerator />
  {:else if $currentRoute === "plan"}
    <MealPlan />
  {:else if $currentRoute === "profile"}
    <Profile />
  {:else if $currentRoute === "calorie"}
    <CalorieCalculator />
  {:else if $currentRoute === "training"}
    <TrainingPlanning />
  {/if}
</div>

<BottomNav />

<CalendarOverlay />
