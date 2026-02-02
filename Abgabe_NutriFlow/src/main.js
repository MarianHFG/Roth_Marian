import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { initRouter } from './router.js'

// Router initialisieren
initRouter()

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
