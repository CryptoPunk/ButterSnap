declare module 'butterchurn' {
  export interface VisualizerOptions {
    width: number;
    height: number;
    mesh_width?: number;
    mesh_height?: number;
    pixelRatio?: number;
    textureRatio?: number;
  }

  export interface Visualizer {
    render(): void;
    connectAudio(audioNode: AudioNode | AnalyserNode): void;
    loadPreset(preset: any, blendTime?: number): void;
    setOptions(options: VisualizerOptions): void;
    setOutputAA(enabled: boolean): void;
    setInternalMeshSize(width: number, height: number): void;
    loadExtraImages(images: { [key: string]: string }): Promise<void>;
  }

  export function createVisualizer(
    audioContext: AudioContext,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    options: VisualizerOptions
  ): Visualizer;

  const butterchurn: {
    createVisualizer: typeof createVisualizer;
  };
  export default butterchurn;
}

declare module 'butterchurn-presets' {
  export function getPresets(): { [key: string]: any };

  const butterchurnPresets: {
    getPresets: typeof getPresets;
  };
  export default butterchurnPresets;
}
