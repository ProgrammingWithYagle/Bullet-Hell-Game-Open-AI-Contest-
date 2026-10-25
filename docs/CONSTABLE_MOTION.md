# Hollow Constable motion and cast timing

Build `2026.10.25-constable-motion`, protocol 13. Hollow Constable now has idle, attack, hurt, stagger and defeat presentation. Nineteen new complete poses come from four whole-sheet returns: four idle, three hurt, four stagger and eight collapse poses. The eight-frame original attack atlas and metadata remain byte-identical. Current production contains 1,386 selected poses; the seven survivors retain their existing 820.

| State | Frames | Timing | Runtime choice |
| --- | ---: | --- | --- |
| Idle | 4 | 5 fps, looping | Between authorized actions |
| Attack | 8 retained | Anticipation stretches to the current cast release; four release/recovery poses at 10 fps | Authoritative cast start, release and end |
| Hurt | 3 | 10 fps, once | Brief damage response at rest |
| Stagger | 4 | 5 fps, looping | Full authoritative Accord stagger interval |
| Defeat | 8 | 8 fps, once; final pose holds | World clock after the recorded defeat |

The former independent animation started at warning arrival and reached release after twelve game ticks. The first authored fan has a twenty-six-tick tell, so that visual release was fourteen ticks early at zero transport delay. The new selector holds frames 1–3 until the replicated combat tick reaches the actual cast release. Frame 4 is the release, followed by retained recovery poses. It also covers arrest-zone casts, which the old warning filter excluded. Overlapping attacks use the latest replicated cast clock; the warning geometry and projectile releases remain authoritative and unchanged.

The bounded drawing clock may advance frames within an already authorized state. It cannot move anticipation into release, end a stagger early or start defeat before the server records it. Defeat uses world time because combat time stops during rewards/votes. It settles on its final pose without another reward or restart. Hurt cannot interrupt an active cast, stagger or defeat. Reduced motion selects readable held poses for these same authority states and the settled defeat pose.

Every native return, exact prompt, transparent reference canvas and input binding is in [the provenance receipt](constable-motion-2026-10-25.json). `tools/pack-constable-motion.py` partitions full disconnected figures without clipping, painting, alpha repair, mirroring or articulated edits. Independent reconstruction checks every original RGBA pixel before normalization and every packed RGBA pixel afterward. One scale is shared by all frames in each clip. The stooped stagger shares the upright idle source-canvas scale, so it remains shorter; collapse is calibrated from its standing first frame and retains a fixed horizontal ground origin. A 448-pixel padded defeat cell keeps the complete wide fallen poses; its origin and displayed size preserve the same world scale. Other new clips use 384-pixel cells. The existing 65-pixel boss ground offset and original attack size remain unchanged.

Seven tests cover native/atlas bindings, actual normal/Brutal casts, the fourteen-tick regression, drawing lead at release, damage priority, a real successful Accord, one-time defeat/rewards and reduced motion. The independent pixel audit and 327-test full pipeline are separate from rendered acceptance. Browser control remains disabled; native/contact-sheet inspection is an assistant review, and physical-device/human transition review remains open. Special-ability and many other boss motion sets, terrain finish, final combat balance, translations, durable hosted services and release acceptance remain unfinished.

[Wiki motion reference](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/wiki/Art-Gallery#hollow-constable-motion) · [Implementation backlog](IMPLEMENTATION_BACKLOG.md).
