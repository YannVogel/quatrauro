// Test volontairement faux : il prouve que la CI échoue quand un test échoue.
// Cette branche n'est jamais mergée.
describe('démonstration de la CI', () => {
  it('échoue exprès', () => {
    expect(1 + 1).toBe(3);
  });
});
