/**
 * ButterSync: Snapcast & Butterchurn Integration Library
 */

// UI Components
export { default as App } from './App.svelte';

// Clients
export { SnapClient } from './client/SnapClient';
export type { SnapClientState } from './client/SnapClient';
export { SnapControlClient } from './client/SnapControlClient';
export type { 
  JsonRpcRequest, 
  JsonRpcResponse, 
  JsonRpcNotification 
} from './client/SnapControlClient';

// MVC Components
export { AppController } from './controller/AppController';
export type { IAppView, ViewEvents } from './view/AppView';

// Protocol
export { 
  MessageType, 
  SnapMessage, 
  HelloMessage, 
  PcmChunkMessage, 
  CodecMessage, 
  ServerSettingsMessage, 
  TimeMessage, 
  SampleFormat 
} from './protocol/SnapMessage';
export type { StreamMetadata, StreamProperties } from './protocol/SnapProperties';
export { TimeProvider, Tv } from './protocol/TimeProvider';

// Extensions
export type { AppExtension } from './extensions/AppExtension';
export { MediaSessionExtension } from './extensions/MediaSessionExtension';