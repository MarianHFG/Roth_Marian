# NutriFlow

Meal-Planning App (Svelte SPA + Express Backend). Erstellt Wochenpläne basierend auf Kalorien/Makros, Trainingstagen und optionalen „Available Foods“. Zusätzlich gibt es einen Coach-Block (OpenAI) für kurze Erklärungen.

## Features
- Wochenplan-Generator (Meals/Tag + optional Snack)
- Trainingstage + Uhrzeit → Pre-/Post-Workout Labeling
- Available Foods: Autocomplete (DE Anzeige), Matching pro Rezept (`pantryMatchCount`)
- Vegetarisch Toggle im Profil → vegetarische Meals
- Coach/Chatbot: kurze Erklärungen über OpenAI

## Tech / Setup
- Frontend: Svelte (ohne SvelteKit), JavaScript
- Backend: Node.js + Express
- Ports: Frontend **5173**, Backend **3000**
- Externe Services: Spoonacular (Rezepte + Nutrition), OpenAI (Coach)

## Installation
- Voraussetzung: Node.js
- Dependencies installieren:
  - im Projekt-Root: `npm install`
  - im Ordner `backend`: `npm install`

## Konfiguration (Keys)
Datei: `backend/.env`

## Projekt Prozess
- (Google Drive)

