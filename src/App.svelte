<script lang="ts">
  import { onMount } from "svelte";
  import { AppController } from "./controller/AppController";
  import type { IAppView } from "./view/AppView";
  import butterchurn from "butterchurn";
  import { getPresets as getButterchurnPresets } from "butterchurn-presets";

  // State runes
  let serverUrl = $state("http://localhost:1780");
  let status = $state("Disconnected");
  let statusDotClass = $state("");
  let streams = $state<{ id: string; name: string }[]>([]);
  let clients = $state<{ id: string; name: string }[]>([]);
  let presetNames = $state<string[]>([]);
  let currentPreset = $state("");
  let renderScale = $state(1);
  let aaEnabled = $state(true);
  let metadata = $state({
    title: "Ready to Sync",
    artist: "Select a stream and connect",
    art: "",
  });
  let playbackStatus = $state("stopped");
  let shuffle = $state(false);
  let loop = $state<"none" | "track" | "playlist">("none");
  let volume = $state(100);
  let selectedStream = $state("");
  let selectedClient = $state("");
  let theme = $state("theme-neon");
  let settingsVisible = $state(false);
  let isInactive = $state(false);
  let progressPercent = $state(0);
  let isFullscreen = $state(false);
  let loadStreamsLoading = $state(false);
  let isEditingUrl = $state(false);
  let canGoNext = $state(true);
  let canGoPrevious = $state(true);
  let canPlay = $state(true);
  let canPause = $state(true);
  let canControl = $state(true);
  let canSeek = $state(true);
  let streamVolume = $state(100);
  let streamMuted = $state(false);
  let presetListVisible = $state(false);
  let presetSearch = $state("");
  let visShuffle = $state(true);
  let shuffleInterval: any;

  let filteredPresets = $derived(
    presetNames.filter((name) =>
      name.toLowerCase().includes(presetSearch.toLowerCase()),
    ),
  );

  let canvasElement: HTMLCanvasElement;
  let visualizer: any = null;
  let presets: any = null;
  let appController: AppController;

  $effect(() => {
    if (status !== "CONNECTED") {
      isInactive = false;
    }
  });

  const viewImplementation: IAppView = {
    updateStatus(state) {
      status = state;
      statusDotClass = `status-${state.toLowerCase()}`;
    },
    updateMetadata(m) {
      metadata = {
        title: m.title || "Unknown Title",
        artist: m.artist || "Unknown Artist",
        art: m.art || "",
      };
      if (m.position !== undefined && m.duration !== undefined) {
        this.updateProgress(m.position, m.duration);
      }
    },
    updateProgress(pos, dur) {
      if (!dur) return;
      progressPercent = Math.min(100, (pos / dur) * 100);
    },
    setPlaybackStatus(s) {
      playbackStatus = s;
    },
    setPlaybackModes(s, l) {
      shuffle = s;
      loop = l as any;
    },
    updateStreams(sList) {
      streams = sList.map((s: any) => ({
        id: s.id,
        name: s.uri ? s.uri.query?.name || s.id : s.id,
      }));
    },
    updateClients(cList) {
      clients = cList.map((c: any) => ({
        id: c.id,
        name: `${c.host?.name || "Unknown"} (${c.id.substring(0, 6)})`,
      }));
    },
    updateStreamProperties(props) {
      if (props.canGoNext !== undefined) canGoNext = props.canGoNext;
      if (props.canGoPrevious !== undefined)
        canGoPrevious = props.canGoPrevious;
      if (props.canPlay !== undefined) canPlay = props.canPlay;
      if (props.canPause !== undefined) canPause = props.canPause;
      if (props.canControl !== undefined) canControl = props.canControl;
      if (props.canSeek !== undefined) canSeek = props.canSeek;
      if (props.volume !== undefined) streamVolume = props.volume;
      if (props.mute !== undefined) streamMuted = props.mute;
    },
    setLoadStreamsLoading(loading) {
      loadStreamsLoading = loading;
    },
    updateDebugInfo() {},
    setAA(enabled) {
      aaEnabled = enabled;
      visualizer?.setOutputAA(enabled);
    },
    getAA() {
      return aaEnabled;
    },
    setScale(scale) {
      renderScale = scale;
    },
    getScale() {
      return renderScale;
    },
    setServerUrl(url) {
      serverUrl = url;
    },
    getServerUrl() {
      return serverUrl;
    },
    setTheme(t) {
      theme = t;
    },
    getTheme() {
      return theme;
    },
    initVisualizer(audioContext, analyzer) {
      if (!canvasElement) return;
      const bc = (butterchurn as any).createVisualizer
        ? butterchurn
        : (butterchurn as any).default;
      visualizer = bc.createVisualizer(audioContext, canvasElement, {
        width: 1920,
        height: 1080,
        mesh_width: 96,
        mesh_height: 54,
        pixelRatio: 1,
        textureRatio: 1,
      });
      visualizer.connectAudio(analyzer);
      this.shuffle();
      this.resumeLoop();
    },
    stopLoop() {
      loopActive = false;
    },
    resumeLoop() {
      if (loopActive) return;
      loopActive = true;
      const run = () => {
        if (!loopActive) return;
        visualizer?.render();
        requestAnimationFrame(run);
      };
      run();
    },
    loadPreset(name, blend = 2.0) {
      if (visualizer && presets[name]) {
        visualizer.loadPreset(presets[name], blend);
        currentPreset = name;
      }
    },
    shuffle() {
      const names = Object.keys(presets);
      const random = names[Math.floor(Math.random() * names.length)];
      this.loadPreset(random);
    },
    toggleVisShuffle() {
      visShuffle = !visShuffle;
      if (visShuffle) {
        this.startShuffleTimer();
      } else {
        this.stopShuffleTimer();
      }
    },
    startShuffleTimer() {
      this.stopShuffleTimer();
      shuffleInterval = setInterval(() => {
        if (visShuffle) this.shuffle();
      }, 15000);
    },
    stopShuffleTimer() {
      if (shuffleInterval) clearInterval(shuffleInterval);
    },
    nextPreset() {
      if (presetNames.length === 0) return;
      const currentIndex = presetNames.indexOf(currentPreset);
      const nextIndex = (currentIndex + 1) % presetNames.length;
      this.loadPreset(presetNames[nextIndex]);
    },
  };

  let loopActive = false;

  onMount(() => {
    presets = getButterchurnPresets();
    presetNames = Object.keys(presets);

    appController = new AppController(viewImplementation);

    if (visShuffle) viewImplementation.startShuffleTimer();

    const handleFS = () => {
      isFullscreen = !!document.fullscreenElement;
    };
    document.addEventListener("fullscreenchange", handleFS);

    let activityTimer: any;
    const handleActivity = () => {
      isInactive = false;
      clearTimeout(activityTimer);
      activityTimer = setTimeout(() => {
        if (!settingsVisible && !presetListVisible && status === "CONNECTED") {
          isInactive = true;
        }
      }, 3000);
    };
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    handleActivity(); // Start initial timer

    return () => {
      document.removeEventListener("fullscreenchange", handleFS);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      loopActive = false;
      viewImplementation.stopShuffleTimer();
    };
  });

  function toggleSettings() {
    settingsVisible = !settingsVisible;
  }
  function toggleFullscreen() {
    const app = document.getElementById("app");
    if (!document.fullscreenElement) {
      app?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
</script>

<div id="app-container" class:inactive={isInactive} class={theme}>
  <header>
    <div class="logo-area">
      <h1>ButterSync</h1>
      <div id="status-indicator" class={statusDotClass}>
        <button
          class="status-action-btn"
          onclick={() => {
            if (status === "CONNECTED") {
              appController.handleDisconnect();
            } else {
              appController.handleLoadStreams(serverUrl);
              appController.handleConnect(serverUrl, selectedStream);
            }
          }}
          aria-label={status === "CONNECTED" ? "Disconnect" : "Connect"}
          title={status}
        >
          <span
            class:icon-connected={status === "CONNECTED"}
            class:icon-disconnected={status !== "CONNECTED"}
          ></span>
        </button>
        <div class="status-info-area">
          {#if !isEditingUrl}
            <span
              class="status-label"
              role="button"
              tabindex="0"
              onclick={() => (isEditingUrl = true)}
              onkeydown={(e) => e.key === "Enter" && (isEditingUrl = true)}
            >
              {status}
            </span>
            <button
              class="edit-btn"
              onclick={() => (isEditingUrl = true)}
              aria-label="Edit URL"
              title="Edit URL"
            >
              <span class="icon-pencil"></span>
            </button>
          {:else}
            <input
              type="text"
              bind:value={serverUrl}
              placeholder="Snapserver URL"
              onblur={() => (isEditingUrl = false)}
              onkeydown={(e) => e.key === "Enter" && (isEditingUrl = false)}
            />
          {/if}
        </div>
      </div>
    </div>
    <div class="vis-info-area">
      <button class="vis-name-btn" onclick={() => (presetListVisible = true)}>
        {currentPreset || "Select Visualization"}
      </button>
      <div class="vis-controls">
        <button
          class="icon-btn"
          class:active={visShuffle}
          onclick={() => viewImplementation.toggleVisShuffle()}
          title="Toggle Shuffle"
        >
          <span class="icon-shuffle"></span>
        </button>
        <button
          class="icon-btn"
          onclick={() => viewImplementation.nextPreset()}
          title="Next Visualization"
        >
          <span class="icon-next"></span>
        </button>
      </div>
    </div>

    <div class="header-controls">
      <button class="icon-btn" onclick={toggleSettings} aria-label="Settings">
        <span class="icon-gear"></span>
      </button>
    </div>
  </header>

  <main>
    <canvas bind:this={canvasElement} width="1920" height="1080" id="canvas"
    ></canvas>

    <div
      id="visual-settings-panel"
      class="hud-panel"
      class:hidden={!settingsVisible}
    >
      <div class="panel-header">
        <h3>Visual Settings</h3>
        <button
          class="close-btn"
          onclick={() => (settingsVisible = false)}
          aria-label="Close settings"
        >
          <span class="icon-close"></span>
        </button>
      </div>
      <div class="visual-controls">
        <div class="control-group">
          <div class="control-label">
            <span class="icon-palette"></span>
            <span>Theme</span>
          </div>
          <select
            bind:value={theme}
            onchange={() => appController.handleShuffle()}
            aria-label="Select theme"
          >
            <option value="theme-neon">Neon (Default)</option>
            <option value="theme-sunset">Sunset</option>
            <option value="theme-forest">Forest</option>
            <option value="theme-midnight">Midnight</option>
          </select>
        </div>

        <div class="control-group">
          <div class="control-label">
            <span class="icon-scale"></span>
            <span>Render Scale</span>
          </div>
          <select bind:value={renderScale} aria-label="Select render scale">
            <option value={0.5}>0.5x</option>
            <option value={1}>1.0x</option>
            <option value={2.0}>2.0x</option>
          </select>
        </div>

        <div class="control-group">
          <div class="control-label">
            <span class="icon-aa"></span>
            <span>Anti-Aliasing</span>
          </div>
          <label class="switch">
            <input
              type="checkbox"
              bind:checked={aaEnabled}
              aria-label="Toggle anti-aliasing"
              title="Toggle anti-aliasing"
            />
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>

    {#if presetListVisible}
      <div
        class="modal-overlay"
        onclick={() => (presetListVisible = false)}
        onkeydown={(e) => e.key === "Escape" && (presetListVisible = false)}
        role="presentation"
      >
        <div
          class="modal-content"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabindex="-1"
        >
          <div class="modal-header">
            <h3 id="modal-title">Select Visualization</h3>
            <button
              class="close-btn"
              onclick={() => (presetListVisible = false)}
              aria-label="Close visualization selector"
            >
              <span class="icon-close"></span>
            </button>
          </div>
          <div class="search-box">
            <span class="icon-search"></span>
            <input
              type="text"
              bind:value={presetSearch}
              placeholder="Search visualizations..."
            />
          </div>
          <div class="preset-list">
            {#each filteredPresets as name}
              <button
                class="preset-item"
                class:active={name === currentPreset}
                onclick={() => {
                  viewImplementation.loadPreset(name);
                  presetListVisible = false;
                }}
              >
                {name}
              </button>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <div id="playback-hud" class="hud-panel">
      <div id="metadata-area" class:hidden={!metadata.title}>
        {#if metadata.art}
          <img id="album-art" src={metadata.art} alt="Album Art" />
        {/if}
        <div class="track-info">
          <h2>{metadata.title}</h2>
          <p>{metadata.artist}</p>
        </div>
      </div>

      <div class="central-controls">
        <div class="playback-buttons">
          <button
            class="icon-btn"
            class:active={shuffle}
            onclick={() => appController.handlePlaybackShuffle()}
            aria-label="Shuffle"
            title="Shuffle"
          >
            <span class="icon-shuffle"></span>
          </button>
          <button
            class="icon-btn"
            onclick={() => appController.handleControl("previous")}
            disabled={!canGoPrevious}
            aria-label="Previous"
            title="Previous"
          >
            <span class="icon-prev"></span>
          </button>
          <button
            class="icon-btn"
            onclick={() =>
              appController.handleControl(
                playbackStatus === "playing" ? "pause" : "play",
              )}
            disabled={playbackStatus === "playing" ? !canPause : !canPlay}
            aria-label={playbackStatus === "playing" ? "Pause" : "Play"}
            title={playbackStatus === "playing" ? "Pause" : "Play"}
          >
            <!-- icon-play and icon-pause must both be present statically for UnoCSS to extract them -->
            <span
              class:icon-play={playbackStatus !== "playing"}
              class:icon-pause={playbackStatus === "playing"}
            ></span>
          </button>
          <button
            class="icon-btn"
            onclick={() => appController.handleControl("next")}
            disabled={!canGoNext}
            aria-label="Next"
            title="Next"
          >
            <span class="icon-next"></span>
          </button>
          <button
            class="icon-btn"
            class:active={loop !== "none"}
            onclick={() => appController.handlePlaybackLoop()}
            aria-label="Loop mode"
            title="Loop mode"
          >
            <!-- All loop states must be present statically for UnoCSS -->
            <span
              class:icon-loop-none={loop === "none"}
              class:icon-loop-track={loop === "track"}
              class:icon-loop-playlist={loop === "playlist"}
            ></span>
          </button>
          <button
            class="icon-btn"
            onclick={toggleFullscreen}
            class:active={isFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            <span
              class:icon-windowed={isFullscreen}
              class:icon-fullscreen={!isFullscreen}
            ></span>
          </button>
        </div>
        <div id="progress-container">
          <div id="progress-bar" style="width: {progressPercent}%"></div>
        </div>
      </div>

      <div class="audio-controls">
        <div class="control-row">
          <span id="volume-icon"><span class="icon-volume"></span></span>
          <input
            type="range"
            bind:value={volume}
            min="0"
            max="100"
            oninput={() => appController.handleVolumeChange(volume)}
          />
        </div>
        <div class="selection-row">
          <select
            bind:value={selectedStream}
            title="Source Stream"
            onfocus={() => appController.handleLoadStreams(serverUrl)}
          >
            <option value="">Default Stream</option>
            {#each streams as stream}
              <option value={stream.id}>{stream.name}</option>
            {/each}
          </select>
          <select
            bind:value={selectedClient}
            title="Playback Device"
            onchange={() => appController.handleClientChange(selectedClient)}
          >
            <option value="">This Browser</option>
            {#each clients as client}
              <option value={client.id}>{client.name}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>
  </main>
</div>
