import { AppExtension } from './AppExtension';
import { AppController } from '../controller/AppController';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export class EventLoggerExtension implements AppExtension {
  id = 'event-logger';
  name = 'Event Logger';

  private controller: AppController | null = null;

  initialize(controller: AppController): void {
    this.controller = controller;
  }

  enable(): void {
    console.log('[EventLoggerExtension] Enabled. Listening for global events...');

    // Listen to the zeroconf events sent from the rust backend
    listen('zeroconf-service-discovered', (event) => {
      console.log('[EventLoggerExtension] Global Event Received: zeroconf-service-discovered', event.payload);
    });
  }

  disable(): void {
  }

  onPlaybackStateChange(status: 'playing' | 'paused' | 'stopped', properties?: any): void {
    console.log(`[EventLoggerExtension] PlaybackStateChange: ${status}`, properties);
  }

  onMetadataChange(metadata?: any, position?: number): void {
    console.log('[EventLoggerExtension] MetadataChange:', metadata, 'Position:', position);
  }
}
