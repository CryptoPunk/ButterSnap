import { AppController } from './controller/AppController';
import './style.css';
import 'virtual:uno.css';

// Initialize the application controller
const app = new AppController();
if (import.meta.env.DEV) {
  (window as any).app = app;
}

