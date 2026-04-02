import { StreamProperties } from '../protocol/SnapProperties';

export interface ViewEvents {
  onConnect: (url: string, streamId?: string) => void;
  onDisconnect: () => void;
  onLoadStreams: (url: string) => void;
  onPresetChange: (name: string) => void;
  onShuffle: () => void;
  onScaleChange: (scale: number) => void;
  onAaToggle: (enabled: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onToggleShuffle: () => void;
  onToggleLoop: () => void;
  onVolumeChange: (volume: number) => void;
  onClientChange: (clientId: string) => void;
  onThemeChange: (theme: string) => void;
}

export interface IAppView {
  updateStatus(state: string): void;
  updateMetadata(metadata: any): void;
  updateStreamProperties(props: StreamProperties): void;
  updateProgress(position: number, duration: number): void;
  setPlaybackStatus(status: string): void;
  setPlaybackModes(shuffle: boolean, loopStatus: string): void;
  updateStreams(streams: any[]): void;
  updateClients(clients: any[]): void;
  setLoadStreamsLoading(loading: boolean): void;
  updateDebugInfo(chunks: number, latency: number): void;
  setAA(enabled: boolean): void;
  getAA(): boolean;
  setScale(scale: number): void;
  getScale(): number;
  setServerUrl(url: string): void;
  getServerUrl(): string;
  setTheme(theme: string): void;
  getTheme(): string;
  initVisualizer(audioContext: AudioContext, analyzer: AnalyserNode): void;
  stopLoop(): void;
  resumeLoop(): void;
  loadPreset(name: string, blend?: number): void;
  shuffle(): void;
}
