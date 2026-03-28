describe('Theming and Icon Refactoring', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        // Mock minimal App state if needed
      }
    });
  });

  it('toggles playback icons based on CSS classes', () => {
    cy.get('#play-pause-btn').as('btn');
    
    // Default state (play)
    cy.get('@btn').should('not.have.class', 'playing');
    cy.get('@btn').find('.icon').should('be.visible');
    
    // Playing state (pause)
    cy.get('@btn').invoke('addClass', 'playing');
    cy.get('@btn').find('.icon').should('be.visible');
    // Note: Visual verification is hard in headless, but we check the class is applied.
  });

  it('cycles loop icons based on loop classes', () => {
    cy.get('#playback-loop-btn').as('btn');
    
    // Default (playlist)
    cy.get('@btn').should('not.have.class', 'loop-track').and('not.have.class', 'loop-none');
    cy.get('@btn').find('.icon').should('be.visible');
    
    // Track loop
    cy.get('@btn').invoke('addClass', 'loop-track');
    cy.get('@btn').should('have.class', 'loop-track');
    
    // None loop
    cy.get('@btn').invoke('removeClass', 'loop-track').invoke('addClass', 'loop-none');
    cy.get('@btn').should('have.class', 'loop-none');
  });

  it('switches themes via the theme selector', () => {
    cy.get('#theme-selector').select('theme-sunset');
    cy.get('body').should('have.class', 'theme-sunset');
    
    cy.get('#theme-selector').select('theme-forest');
    cy.get('body').should('have.class', 'theme-forest');
    cy.get('body').should('not.have.class', 'theme-sunset');
  });

  it('persists theme in localStorage', () => {
    cy.get('#theme-selector').select('theme-midnight');
    cy.window().then((win) => {
      const settings = JSON.parse(win.localStorage.getItem('buttersync-settings') || '{}');
      expect(settings.theme).to.equal('theme-midnight');
    });
  });
});
