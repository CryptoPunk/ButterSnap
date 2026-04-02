import { AppController } from '../controller/AppController';

export interface AppExtension {
  id: string;
  name: string;
  
  initialize(controller: AppController): void;
  enable(): void;
  disable(): void;
  destroy?(): void;
  
  onPlaybackStateChange?(status: 'playing' | 'paused' | 'stopped', properties?: any): void;
  onMetadataChange?(metadata?: any, position?: number): void;
}
