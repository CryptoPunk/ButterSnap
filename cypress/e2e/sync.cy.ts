import { Tv } from '../../src/protocol/TimeProvider';
import { TimeMessage, PcmChunkMessage, MessageType } from '../../src/protocol/SnapMessage';

describe('Audio/Visualizer Sync Precision', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        // Mock AudioContext to control currentTime
        class MockAudioBufferSource {
          buffer = null;
          connect() {}
          start() {}
        }

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
          createBufferSource() {
            const source = new MockAudioBufferSource();
            cy.spy(source, 'start').as('sourceStart');
            return source;
          }
          createBuffer(channels: number, length: number, rate: number) {
            return {
              duration: length / rate,
              getChannelData: () => new Float32Array(length),
            };
          }
          resume() { return Promise.resolve(); }
          destination = {};
        }

        (win as any).AudioContext = MockAudioContext;
        (win as any).webkitAudioContext = MockAudioContext;

        // Mock WebSocket to prevent network errors
        class MockWebSocket extends EventTarget {
          binaryType = 'blob';
          readyState = 1; // OPEN
          onopen: any;
          onmessage: any;
          onclose: any;
          onerror: any;
          constructor() {
            super();
            setTimeout(() => { if (this.onopen) this.onopen(); }, 10);
          }
          send() {}
          close() {}
        }
        (win as any).WebSocket = MockWebSocket;

        // Ensure app is accessible
        Cypress.on('uncaught:exception', () => false);
      }
    });
  });

  it('calculates correct playback startTime based on server-time sync', () => {
    cy.window().then((win: any) => {
      const app = win.app;
      
      // Stub initVisualizer to prevent crashes with mocked AudioContext
      cy.stub(app.view, 'initVisualizer');
      
      // 1. Setup - trigger connect to initialize audioContext and client
      cy.get('#server-url').clear().type('http://localhost:1780'); // Mocked port
      cy.get('#connect-btn').click();

      // Wait for app state to initialize via UI status
      cy.get('#status').should('not.have.text', 'Disconnected');

      // Now check app properties
      cy.window().should((win: any) => {
        expect(win.app.client).to.not.be.null;
        expect(win.app.audioContext).to.not.be.null;
      }).then(() => {
        const audioContext = app.audioContext;
        const client = app.client;

        // 2. Simulate server-time drift: Server is 5000ms (5s) ahead of local time
        // We do this by feeding a real TimeMessage to the client
        // diff = (c2s - s2c) / 2
        // If we want diff = 5000, we can set c2s = 10000 and s2c = 0 (ideal world)
        // In SnapClient.ts:
        //   roundTrip = now - sent (we'll make sent = now so roundTrip = 0)
        //   serverLatency = time.latency (we'll make latency = 10000)
        //   diff = (10000 - 0) / 2 = 5000. Correct.
        
        const timeMsg = new TimeMessage();
        const now = audioContext.currentTime * 1000;
        timeMsg.sent = new Tv();
        timeMsg.sent.setMilliseconds(now);
        timeMsg.latency = new Tv();
        timeMsg.latency.setMilliseconds(10000); // Drift 10s c2s
        
        (client as any).handleMessage({ data: timeMsg.serialize() });
        expect(client.timeProvider.diff).to.equal(5000); // (10000 - 0) / 2
        
        // Fix audioContext.currentTime for predictability
        audioContext.currentTime = 10.0; // 10s in local time

        // 3. Inject a PCM chunk with server timestamp
        // Server timestamp is 15500 (which corresponds to local 10500)
        // Expected localStartTime = (15500 - 5000) + 200 = 10700ms = 10.7s
        const pcmMsg = new PcmChunkMessage();
        pcmMsg.timestamp = new Tv();
        pcmMsg.timestamp.setMilliseconds(15500);
        pcmMsg.payload = new ArrayBuffer(8000);

        // We use the real message handler to test binary parsing too
        (client as any).handleMessage({ data: pcmMsg.serialize() });

        // 4. Validate sync precision
        cy.get('@sourceStart').should('have.been.calledWith', 10.7);
      });
    });
  });

  it('handles negative latency by clamping to currentTime', () => {
    cy.window().then((win: any) => {
      const app = win.app;
      // Stub initVisualizer to prevent crashes with mocked AudioContext
      cy.stub(app.view, 'initVisualizer');
      
      cy.get('#connect-btn').click();
      cy.get('#status').should('not.have.text', 'Disconnected');

      cy.window().should((win: any) => {
        expect(win.app.client).to.not.be.null;
      }).then((win: any) => {
        const app = win.app;
        const audioContext = app.audioContext;
        const client = app.client;
        client.timeProvider.diff = 0;
        audioContext.currentTime = 20.0;

        // Packet arrives "late": server time 19000ms. 
        // localTime = 19000 + 200 = 19.2s. But current is 20.0s.
        // It should clamp to 20.0
        const pcmMsg = new PcmChunkMessage();
        pcmMsg.timestamp = new Tv();
        pcmMsg.timestamp.setMilliseconds(19000);
        pcmMsg.payload = new ArrayBuffer(100);

        (client as any).handleMessage({ data: pcmMsg.serialize() });
        
        cy.get('@sourceStart').should('have.been.calledWith', 20.0);
      });
     });
  });

  it('calculates median drift correctly under network jitter', () => {
    cy.window().then((win: any) => {
      const app = win.app;
      cy.stub(app.view, 'initVisualizer');
      cy.get('#connect-btn').click();
      
      cy.window().should((win: any) => expect(win.app.client).to.not.be.null).then((win: any) => {
        const client = win.app.client;
        
        // Use a fixed local reference time
        const localNow = 1000;
        
        // We want various sync samples that should average to 5000ms drift
        // c2s - s2c = 2 * diff
        // If s2c is 0 (immediate response), then serverLatency (c2s) should be 10000 to get diff = 5000
        const serverDrifts = [4800, 5200, 5000, 4900, 5100];
        
        serverDrifts.forEach(drift => {
           const timeMsg = new TimeMessage();
           timeMsg.sent = new Tv();
           timeMsg.sent.setMilliseconds(localNow);
           
           timeMsg.latency = new Tv();
           // In SnapClient: roundTrip = now - sent = 1000 - 1000 = 0
           // setDiff(latency, 0) => diff = latency / 2
           // So if we want diff = drift, we set latency = drift * 2
           timeMsg.latency.setMilliseconds(drift * 2);
           
           (client as any).handleMessage({ data: timeMsg.serialize() });
        });

        // Median of [4800, 4900, 5000, 5100, 5200] is 5000
        expect(client.timeProvider.diff).to.equal(5000);
      });
    });
  });
});
