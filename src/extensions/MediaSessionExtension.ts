import { AppExtension } from './AppExtension';
import { AppController } from '../controller/AppController';

export class MediaSessionExtension implements AppExtension {
  id = 'plugin.media-session';
  name = 'Media Session API';
  
  private controller: AppController | null = null;
  private isEnabled = true;

  public initialize(controller: AppController): void {
    this.controller = controller;
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => {
      if (this.controller?.controlClient && this.controller.currentStreamId) {
        this.controller.controlClient.controlStream(this.controller.currentStreamId, 'play');
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      if (this.controller?.controlClient && this.controller.currentStreamId) {
        this.controller.controlClient.controlStream(this.controller.currentStreamId, 'pause');
      }
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      if (this.controller?.controlClient && this.controller.currentStreamId) {
        this.controller.controlClient.controlStream(this.controller.currentStreamId, 'stop');
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (this.controller?.controlClient && this.controller.currentStreamId) {
        this.controller.controlClient.controlStream(this.controller.currentStreamId, 'next');
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (this.controller?.controlClient && this.controller.currentStreamId) {
        this.controller.controlClient.controlStream(this.controller.currentStreamId, 'previous');
      }
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (this.controller?.controlClient && this.controller.currentStreamId && details.seekTime !== undefined) {
        this.controller.controlClient.controlStream(this.controller.currentStreamId, 'seek', { position: Math.round(details.seekTime * 1000) });
      }
    });
  }

  public enable(): void {
    this.isEnabled = true;
  }

  public disable(): void {
    this.isEnabled = false;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.metadata = null;
    }
  }

  public destroy(): void {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', null);
    navigator.mediaSession.setActionHandler('pause', null);
    navigator.mediaSession.setActionHandler('stop', null);
    navigator.mediaSession.setActionHandler('nexttrack', null);
    navigator.mediaSession.setActionHandler('previoustrack', null);
    navigator.mediaSession.setActionHandler('seekto', null);
    navigator.mediaSession.playbackState = 'none';
    navigator.mediaSession.metadata = null;
  }

  public onPlaybackStateChange(status: 'playing' | 'paused' | 'stopped', properties?: any): void {
    if (!this.isEnabled || typeof navigator === 'undefined' || !navigator.mediaSession) return;

    try {
      navigator.mediaSession.playbackState = status === 'playing' ? 'playing' : (status === 'paused' ? 'paused' : 'none');

      if (properties?.metadata?.duration && typeof navigator.mediaSession.setPositionState === 'function') {
        navigator.mediaSession.setPositionState({
          duration: properties.metadata.duration / 1000,
          playbackRate: properties.rate || 1,
          position: Math.min(properties.position / 1000, properties.metadata.duration / 1000)
        });
      }
    } catch (e) {
      console.error('MediaSession update failed', e);
    }
  }

  public onMetadataChange(metadata?: any, position?: number): void {
    if (!this.isEnabled || !metadata || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: metadata.title || 'Live Stream',
      artist: Array.isArray(metadata.artist) ? metadata.artist.join(', ') : (metadata.artist || 'Snapcast'),
      album: metadata.album || '',
      artwork: metadata.artUrl ? [{ src: metadata.artUrl }] : []
    });
  }
}
