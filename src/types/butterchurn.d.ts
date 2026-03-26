declare module 'butterchurn' {
  export interface VisualizerOptions {
    width: number;
    height: number;
    pixelRatio?: number;
    textureRatio?: number;
  }

  export interface Visualizer {
    render(): void;
    connectAudio(audioNode: AudioNode | AnalyserNode): void;
    loadPreset(preset: any, blendTime?: number): void;
    setOptions(options: VisualizerOptions): void;
    setRendererSize(width: number, height: number, options: any): void;
    setOutputAA(enabled: boolean): void;
    setInternalMeshSize(width: number, height: number): void;
  }

  export function createVisualizer(
    audioContext: AudioContext,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    options: VisualizerOptions
  ): Visualizer;
}

declare module 'butterchurn-presets' {
  const presets: { [key: string]: any };
  export function getPresets(): { [key: string]: any };
}
