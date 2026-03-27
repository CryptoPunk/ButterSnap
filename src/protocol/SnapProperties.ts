export interface StreamMetadata {
  trackId?: string;
  file?: string;
  duration?: number;
  artist?: string[];
  album?: string;
  title?: string;
  artUrl?: string;
  artData?: {
    data: string;
    extension: string;
  };
  genre?: string[];
  trackNumber?: string;
}

export interface StreamProperties {
  playbackStatus: 'playing' | 'paused' | 'stopped';
  loopStatus: 'none' | 'track' | 'playlist';
  shuffle: boolean;
  volume: number;
  mute: boolean;
  rate: number;
  position: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
  canPlay: boolean;
  canPause: boolean;
  canSeek: boolean;
  canControl: boolean;
  metadata?: StreamMetadata;
}
