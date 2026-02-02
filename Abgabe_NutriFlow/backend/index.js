console.log("BACKEND BOOT", new Date().toISOString(), "PID", process.pid);


require('dotenv').config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
if (!SPOONACULAR_API_KEY) {
  throw new Error("Missing SPOONACULAR_API_KEY in .env");
}


const app = express();
const PORT = 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY missing");
}

app.use(cors());
app.use(express.json());

// Test-Route
app.get("/", (req, res) => {
  res.send("Welcome to the Meal Planner Backend!");
});

// Status-Check
app.get("/status", (req, res) => {
  res.json({ status: "Meal Planner Backend is running!" });
});

app.get("/api/test-recipe", async (req, res) => {
  try {
    const response = await fetch(
      `https://api.spoonacular.com/recipes/random?number=1&apiKey=${SPOONACULAR_API_KEY}`
    );

    const data = await response.json();

    res.json({
      source: "spoonacular",
      recipe: data.recipes[0]
    });
  } catch (error) {
    console.error("Spoonacular error:", error);
    res.status(500).json({ error: "Failed to fetch recipe" });
  }
});

async function fetchRandomRecipes(count, isVegetarian, budgetRef, stats) {
  if (budgetRef && budgetRef.remaining <= 0) {
    throw new Error("BUDGET_EXCEEDED");
  }
  if (budgetRef) budgetRef.remaining -= 1;
  if (stats) stats.randomCalls += 1;
  await sleep(600);
  const tagsParam = isVegetarian ? "&tags=vegetarian" : "";
  const response = await fetch(
    `https://api.spoonacular.com/recipes/random?number=${count}${tagsParam}&apiKey=${SPOONACULAR_API_KEY}`
  );
  if (!response.ok) {
    const body = await response.text();
    console.warn('random failed', response.status, body.slice(0, 200));
    return [];
  }
  const data = await response.json();
  return data.recipes || [];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueArray(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function shuffleArray(values) {
  const arr = values.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fetchNutritionBulk(ids, budgetRef, stats) {
  if (!ids.length) return [];
  const chunks = [];
  for (let i = 0; i < ids.length; i += 20) {
    chunks.push(ids.slice(i, i + 20));
  }
  const all = [];
  for (const chunk of chunks) {
    if (budgetRef && budgetRef.remaining <= 0) {
      throw new Error("BUDGET_EXCEEDED");
    }
    if (budgetRef) budgetRef.remaining -= 1;
    if (stats) stats.bulkCalls += 1;
    await sleep(600);
    const url = `https://api.spoonacular.com/recipes/informationBulk?ids=${chunk.join(',')}&includeNutrition=true&apiKey=${SPOONACULAR_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      console.warn('informationBulk failed', response.status, body.slice(0, 200));
      continue;
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.warn('informationBulk failed', response.status, 'invalid');
      continue;
    }
    all.push(...data);
  }
  return all;
}

function getNutrientValue(nutrients, name) {
  if (!Array.isArray(nutrients)) return null;
  const target = String(name || '').toLowerCase();
  const match = nutrients.find(n => {
    const key = String(n?.name ?? n?.title ?? '').toLowerCase();
    return key === target;
  });
  if (Number.isFinite(match?.value)) return match.value;
  return Number.isFinite(match?.amount) ? match.amount : null;
}

function extractNutritionMacros(nutrition) {
  const nutrients = Array.isArray(nutrition?.nutrients)
    ? nutrition.nutrients
    : Array.isArray(nutrition)
      ? nutrition
      : [];

  const calories = getNutrientValue(nutrients, 'calories');
  const protein = getNutrientValue(nutrients, 'protein');
  const carbs = getNutrientValue(nutrients, 'carbohydrates')
    ?? getNutrientValue(nutrients, 'carbs')
    ?? getNutrientValue(nutrients, 'net carbohydrates');
  const fat = getNutrientValue(nutrients, 'fat');
  if ([calories, protein, carbs, fat].some(v => v === null)) return null;
  return {
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat)
  };
}

function filterVegetarian(recipes, isVegetarian) {
  if (!isVegetarian) return Array.isArray(recipes) ? recipes : [];
  return (recipes || []).filter(r => r && r.vegetarian === true);
}

function mergeUniqueRecipes(existing, next) {
  const map = new Map();
  (existing || []).forEach(r => {
    if (r?.id) map.set(r.id, r);
  });
  (next || []).forEach(r => {
    if (r?.id && !map.has(r.id)) map.set(r.id, r);
  });
  return Array.from(map.values());
}

async function hydrateNutrition(recipes, isVegetarian, logCtx, budgetRef, stats) {
  const ids = uniqueArray((recipes || []).map(r => r?.id).filter(Boolean));
  if (!ids.length) return [];
  const info = await fetchNutritionBulk(ids, budgetRef, stats);
  console.log("nutrition bulk count", info.length);

  const infoMap = new Map(info.map(r => [r?.id, r]));
  const hydrated = (recipes || []).map(r => {
    const infoRecipe = infoMap.get(r?.id);
    const macros = extractNutritionMacros(infoRecipe?.nutrition ?? infoRecipe);
    if (!macros) {
      if (logCtx && !logCtx.nutritionShapeLogged) {
        console.warn(
          "Nutrition shape sample:",
          JSON.stringify(infoRecipe?.nutrition ?? infoRecipe?.nutrients ?? null).slice(0, 500)
        );
        logCtx.nutritionShapeLogged = true;
      }
      return null;
    }
    return {
      ...r,
      vegetarian: infoRecipe?.vegetarian ?? r?.vegetarian,
      nutritionData: macros
    };
  }).filter(Boolean);
  return filterVegetarian(hydrated, isVegetarian);
}

function pickRandomSubset(values, min = 6, max = 8) {
  const unique = uniqueArray(values.map(v => String(v || '').trim()).filter(Boolean));
  if (!unique.length) return [];
  const size = Math.min(unique.length, Math.max(min, Math.min(max, unique.length)));
  return shuffleArray(unique).slice(0, size);
}

function getRecipeTextFields(recipe) {
  if (!recipe) return [];
  const fields = [recipe.title, recipe.summary, recipe.sourceName, recipe.sourceUrl, recipe.spoonacularSourceUrl];
  const aisles = Array.isArray(recipe.aisle) ? recipe.aisle : [];
  const types = Array.isArray(recipe.dishTypes) ? recipe.dishTypes : [];
  const cuisines = Array.isArray(recipe.cuisines) ? recipe.cuisines : [];
  return [...fields, ...aisles, ...types, ...cuisines];
}

function computePantryMatches(recipe, availableFoods) {
  const foods = uniqueArray(availableFoods.map(f => normalizeText(f))).filter(Boolean);
  if (!foods.length) return [];
  const text = normalizeText(getRecipeTextFields(recipe).join(' '));
  if (!text) return [];
  return foods.filter(food => text.includes(food));
}

function nutritionDistanceScore(macros, targets) {
  if (!macros || !targets) return Infinity;
  let score = 0;
  if (targets.calories > 0) score += Math.abs(macros.calories - targets.calories) / targets.calories;
  if (targets.protein > 0) score += Math.abs(macros.protein - targets.protein) / targets.protein;
  if (targets.carbs > 0) score += Math.abs(macros.carbs - targets.carbs) / targets.carbs;
  if (targets.fat > 0) score += Math.abs(macros.fat - targets.fat) / targets.fat;
  return score;
}

async function fetchRecipesByAvailableFoods(availableFoods, isVegetarian, number = 30, budgetRef, stats) {
  const subset = pickRandomSubset(availableFoods, 6, 8);
  if (!subset.length) return [];

  const includeIngredients = subset.map(encodeURIComponent).join(',');
  const dietParam = isVegetarian ? '&diet=vegetarian' : '';
  const randomOffset = Math.floor(Math.random() * 901);
  if (budgetRef && budgetRef.remaining <= 0) {
    throw new Error("BUDGET_EXCEEDED");
  }
  if (budgetRef) budgetRef.remaining -= 1;
  if (stats) stats.complexCalls += 1;
  await sleep(600);
  const url = `https://api.spoonacular.com/recipes/complexSearch?number=${number}&addRecipeInformation=true&includeIngredients=${includeIngredients}${dietParam}&sort=random&offset=${randomOffset}&apiKey=${SPOONACULAR_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    console.warn('complexSearch failed', response.status, body.slice(0, 200));
    return [];
  }
  const data = await response.json();
  return Array.isArray(data?.results) ? data.results : [];
}

async function createDummyWeekPlan(config) {
  const TRAINING_BUFFER = 120; // 2 Stunden
  const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MAX_API_CALLS = 25;
  const MAX_RANDOM_CALLS_PER_DAY = 3;
  const MAX_COMPLEX_CALLS_PER_DAY = 2;
  const isVegetarian = config.isVegetarian === true;
  let vegetarianFallbackUsed = false;
  let vegetarianPoolCount = 0;
  let vegetarianShortfallWarned = false;
  const nutritionLogContext = { nutritionShapeLogged: false };

function timeToMinutes(t) {
    const [hh, mm] = (t || "").split(":").map(Number);
    return Number.isFinite(hh) && Number.isFinite(mm) ? hh * 60 + mm : null;
  }

function isValidTimeString(t) {
    return typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t) && t !== "00:00";
  }

function minutesToTime(mins) {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)));
    const hh = String(Math.floor(clamped / 60)).padStart(2, "0");
    const mm = String(clamped % 60).padStart(2, "0");
    return `${hh}:${mm}`;
  }

function parseStartDate(value) {
    if (!value || typeof value !== "string") return null;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    return new Date(Date.UTC(year, month, day));
  }

function formatDateUTC(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

function addDaysUTC(date, days) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

function generateMealTimes(count) {
    const start = 8 * 60;
    const end = 20 * 60;
    if (count === 1) return ["12:00"];

    const interval = (end - start) / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const mins = Math.round(start + interval * i);
      return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    });
  }

  const startDate = parseStartDate(config.startDate) || new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const weeksCount = Math.max(1, Number(config.weeksCount) || 1);
  const totalDays = weeksCount * 7;

  const planDays = Array.from({ length: totalDays }, (_, i) => {
    const date = addDaysUTC(startDate, i);
    const dayAbbr = WEEKDAY_ABBR[date.getUTCDay()];
    return { date, dateISO: formatDateUTC(date), dayAbbr };
  });

  const usedRecipeIdsGlobal = new Set();
  let requestBudget = MAX_API_CALLS;
  const budgetRef = {
    get remaining() {
      return requestBudget;
    },
    set remaining(value) {
      requestBudget = value;
    }
  };

  const weekPlan = [];

  const generateDayPlan = async (planDay) => {
    try {
      const meals = [];

      /* ───────── TRAINING INFO (EINMAL!) ───────── */
      const abbr = planDay.dayAbbr;
      const trainingTimeStr = config.trainingTime?.[abbr] ?? null;
      const isTrainingDay = Array.isArray(config.trainingDays)
        && config.trainingDays.includes(abbr)
        && isValidTimeString(trainingTimeStr);
      const trainingMins = isTrainingDay ? timeToMinutes(trainingTimeStr) : null;

      /* ───────── MEAL TIMES ───────── */
      const rawTimes = generateMealTimes(Number(config.mealsPerDay));

      const mealTimes = rawTimes.filter(t => {
        if (!isTrainingDay) return true;
        const mins = timeToMinutes(t);
        return mins < trainingMins || mins >= trainingMins + TRAINING_BUFFER;
      });

      /* ───────── DAILY TARGETS ───────── */
      const dailyCalories = Number(config.calories) || 0;
      const dailyProtein = Number(config.protein) || 0;
      const dailyCarbs = Number(config.carbs) || 0;
      const dailyFat = Number(config.fat) || 0;

      /* ───────── FETCH RECIPES FROM SPOONACULAR ───────── */
      const includeSnack = Boolean(config.includeSnack);
      const neededMeals = mealTimes.length + (includeSnack ? 1 : 0);
      const availableFoods = Array.isArray(config.availableFoods)
        ? config.availableFoods
        : (Array.isArray(config.inventory) ? config.inventory : []);
      const availableFoodsCount = availableFoods.length;
      const useComplexSearch = availableFoodsCount >= 4;
      const totalMealsToday = Math.max(1, neededMeals);
      const perMealTargets = {
        calories: dailyCalories ? Math.round(dailyCalories / totalMealsToday) : 0,
        protein: dailyProtein ? Math.round(dailyProtein / totalMealsToday) : 0,
        carbs: dailyCarbs ? Math.round(dailyCarbs / totalMealsToday) : 0,
        fat: dailyFat ? Math.round(dailyFat / totalMealsToday) : 0
      };
      let selectedRecipes = [];
      const seenIds = new Set();
      const MAX_ATTEMPTS = 3;
      let attempts = 0;
      let batchSize = Math.min(20, Math.max(neededMeals * 3, 8));
      let fetchedCandidates = 0;
      let afterVegetarian = 0;
      let afterHydrateNutrition = 0;
      let afterDedupe = 0;
      let filledFromRandomCount = 0;
      const dayCallStats = { randomCalls: 0, complexCalls: 0, bulkCalls: 0 };
      let budgetExceeded = false;

      const scoreBatch = (batch) => batch.map(r => {
        const pantryMatches = availableFoods.length ? computePantryMatches(r, availableFoods) : [];
        const nutritionDistance = nutritionDistanceScore(r.nutritionData, perMealTargets);
        const score = pantryMatches.length * 2 - nutritionDistance;
        return {
          recipe: r,
          pantryMatches,
          pantryMatchCount: pantryMatches.length,
          nutritionDistance,
          score
        };
      }).sort((a, b) => b.score - a.score);

      const addScoredEntries = (batch, allowGlobalDedupe = false) => {
        const scored = scoreBatch(batch);
        for (const entry of scored) {
          const id = entry.recipe?.id;
          if (!id || seenIds.has(id)) continue;
          if (!allowGlobalDedupe && usedRecipeIdsGlobal.has(id)) continue;
          selectedRecipes.push(entry);
          seenIds.add(id);
          usedRecipeIdsGlobal.add(id);
          if (selectedRecipes.length >= neededMeals) break;
        }
      };

      try {
        while (selectedRecipes.length < neededMeals && attempts < MAX_ATTEMPTS) {
          if (budgetRef.remaining <= 0) {
            budgetExceeded = true;
            break;
          }
          let batch = [];
          if (useComplexSearch) {
            if (dayCallStats.complexCalls >= MAX_COMPLEX_CALLS_PER_DAY) break;
            batch = await fetchRecipesByAvailableFoods(availableFoods, isVegetarian, Math.round(batchSize), budgetRef, dayCallStats);
          } else {
            if (dayCallStats.randomCalls >= MAX_RANDOM_CALLS_PER_DAY) break;
            batch = await fetchRandomRecipes(Math.round(batchSize), isVegetarian, budgetRef, dayCallStats);
            vegetarianFallbackUsed = true;
          }

          fetchedCandidates += batch.length;
          const vegetarianBatch = filterVegetarian(batch, isVegetarian);
          afterVegetarian += vegetarianBatch.length;
          const hydratedBatch = await hydrateNutrition(vegetarianBatch, isVegetarian, nutritionLogContext, budgetRef, dayCallStats);
          afterHydrateNutrition += hydratedBatch.length;
          const nutritionReady = hydratedBatch.filter(r => r?.nutritionData);

          const deduped = nutritionReady.filter(r => r?.id && !seenIds.has(r.id) && !usedRecipeIdsGlobal.has(r.id));
          afterDedupe += deduped.length;

          if (!deduped.length) {
            attempts += 1;
            batchSize = Math.min(20, Math.ceil(batchSize * 1.5));
            continue;
          }

          addScoredEntries(deduped);

          attempts += 1;
        }

        if (selectedRecipes.length < neededMeals) {
          let fillAttempts = 0;
          const MAX_FILL_ATTEMPTS = 3;
          while (selectedRecipes.length < neededMeals && fillAttempts < MAX_FILL_ATTEMPTS) {
            if (budgetRef.remaining <= 0) {
              budgetExceeded = true;
              break;
            }
            if (dayCallStats.randomCalls >= MAX_RANDOM_CALLS_PER_DAY) break;
            const needed = neededMeals - selectedRecipes.length;
            const toFetch = Math.min(20, Math.max(needed * 2, 6));
            const randomBatch = await fetchRandomRecipes(toFetch, isVegetarian, budgetRef, dayCallStats);
            const vegetarianBatch = filterVegetarian(randomBatch, isVegetarian);
            const hydratedBatch = await hydrateNutrition(vegetarianBatch, isVegetarian, nutritionLogContext, budgetRef, dayCallStats);
            const nutritionReady = hydratedBatch.filter(r => r?.nutritionData);
            const deduped = nutritionReady.filter(r => r?.id && !seenIds.has(r.id) && !usedRecipeIdsGlobal.has(r.id));
            const beforeFill = selectedRecipes.length;
            addScoredEntries(deduped);
            filledFromRandomCount += (selectedRecipes.length - beforeFill);
            fillAttempts += 1;
          }
        }

        if (selectedRecipes.length < neededMeals) {
          let emergencyAttempts = 0;
          const MAX_EMERGENCY_ATTEMPTS = 2;
          while (selectedRecipes.length < neededMeals && emergencyAttempts < MAX_EMERGENCY_ATTEMPTS) {
            if (budgetRef.remaining <= 0) {
              budgetExceeded = true;
              break;
            }
            if (dayCallStats.randomCalls >= MAX_RANDOM_CALLS_PER_DAY) break;
            const needed = neededMeals - selectedRecipes.length;
            const toFetch = Math.min(20, Math.max(needed * 2, 6));
            const randomBatch = await fetchRandomRecipes(toFetch, isVegetarian, budgetRef, dayCallStats);
            const vegetarianBatch = filterVegetarian(randomBatch, isVegetarian);
            const hydratedBatch = await hydrateNutrition(vegetarianBatch, isVegetarian, nutritionLogContext, budgetRef, dayCallStats);
            const nutritionReady = hydratedBatch.filter(r => r?.nutritionData && r?.id && !seenIds.has(r.id));
            const beforeFill = selectedRecipes.length;
            addScoredEntries(nutritionReady, true);
            filledFromRandomCount += (selectedRecipes.length - beforeFill);
            emergencyAttempts += 1;
          }
        }

        if (isVegetarian) {
          vegetarianPoolCount += selectedRecipes.length;
        }
      } catch (err) {
        if (err?.message === "BUDGET_EXCEEDED") {
          budgetExceeded = true;
          console.warn(`Budget exceeded while fetching recipes for ${abbr}`);
        } else {
          console.error(`Failed to fetch recipes for ${abbr}:`, err);
          return {
            day: abbr,
            date: planDay.dateISO,
            meals: []
          };
        }
      }

      if (selectedRecipes.length < 1) {
        console.warn(`No recipes found for ${abbr} after ${attempts} attempts`);
        return {
          day: abbr,
          date: planDay.dateISO,
          meals: []
        };
      }

      console.log(
        `Day ${abbr} availableFoodsCount=${availableFoodsCount} ` +
        `usedComplexSearch=${useComplexSearch} selectedCount=${selectedRecipes.length} ` +
        `filledFromRandomCount=${filledFromRandomCount}`
      );

      /* ───────── CREATE MEALS FROM RECIPES ───────── */
      for (let i = 0; i < mealTimes.length; i++) {
        const time = mealTimes[i];
        const mins = timeToMinutes(time);
        const type = "normal";

        const selected = selectedRecipes[i];
        const recipe = selected?.recipe ?? selectedRecipes?.[i]?.recipe;
        if (!recipe) {
          console.warn(`Recipe not available for ${abbr} meal index ${i}`);
          continue;
        }

        const ingredients = Array.isArray(recipe.extendedIngredients) 
          ? recipe.extendedIngredients.map(ing => ing.name) 
          : [];

        const macros = recipe.nutritionData;
        if (!macros) {
          console.warn(`Nutrition missing for ${abbr} meal index ${i}`);
          continue;
        }

        const pantryMatches = selected?.pantryMatches ?? (availableFoods.length ? computePantryMatches(recipe, availableFoods) : []);
        const pantryMatchCount = Number.isFinite(selected?.pantryMatchCount)
          ? selected.pantryMatchCount
          : pantryMatches.length;

        meals.push({
          id: recipe.id,
          title: recipe.title,
          time,
          type,
          image: recipe.image ?? null,
          pantryMatches,
          pantryMatchCount,
          ingredients,
          macros,
          source: "spoonacular"
        });
      }

      /* ───────── OPTIONAL SNACK ───────── */
      if (includeSnack && selectedRecipes[mealTimes.length]) {
        const mealMins = mealTimes.map(t => timeToMinutes(t)).filter(m => m !== null).sort((a, b) => a - b);
        let snackMins = mealMins.length >= 2
          ? Math.round((mealMins[0] + mealMins[mealMins.length - 1]) / 2)
          : (mealMins[0] ?? (15 * 60));

        if (isTrainingDay && snackMins >= trainingMins && snackMins < trainingMins + TRAINING_BUFFER) {
          snackMins = trainingMins + TRAINING_BUFFER + 30;
        }

        const snackSelected = selectedRecipes[mealTimes.length];
        const snackRecipe = snackSelected?.recipe;
        if (!snackRecipe) {
          console.warn(`Snack recipe not available for ${abbr}`);
        } else {
          const snackMacros = snackRecipe.nutritionData;
          if (!snackMacros) {
            console.warn(`Nutrition missing for ${abbr} snack`);
          } else {
            const snackPantryMatches = snackSelected?.pantryMatches ?? (availableFoods.length ? computePantryMatches(snackRecipe, availableFoods) : []);
            const snackPantryMatchCount = Number.isFinite(snackSelected?.pantryMatchCount)
              ? snackSelected.pantryMatchCount
              : snackPantryMatches.length;
          meals.push({
              id: snackRecipe.id,
              title: snackRecipe.title,
              time: minutesToTime(snackMins),
              type: "snack",
              image: snackRecipe.image ?? null,
              pantryMatches: snackPantryMatches,
              pantryMatchCount: snackPantryMatchCount,
              ingredients: Array.isArray(snackRecipe.extendedIngredients)
                ? snackRecipe.extendedIngredients.map(ing => ing.name)
                : [],
              macros: snackMacros,
              source: "spoonacular"
            });
          }
        }
      }

      /* ───────── ASSIGN PRE/POST WORKOUT TYPES ───────── */
      if (meals.length) {
        meals.forEach(m => { if (m.type !== "snack") m.type = "normal"; });

        if (isTrainingDay) {
          const sortedMeals = meals
            .filter(m => m.type !== "snack")
            .slice()
            .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
          let preCandidate = null;

          for (const meal of sortedMeals) {
            const mins = timeToMinutes(meal.time);
            if (mins !== null && mins < trainingMins) preCandidate = meal;
          }

          if (!preCandidate) preCandidate = sortedMeals[0];
          if (preCandidate) preCandidate.type = "pre-workout";

          const postCandidate = sortedMeals.find(m => {
            const mins = timeToMinutes(m.time);
            return mins !== null && mins >= trainingMins + TRAINING_BUFFER;
          });

          if (postCandidate && postCandidate !== preCandidate) {
            postCandidate.type = "post-workout";
          }
        }
      }

      /* ───────── DAILY TOTAL CHECK & OPTIONAL SWAP ───────── */
      const sumCalories = meals.reduce((sum, m) => sum + (m.macros?.calories || 0), 0);
      const deviation = Math.round(sumCalories - dailyCalories);

      if (Math.abs(deviation) > 150 && selectedRecipes.length) {
        let worstIndex = -1;
        let worstDistance = -1;
        meals.forEach((m, idx) => {
          const dist = nutritionDistanceScore(m.macros, perMealTargets);
          if (dist > worstDistance) {
            worstDistance = dist;
            worstIndex = idx;
          }
        });

        const usedIds = new Set(meals.map(m => m.id).filter(Boolean));
        const bestCandidate = selectedRecipes.reduce((best, entry) => {
          const candidate = entry.recipe;
          if (!candidate?.nutritionData) return best;
          if (usedIds.has(candidate.id)) return best;
          if (isVegetarian && candidate.vegetarian !== true) return best;
          const dist = nutritionDistanceScore(candidate.nutritionData, perMealTargets);
          if (!best || dist < best.dist) return { recipe: candidate, dist };
          return best;
        }, null);

        if (bestCandidate && worstIndex >= 0 && bestCandidate.dist < worstDistance) {
          const replacement = bestCandidate.recipe;
          const pantryMatches = availableFoods.length ? computePantryMatches(replacement, availableFoods) : [];
          meals[worstIndex] = {
            ...meals[worstIndex],
            id: replacement.id,
            title: replacement.title,
            image: replacement.image ?? null,
            ingredients: Array.isArray(replacement.extendedIngredients)
              ? replacement.extendedIngredients.map(ing => ing.name)
              : [],
            pantryMatches,
            pantryMatchCount: pantryMatches.length,
            macros: replacement.nutritionData,
            source: "spoonacular"
          };
          usedRecipeIdsGlobal.add(replacement.id);
        }
      }

      const finalSumCalories = meals.reduce((sum, m) => sum + (m.macros?.calories || 0), 0);
      const finalDeviation = Math.round(finalSumCalories - dailyCalories);
      console.log(`Day ${abbr} targetCalories=${dailyCalories} sumCalories=${finalSumCalories} deviation=${finalDeviation}`);
      console.log(
        `Day ${abbr} randomCalls=${dayCallStats.randomCalls} complexCalls=${dayCallStats.complexCalls} ` +
        `bulkCalls=${dayCallStats.bulkCalls} budgetLeft=${budgetRef.remaining} finalMeals=${meals.length}`
      );

        return {
          day: abbr,
          date: planDay.dateISO,
          meals
        };
      } catch (err) {
        if (err?.message === "BUDGET_EXCEEDED") {
          console.warn(`Budget exceeded while generating ${abbr}`);
        } else {
          console.error('Error generating plan for', abbr, err);
        }
        return {
          day: abbr,
          date: planDay.dateISO,
          meals: []
        };
      }
  };

  for (const planDay of planDays) {
    const dayPlan = await generateDayPlan(planDay);
    weekPlan.push(dayPlan);
  }

  console.log(
    `Vegetarian mode: ${isVegetarian}; fallback: ${vegetarianFallbackUsed}; veg recipes after filter: ${vegetarianPoolCount}`
  );
  console.log("Spoonacular budget left:", requestBudget);

  return weekPlan;
}

// CORE ENDPOINT: Weekly Meal Plan Generator
app.post("/api/generate-weekly-plan", async (req, res) => {
  console.log("HIT /api/generate-weekly-plan");

  try {
    const generatorConfig = req.body;

    console.log("Received generator config:");
    console.log(generatorConfig);

    const weekPlan = await createDummyWeekPlan(generatorConfig);

    // 🔍 Debug (kurz prüfen)
    console.log("Week plan type:", Array.isArray(weekPlan));

    res.json({
      message: "Weekly plan generated (spoonacular)",
      week: weekPlan
    });
  } catch (error) {
    console.error('Error in /api/generate-weekly-plan:', error);
    res.status(500).json({ error: 'Internal server error', details: error && error.message ? error.message : String(error) });
  }
});

app.post("/api/explain", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY missing" });
    }
    const { message, context } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Missing message" });
    }

    const response = await openai.responses.create({
      model: "gpt-5.2",
      input: [
        {
          role: "system",
          content: "Du bist ein hilfreicher Fitness-Coach in einer Meal-Planning-App.\nErkläre kurz und konkret (max 6–10 Sätze), bezogen auf die Zahlen im Kontext.\nKeine Diagnosen/medizinischen Versprechen. Keine langen Romane.\nWenn Kontext fehlt: gezielt 1 Rückfrage stellen."
        },
        {
          role: "user",
          content: `${message}\n\nKontext: ${JSON.stringify(context ?? {})}`
        }
      ]
    });

    return res.json({ reply: response.output_text.trim() });
  } catch (err) {
    console.error("AI explain error:", err);
    return res.status(500).json({ error: "AI request failed" });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
