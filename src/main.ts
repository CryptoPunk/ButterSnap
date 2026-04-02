import { mount } from 'svelte';
import App from './App.svelte';
import '@fontsource/outfit';
import './style.css';
import 'virtual:uno.css';

// Initialize the Svelte application
const app = mount(App, { target: document.getElementById('app')! });

export default app;
