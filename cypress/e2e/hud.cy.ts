describe('Premium HUD & Media Interaction', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        // Mock AudioContext to prevent actual audio initialization
        class MockAudioContext {
          currentTime = 0;
          state = 'running';
          createAnalyser() {
            return {
              fftSize: 2048,
              connect: () => {},
              getByteFrequencyData: () => {},
              getByteTimeDomainData: () => {},
            };
          }
          resume() { return Promise.resolve(); }
          destination = {};
        }
        (win as any).AudioContext = MockAudioContext;
        (win as any).webkitAudioContext = MockAudioContext;

        // Mock mediaSession if not present or to isolate it
        if (!(win.navigator as any).mediaSession) {
          (win.navigator as any).mediaSession = {
            metadata: {},
            playbackState: 'none',
            setActionHandler: () => {},
            setPositionState: () => {},
          };
        } else {
          // Stub it to prevent browser feedback loops during tests
          cy.stub(win.navigator.mediaSession, 'setActionHandler').as('setActionHandler');
          cy.stub(win.navigator.mediaSession, 'setPositionState').as('setPositionState');
          // Important: bypass the automatic state management of the browser
          Object.defineProperty(win.navigator.mediaSession, 'playbackState', {
             get: function() { return this._state || 'none'; },
             set: function(s) { this._state = s; },
             configurable: true
          });
        }

        // Mock WebSocket for the Control and Streaming interfaces
        class MockWebSocket extends EventTarget {
          binaryType = 'blob';
          readyState = 1;
          onopen: any;
          onmessage: any;
          constructor() {
            super();
            setTimeout(() => { if (this.onopen) this.onopen(); }, 10);
          }
          send(data: string) {
            const req = JSON.parse(data);
            if (req.method === 'Server.GetStatus') {
              setTimeout(() => {
                if (this.onmessage) {
                  this.onmessage({
                    data: JSON.stringify({
                      jsonrpc: '2.0',
                      result: { server: { streams: [] } },
                      id: req.id
                    })
                  });
                }
              }, 10);
            } else if (req.id) {
              setTimeout(() => {
                if (this.onmessage) {
                  this.onmessage({
                    data: JSON.stringify({
                      jsonrpc: '2.0',
                      result: 'ok',
                      id: req.id
                    })
                  });
                }
              }, 10);
            }
          }
          close() {}
        }
        (win as any).WebSocket = MockWebSocket;
      }
    });
  });

  const connectToStream = (streamId = 'test-stream') => {
    cy.window().then((win: any) => {
      const app = win.app;
      // Mock the stream listing so we can select one
      cy.stub(app.view, 'initVisualizer');
      
      // Simulate receiving stream list
      app.view.updateStreams([{ id: streamId, uri: { query: { name: 'Test Stream' } } }]);
      cy.get('#stream-selector').select(streamId);
      cy.get('#connect-btn').click();
      
      // Check connected state
      cy.get('#status').should('contain', 'CONNECTED');
      
      // Wait for control client to be initialized and OPEN
      cy.window().its('app.controlClient').should('not.be.null');
      cy.window().its('app.controlClient.socket.readyState').should('equal', 1);
    });
  };

  it('updates metadata HUD on track changes', () => {
    const streamId = 'metadata-test';
    connectToStream(streamId);
    
    cy.window().then((win: any) => {
      const app = win.app;
      const notification = {
        jsonrpc: '2.0',
        method: 'Stream.OnProperties',
        params: {
          id: streamId,
          metadata: {
            title: 'Interstellar Synth',
            artist: ['Cosmic Voyager'],
            album: 'Nebula Fragments'
          }
        }
      };
      
      (app.controlClient as any).handleMessage({ data: JSON.stringify(notification) });
      
      cy.get('#track-title').should('have.text', 'Interstellar Synth');
      cy.get('#track-artist').should('have.text', 'Cosmic Voyager');
      cy.get('#metadata-hud').should('not.have.class', 'hidden');
    });
  });

  it('renders track progress accurately', () => {
    const streamId = 'progress-test';
    connectToStream(streamId);
    
    cy.window().then((win: any) => {
      const app = win.app;
      const notification = {
        jsonrpc: '2.0',
        method: 'Stream.OnProperties',
        params: {
          id: streamId,
          playbackStatus: 'playing',
          position: 150000, // 150s
          metadata: {
            duration: 300000 // 300s
          }
        }
      };
      
      (app.controlClient as any).handleMessage({ data: JSON.stringify(notification) });
      
      cy.get('#progress-bar').should(($el) => {
        expect($el[0].style.width).to.equal('50%');
      });
    });
  });

  it('displays album art when provided', () => {
    const streamId = 'art-test';
    connectToStream(streamId);
    
    cy.window().then((win: any) => {
      const app = win.app;
      const testArtUrl = 'https://example.com/art.jpg';
      const notification = {
        jsonrpc: '2.0',
        method: 'Stream.OnProperties',
        params: {
          id: streamId,
          metadata: {
            title: 'Artist',
            artist: ['Title'],
            artUrl: testArtUrl
          }
        }
      };
      
      (app.controlClient as any).handleMessage({ data: JSON.stringify(notification) });
      cy.get('#album-art').should('be.visible').and('have.attr', 'src', testArtUrl);
    });
  });

  it('updates playback controls on server-side status changes', () => {
    const streamId = 'status-test';
    connectToStream(streamId);
    
    cy.window().then((win: any) => {
      const app = win.app;
      
      // 1. Simulate playing status
      cy.window().then((win: any) => {
        win.app.updatePlaybackState('playing');
      });
      
      cy.wait(100).then(() => {
        cy.window().its('app.playbackStatus').should('equal', 'playing');
        cy.get('#play-pause-btn').should('have.class', 'playing');
      });
      
      // 2. Simulate paused status
      cy.window().then((win: any) => {
        win.app.updatePlaybackState('paused');
      });
      
      cy.wait(100).then(() => {
        cy.window().its('app.playbackStatus').should('equal', 'paused');
        cy.get('#play-pause-btn').should('not.have.class', 'playing');
      });
    });
  });

  it('sends control commands when UI buttons are clicked', () => {
    const streamId = 'cmd-test';
    connectToStream(streamId);
    
    cy.window().then((win: any) => {
      const app = win.app;
      cy.spy(app.controlClient, 'controlStream').as('controlCmd');
      
      cy.get('#play-pause-btn').click();
      cy.get('@controlCmd').should('have.been.calledWith', streamId, 'play');
      
      cy.get('#next-btn').click();
      cy.get('@controlCmd').should('have.been.calledWith', streamId, 'next');
      
      cy.get('#prev-btn').click();
      cy.get('@controlCmd').should('have.been.calledWith', streamId, 'previous');
    });
  });
});
