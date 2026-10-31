import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, data } from '../src/shared/game.ts';
import { idleInput, implementedClassIds } from '../src/shared/protocol.ts';
test('all seven classes have 54 nodes and every branch contains the complete 18-grade ladder', () => {
  const ids = new Set<string>();
  for (const cl of data.classes) {
    const nodes = data.skills.filter((s) => s.classId === cl.id);
    assert.equal(nodes.length, 54);
    for (const branch of cl.branches) {
      const group = nodes.filter((s) => s.branchId === branch.id);
      assert.equal(group.length, 18);
      assert.deepEqual(new Set(group.map((s) => s.grade)), new Set(data.grades));
      for (const subbranch of branch.subbranches) {
        const path = group
          .filter((s) => s.subbranchId === subbranch.id)
          .sort((a, b) => a.depth - b.depth);
        assert.equal(path.length, 6);
        assert.equal(
          path.reduce((n, s) => n + s.cost, 0),
          21,
        );
        for (const [i, node] of path.entries()) {
          assert(!ids.has(node.id));
          ids.add(node.id);
          assert.equal(node.prerequisite, i ? path[i - 1].id : null);
          assert.equal(node.capstone, i === 5);
        }
      }
    }
  }
  assert.equal(ids.size, 378);
});
test('all 63 implemented specialization paths enforce prerequisites and spend exactly 21 points', () => {
  for (const classId of implementedClassIds)
    for (const branch of data.classes.find((c) => c.id === classId)!.branches)
      for (const sub of branch.subbranches) {
        const g = new Game(),
          p = g.addPlayer('p', 'Survivor', classId);
        p.totalSp = 27;
        const nodes = data.skills.filter((s) => s.classId === classId && s.subbranchId === sub.id);
        assert(!g.transact(p.id, { id: 'skip', kind: 'skill', item: nodes[5].id }).ok);
        for (const n of nodes) assert(g.transact(p.id, { id: n.id, kind: 'skill', item: n.id }).ok);
        assert.equal(
          p.skills.reduce((n, id) => n + g.skillCost(id), 0),
          21,
        );
        assert(p.health > 0 && g.stats(p).speed > 0);
        assert.equal(p.totalSp, 27);
      }
});
test('Medic offensive healing restores the most injured nearby ally and applies its hit-rate cap', () => {
  const g = new Game(),
    m = g.addPlayer('m', 'Iona', 'medic'),
    a = g.addPlayer('a', 'Mara', 'soldier');
  m.totalSp = 21;
  for (const n of data.skills.filter(
    (s) => s.classId === 'medic' && s.subbranchId === 'chemistry-path-1',
  ))
    assert(g.transact(m.id, { id: n.id, kind: 'skill', item: n.id }).ok);
  g.start();
  g.boss.staggerUntil = 1e9;
  m.x = 800;
  m.y = 600;
  a.x = 820;
  a.y = 600;
  a.health = 40;
  for (let sequence = 1; sequence <= 40; sequence++) {
    g.submitInput(m.id, { ...idleInput(), sequence, aim: -Math.PI / 2, fire: true });
    g.step();
  }
  assert(a.health > 40);
  assert.equal(m.health, m.maxHealth);
  assert(m.healing > 0);
  assert(m.healing < 15);
});
