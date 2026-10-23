# Acceptance ledger

The implementation plan is approved. Status entries below report observed completion. Full runtime and release gates remain in IMPLEMENTATION_BACKLOG.md.

| Area | Target | Observed state |
| --- | --- | --- |
| Design content | 7 classes / 126 skills / 28 weapons / 24 mutations / 6 arenas / 60 bosses / 7 ultimates | Authored and strict source checks pass |
| Balance | Finite economy and prerequisites, legal mutations, analytical timer feasibility | 2,255 legal mutation sets and 16,716 analytical campaign/raid boss/build rows pass; actual combat tuning remains pending |
| Gauntlets | Distinct route pools, no campaign repeats, regular Endless exclusives | 4,000 seeded timed runs and 40,000 Endless encounters pass the design acceptance model; live voting integration remains pending |
| Endless | No final round; solo/private/public to 50; ongoing votes/shop | Completely specified; runtime pending |
| Localization | 15 locales with complete UI and content text | 959 keys per locale, 696 required content keys, 14 negative tests and 150 plural samples pass; all 60 boss names/descriptions authored; runtime/fonts/native review pending |
| Art | Eight proof sets and motion inspection, cleaner finish references | Assistant visual review passed; two original eight-frame atlases retain their browser motion evidence. New seven-survivor and six-boss finish references pass native and static gameplay-scale inspection; new production animation and live hazard review remain pending |
| Audio | Two loops and original sound bank | 2 arranged loops, 8 stems and 25 SFX; 35 WAVs pass objective and deterministic regeneration checks; human listening/runtime mix pending |
| PDF and packet | Illustrated full bible and portable source packet | Historical 0.1.0 packet remains sealed. All 72 expanded PDF pages rendered and reviewed; current archive, fresh-extraction and normal-copy evidence is recorded externally after sealing to avoid a circular archive hash |
| Playable loop | Two-class complete offline/networked loop | Pending |
| 50-player gate | Active gameplay and rendered client with measured traffic/performance | Pending |
| Full game | All content/routes/difficulties/modes | Pending |
| Human tests | Pacing, feel, teamwork, device and native-language review | Not performed |
| GitHub | Source, Wiki, Project, protection, releases | Wiki initialized; one Project configured with required fields and 12 production issues. Source PR, protection and release verification are ongoing |
| Delivery | Windows, public URL and matching final release | Pending |
