import { AppController } from './controller/AppController';
import './style.css';

// Initialize the application controller
const app = new AppController();
if (import.meta.env.DEV) {
  (window as any).app = app;
}

