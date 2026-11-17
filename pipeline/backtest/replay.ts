// Rejoue des prévisions dans l'ordre où elles ont été émises, sans fuite d'information.
//
// Une prévision d'échéance N pour la position p (une heure ou un jour) a été émise à
// p − N × `stepsPerLeadDay`. À cet instant, seules les observations des positions
// ≤ émission − `availabilityDelay` étaient publiées : on n'apprend que de celles-là.

export type ReplayOptions = {
  /** Nombre de positions de la série. */
  readonly length: number;
  /** Échéances, en jours, qui partagent le même apprentissage. */
  readonly leads: readonly number[];
  /** Nombre de positions par jour d'échéance : 24 pour une série horaire, 1 pour une série quotidienne. */
  readonly stepsPerLeadDay: number;
  /** Nombre de positions entre une observation et sa publication. */
  readonly availabilityDelay: number;
  /** Intègre l'observation de cette position à ce qui est appris. */
  readonly learn: (position: number) => void;
  /** Produit la prévision de cette échéance pour cette position, avec ce qui est appris jusque-là. */
  readonly predict: (lead: number, position: number) => void;
};

export function replay(options: ReplayOptions): void {
  const { length, leads, stepsPerLeadDay, availabilityDelay, learn, predict } = options;
  const longestLead = Math.max(...leads);
  let nextToLearn = 0;
  for (let issued = -stepsPerLeadDay * longestLead; issued < length; issued += 1) {
    while (nextToLearn < length && nextToLearn + availabilityDelay <= issued) {
      learn(nextToLearn);
      nextToLearn += 1;
    }
    for (const lead of leads) {
      const position = issued + stepsPerLeadDay * lead;
      if (position >= 0 && position < length) predict(lead, position);
    }
  }
}
