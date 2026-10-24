# Leaderboards

**Verified online leaderboards are not implemented or deployed.** Current runs are practice runs. Local results and tested score fixtures do not constitute a public ranking service.

The authored design ranks a **team run**, with one shared rank for everyone admitted to combat. It defines boards for Quarantine, Midnight, Pilgrimage, Raid and Endless, partitioned by mode, difficulty, peak squad-size band, rules version, content revision and season. Timed and Endless results use different ordering. Historical roster members remain represented after leaving; kills do not create an individual ranking inside the team.

The full design specifies authoritative clear validation, roster accounting, banked campaign victory before any secret extension, replay/idempotency protections and recovery. These are acceptance requirements for implementation, rather than current service claims.

[Complete ranking design](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/LEADERBOARDS.md) · [Versioned score specification](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/content/leaderboards.json) · [Arithmetic/order fixtures](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/reviews/leaderboard-score-fixtures.json) · [Hosting and Recovery](Hosting-and-Recovery)

Campaign banks and local Practice victory/memorial records now execute in the shared runtime. These records remain explicitly unverified and do not establish a trusted online leaderboard result. Optional extension defeat preserves the original campaign bank.
