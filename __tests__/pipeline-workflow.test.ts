// Garde-fous du workflow du pipeline : ce que la revue d'une PR doit pouvoir tenir pour acquis.
// Le fichier est lu comme du texte, sans ses commentaires.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const WORKFLOWS = path.join(process.cwd(), '.github', 'workflows');
const read = (name: string): string => readFileSync(path.join(WORKFLOWS, name), 'utf8');
/** Le YAML sans ses commentaires : ce que GitHub exécute vraiment. */
const active = (content: string): string =>
  content
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');

describe('workflow du pipeline', () => {
  const workflow = active(read('pipeline.yml'));

  it('tourne quatre fois par jour, à la planification de l’ADR 0004, et se lance aussi à la main', () => {
    expect(workflow).toMatch(
      /^on:\n {2}workflow_dispatch:\n {2}schedule:\n {4}- cron: '17 1,7,13,19 \* \* \*'\n/m,
    );
    // Une seule planification : en ajouter une se décide avec Yann (ADR 0004).
    expect(workflow.match(/cron:/g)).toHaveLength(1);
  });

  it('ne fait tourner qu’un passage à la fois, sans interrompre celui qui tourne', () => {
    expect(workflow).toMatch(/^concurrency:\n {2}group: pipeline\n {2}cancel-in-progress: false$/m);
  });

  it('ne demande que le droit d’écrire le contenu du repo', () => {
    expect(workflow).toMatch(/^permissions:\n {2}contents: write\n\n/m);
  });

  it('exécute le code de main et n’écrit que sur data', () => {
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).toMatch(/ref: data\n\s+path: data/);
    expect(workflow).toContain('run: npm run pipeline -- --data-dir=data');
    const pushes = workflow.match(/git push.*/g) ?? [];
    expect(pushes).toEqual(['git push origin HEAD:data']);
    expect(workflow).not.toMatch(/--force|--no-verify/);
  });

  it('ne committe qu’après un passage réussi', () => {
    const passAt = workflow.indexOf('npm run pipeline');
    const commitAt = workflow.indexOf('git add --all');
    expect(passAt).toBeGreaterThan(0);
    expect(commitAt).toBeGreaterThan(passAt);
    expect(workflow).not.toMatch(/continue-on-error|if: always\(\)|\|\| true/);
  });
});

describe('workflows du repo', () => {
  it('aucun autre que le pipeline ne pousse quoi que ce soit, et aucun ne pousse sur main', () => {
    for (const name of readdirSync(WORKFLOWS)) {
      const workflow = active(read(name));
      if (name !== 'pipeline.yml') expect(workflow).not.toMatch(/git push|contents: write/);
      expect(workflow).not.toMatch(/git push[^\n]*\bmain\b/);
    }
  });

  it('la CI ne se déclenche pas sur la branche data', () => {
    expect(active(read('ci.yml'))).toMatch(/branches-ignore:\n\s+- data/);
  });
});
