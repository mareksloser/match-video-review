import type { Drawing, Marker, Match, Rule, Shape, TeamCategory, User } from '@/lib/types';
import { project, simulate } from '@/video/demoMatch';

export interface DemoDb {
  users: (User & { password: string })[];
  categories: TeamCategory[];
  matches: Omit<Match, 'markerCount' | 'reviewedCount' | 'viewedCount'>[];
  markers: Omit<Marker, 'viewedByMe'>[];
  rules: Rule[];
  views: { markerId: number; userId: number; viewedAt: string }[];
  seq: number;
}

/** Screen-normalized position of a simulated player/ball at time t (so demo drawings sit on real players). */
const at = (t: number, who: 'ball' | ['own' | 'opponent', number]) => {
  const f = simulate(t);
  const p = who === 'ball' ? f.ball : (who[0] === 'own' ? f.own : f.opponent)[who[1]];
  const s = project(p, { w: 1, h: 1 });
  return { x: s.x, y: s.y - 0.02 };
};
const offset = (p: { x: number; y: number }, dx: number, dy: number) => ({ x: p.x + dx, y: p.y + dy });

function drawingFor(t: number, shapes: (t: number) => Omit<Shape, 'id'>[]): Drawing {
  return { version: 1, shapes: shapes(t).map((s, i) => ({ ...s, id: `seed${t}-${i}` }) as Shape) };
}

const T = (m: number, s: number) => m * 60 + s;

export function createSeed(): DemoDb {
  const categories: TeamCategory[] = [
    { id: 1, name: 'A-tým', description: 'Muži, okresní přebor' },
    { id: 2, name: 'U19', description: 'Dorost' },
    { id: 3, name: 'U15', description: 'Starší žáci' },
    { id: 4, name: 'Ženy', description: null },
  ];
  const users: DemoDb['users'] = [
    { id: 1, name: 'Petr Hájek', email: 'trener@banik.cz', password: 'demo', role: 'admin', teamCategoryId: null },
    { id: 2, name: 'Jakub Svoboda', email: 'hrac@banik.cz', password: 'demo', role: 'player', teamCategoryId: 1 },
    { id: 3, name: 'Tomáš Dvořák', email: 'tomas@banik.cz', password: 'demo', role: 'player', teamCategoryId: 1 },
    { id: 4, name: 'Ondřej Král', email: 'ondrej@banik.cz', password: 'demo', role: 'player', teamCategoryId: 1 },
    { id: 5, name: 'Lukáš Beneš', email: 'lukas@banik.cz', password: 'demo', role: 'player', teamCategoryId: 1 },
    { id: 6, name: 'Matěj Procházka', email: 'matej@banik.cz', password: 'demo', role: 'player', teamCategoryId: 1 },
    { id: 7, name: 'Náhled', email: 'view@banik.cz', password: 'demo', role: 'viewer', teamCategoryId: null },
  ];
  const rules: Rule[] = [
    { id: 1, code: '#1', area: 'Rozehrávka', title: 'Rozehrávka od brankáře', body: 'Stopeři se rozestoupí k vápnu, šestka si naběhne mezi ně. První přihrávka jde na volného stopera, ne dlouhým míčem.' },
    { id: 2, code: '#2', area: 'Útok', title: 'Pojistka za míčem', body: 'Při útoku zůstávají za míčem vždy dva stopeři a šestka. Krajní obránci jdou dopředu střídavě, nikdy oba najednou.' },
    { id: 3, code: '#3', area: 'Presink', title: 'Presink při špatném prvním doteku', body: 'Odskočí-li soupeři míč, nejbližší hráč napadá okamžitě. Druhý hráč zavírá přihrávku do středu, třetí hlídá vracečku.' },
    { id: 4, code: '#4', area: 'Obrana', title: 'Kompaktní blok', body: 'Mezi obranou a zálohou nejvýš 15 metrů. Když míč jde na kraj, celý blok se posouvá s ním a slabou stranu necháváme volnou.' },
    { id: 5, code: '#5', area: 'Standardky', title: 'Rohový kop – obrana', body: 'Zónová obrana v šestnáctce, jeden hráč u přední tyče. Po odvrácení vystupuje celá řada společně.' },
    { id: 6, code: '#6', area: 'Přechod', title: 'Přechod do útoku', body: 'Po zisku míče hrajeme první přihrávku dopředu do tří sekund. Krajní záložníci okamžitě do šířky.' },
  ];

  const matches: DemoDb['matches'] = [
    { id: 1, title: 'SK Baník Libušín – FK Lipová', matchDate: '2026-10-24', teamCategoryId: 1, videoType: 'demo', videoUrl: 'demo://match-1', isPublic: false },
    { id: 2, title: 'TJ Sokol Horní Lhota – SK Baník Libušín', matchDate: '2026-10-17', teamCategoryId: 1, videoType: 'veo', videoUrl: 'https://app.veo.co/matches/20261017-horni-lhota-banik/', isPublic: false },
    { id: 3, title: 'Sestřih: Baník Libušín U19 – Slavoj Podlesí', matchDate: '2026-10-11', teamCategoryId: 2, videoType: 'demo', videoUrl: 'demo://match-3', isPublic: true },
    { id: 4, title: 'Baník Libušín U15 – FC Rovina', matchDate: '2026-10-05', teamCategoryId: 3, videoType: 'demo', videoUrl: 'demo://match-4', isPublic: true },
    { id: 5, title: 'Přátelák: Baník Libušín ženy – SK Dubí', matchDate: '2026-09-27', teamCategoryId: 4, videoType: 'demo', videoUrl: 'demo://match-5', isPublic: true },
  ];

  const base = { description: null, ruleId: null, ruleLink: null, reviewed: false, reviewedAt: null, drawing: null };
  const markers: DemoDb['markers'] = [
    {
      ...base, id: 1, matchId: 1, timestampSeconds: T(6, 12), kind: 'tactic', title: 'Rozehrávka od brankáře přes šestku', ruleId: 1,
      description: 'Dobře: stopeři roztažení, šestka mezi nimi. Chybí ale nabídka krajního obránce – míč jsme pak museli hrát zpátky.',
      reviewed: true, reviewedAt: '2026-10-25T17:30:00Z',
      drawing: drawingFor(T(6, 12), (t) => [
        { type: 'arrow', from: at(t, ['own', 0]), to: at(t, ['own', 2]), color: 'yellow', dashed: false },
        { type: 'arrow', from: at(t, ['own', 2]), to: at(t, ['own', 6]), color: 'yellow', dashed: false },
        { type: 'arrow', from: at(t, ['own', 1]), to: offset(at(t, ['own', 1]), 0.09, -0.02), color: 'white', dashed: true },
        { type: 'zone', center: at(t, ['own', 6]), rx: 0.045, ry: 0.03, color: 'blue' },
        { type: 'text', at: offset(at(t, ['own', 1]), 0.1, -0.06), text: 'Nabídnout se!', color: 'yellow' },
      ]),
    },
    {
      ...base, id: 2, matchId: 1, timestampSeconds: T(14, 20), kind: 'mistake', title: 'Obranný zlom – pozdní přesun stoperů', ruleId: 4,
      description: 'Míč jde na kraj a levý stoper zůstává ve středu. Mezera mezi ním a krajním obráncem je přes 20 m, soupeř do ní nabíhá.',
      reviewed: true, reviewedAt: '2026-10-25T17:42:00Z',
      drawing: drawingFor(T(14, 20), (t) => [
        { type: 'zone', center: offset(at(t, ['own', 2]), 0.06, 0), rx: 0.06, ry: 0.035, color: 'red' },
        { type: 'arrow', from: at(t, ['own', 2]), to: offset(at(t, ['own', 2]), 0.07, 0.01), color: 'yellow', dashed: false },
        { type: 'arrow', from: at(t, ['opponent', 9]), to: offset(at(t, ['own', 2]), 0.06, 0), color: 'red', dashed: true },
        { type: 'player', at: at(t, ['own', 2]), team: 'own', label: '5' },
        { type: 'player', at: at(t, ['opponent', 9]), team: 'opponent', label: '9' },
      ]),
    },
    { ...base, id: 3, matchId: 1, timestampSeconds: T(19, 5), kind: 'foul', title: 'Zbytečný faul na půlce', description: 'Za stavu, kdy máme přečíslení, není důvod jít do skluzu. Stačí zdržet a počkat na pomoc.' },
    {
      ...base, id: 4, matchId: 1, timestampSeconds: T(24, 40), kind: 'goal', title: 'Gól 1:0 – rychlý přechod po zisku', ruleId: 6,
      description: 'Přesně podle zásady: zisk, první přihrávka dopředu do 3 s, krajní záložník v šířce.', reviewed: true, reviewedAt: '2026-10-25T17:55:00Z',
      drawing: drawingFor(T(24, 40), (t) => [
        { type: 'arrow', from: at(t, 'ball'), to: at(t, ['own', 9]), color: 'yellow', dashed: false },
        { type: 'arrow', from: at(t, ['own', 10]), to: offset(at(t, ['own', 10]), 0.12, -0.03), color: 'white', dashed: true },
        { type: 'zone', center: at(t, 'ball'), rx: 0.035, ry: 0.025, color: 'blue' },
      ]),
    },
    {
      ...base, id: 5, matchId: 1, timestampSeconds: T(32, 45), kind: 'mistake', title: 'Neúspěšný vysoký presink', ruleId: 3,
      description: 'Soupeři odskočil míč, ale napadli jsme až na druhý dotek. Druhý hráč nezavřel přihrávku do středu.',
      drawing: drawingFor(T(32, 45), (t) => [
        { type: 'arrow', from: at(t, ['own', 9]), to: at(t, 'ball'), color: 'yellow', dashed: false },
        { type: 'arrow', from: at(t, ['own', 8]), to: offset(at(t, 'ball'), -0.02, -0.06), color: 'yellow', dashed: false },
        { type: 'line', from: at(t, 'ball'), to: at(t, ['opponent', 6]), color: 'red' },
        { type: 'zone', center: at(t, 'ball'), rx: 0.05, ry: 0.03, color: 'blue' },
        { type: 'text', at: offset(at(t, 'ball'), 0.04, -0.07), text: 'Zavřít střed', color: 'white' },
      ]),
    },
    {
      ...base, id: 10, matchId: 1, timestampSeconds: T(27, 30), kind: 'praise', title: 'Obětavý návrat krajního záložníka',
      description: 'Po ztrátě míče sprint zpátky přes půl hřiště a zavřená střela. Přesně tohle chceme vidět u každého.',
    },
    {
      ...base, id: 11, matchId: 1, timestampSeconds: T(35, 5), kind: 'improvement', title: 'Lepší řešení: hrát na volného krajního', ruleId: 6,
      description: 'Místo kličky do dvou hráčů stačila přihrávka na volného krajního obránce, který naběhl do prostoru.',
    },
    { ...base, id: 6, matchId: 1, timestampSeconds: T(38, 10), kind: 'substitution', title: 'Střídání a přechod na 4-4-2', description: 'Po střídání držíme dvě čtyřčlenné řady, hrotový útočník napadá stopery.' },
    { ...base, id: 7, matchId: 1, timestampSeconds: T(41, 51), kind: 'set_piece', title: 'Šance po rohovém kopu soupeře', ruleId: 5, ruleLink: 'https://www.thefa.com/football-rules-governance/lawsandrules', description: 'Po odvrácení vystoupil jen jeden hráč, ostatní zůstali v šestnáctce a dorážka šla do volného prostoru.' },

    { ...base, id: 8, matchId: 2, timestampSeconds: T(12, 30), kind: 'tactic', title: 'Vysoký blok soupeře při rozehrávce', ruleId: 1, description: 'Soupeř napadá třemi hráči. Řešení: brankář hraje na šestku, která couvá mezi stopery.' },
    { ...base, id: 9, matchId: 2, timestampSeconds: T(41, 51), kind: 'goal', title: 'Inkasovaný gól po ztrátě ve středu', ruleId: 2, description: 'Oba krajní obránci byli vysoko, za míčem zůstal jen jeden stoper.' },
  ];

  // Seeded views: some players went through some of the markers from home
  const views: DemoDb['views'] = [];
  const viewed: Record<number, number[]> = { 2: [1, 2, 4], 3: [1, 2, 3, 4, 5, 6, 7], 4: [1], 6: [1, 2, 4, 5] };
  for (const [userId, ids] of Object.entries(viewed))
    ids.forEach((markerId) => views.push({ markerId, userId: Number(userId), viewedAt: '2026-10-25T20:00:00Z' }));

  return { users, categories, matches, markers, rules, views, seq: 100 };
}
