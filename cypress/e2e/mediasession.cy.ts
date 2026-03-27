describe('Media Session API Bridge', () => {
  beforeEach(() => {
    // Visit the app and wait for it to load
    cy.visit('/', {
      onBeforeLoad(win) {
        // Mock mediaSession if not present (some CI browsers might lack it)
        if (!win.navigator.mediaSession) {
          (win.navigator as any).mediaSession = {
            metadata: {},
            playbackState: 'none',
            setActionHandler: cy.stub().as('setActionHandler'),
            setPositionState: cy.stub().as('setPositionState'),
          };
        } else {
          // Wrap existing methods for spying
          cy.spy(win.navigator.mediaSession, 'setActionHandler').as('setActionHandler');
          cy.spy(win.navigator.mediaSession, 'setPositionState').as('setPositionState');
        }
      }
    });

    Cypress.on('uncaught:exception', (err, runnable) => {
      // returning false here prevents Cypress from failing the test
      return false;
    });
  });

  it('sets up media session action handlers on init', () => {
    // Verify that the controller registered handlers
    cy.get('@setActionHandler').should('have.been.calledWith', 'play');
    cy.get('@setActionHandler').should('have.been.calledWith', 'pause');
    cy.get('@setActionHandler').should('have.been.calledWith', 'stop');
    cy.get('@setActionHandler').should('have.been.calledWith', 'nexttrack');
    cy.get('@setActionHandler').should('have.been.calledWith', 'previoustrack');
    cy.get('@setActionHandler').should('have.been.calledWith', 'seekto');
  });

  it('sends JSON-RPC command when media session "play" is triggered', () => {
    cy.window().then((win: any) => {
      const app = win.app;
      
      cy.get('#load-streams-btn').click();
      cy.get('#stream-selector').should('not.be.disabled');
      cy.get('#stream-selector').select(1);
      
      // Connect to the stream to set currentStreamId
      cy.get('#connect-btn').click().then(() => {
          expect(app.currentStreamId).to.not.be.null;

          // Spy on controlClient.controlStream
          cy.spy(app.controlClient, 'controlStream').as('controlStream');
          
          // Trigger Media Session play
          const handlers: any = {};
          (win.navigator.mediaSession.setActionHandler as any).getCalls().forEach((call: any) => {
            handlers[call.args[0]] = call.args[1];
          });
          
          if (handlers.play) {
            handlers.play();
          }
          
          // @ts-ignore
          cy.get('@controlStream').should('have.been.calledWith', app.currentStreamId, 'play');
      });
    });
  });

  it('updates media metadata when OnUpdate notification arrives', () => {
    cy.window().then((win: any) => {
      const app = win.app;
      
      // Ensure control client is connected
      cy.get('#load-streams-btn').click();
      cy.get('#stream-selector').should('not.be.disabled').select(1);
      cy.get('#connect-btn').click();
      
      cy.wait(500).then(() => {
        // Manually dispatch a notification to the app's handler
        app.handleNotification({
          method: 'Stream.OnUpdate',
          params: {
            id: app.currentStreamId || 'test',
            stream: {
              metadata: {
                title: 'Cyberfunk 2077',
                artist: ['Neural Link'],
                album: 'DeepMind 1',
                duration: 240000
              },
              properties: {
                playbackStatus: 'playing',
                duration: 240000,
                position: 42000
              }
            }
          }
        });

        // Verify mediaSession update
        expect(win.navigator.mediaSession.metadata.title).to.equal('Cyberfunk 2077');
        expect(win.navigator.mediaSession.metadata.artist).to.equal('Neural Link');
        cy.get('@setPositionState').should('have.been.called');
      });
    });
  });
});
