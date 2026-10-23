# Hosting and recovery

The public [development browser playtest](https://grave-accord-playtest.ivoryflame12.chatgpt.site/) is published through Sites. Its recorded frontend source is 33b36bc. The [multiplayer service](https://grave-accord-playtest.onrender.com/api/health) is deployed on Render Free, Ohio, with eight reserved slots and one room during calibration. The latest gameplay deployment is dfade8834e81cfd324eeb124d22ec3b7bd68c245, protocol 4. It remains Practice. Auto-deploy is Off; no paid tier, card or persistent disk was added.

A brief actual hosted SDK check on this deployment passed public discovery with the eight-slot maximum, private-code delivery and a two-person private-code join. Private rooms stayed hidden; test slots/rooms were released. This is network integration evidence, not rendered QA or a capacity stress pass.

Render's checked Hobby allowance is 5 GB/month shared outbound, including WebSockets, and 750 shared Free instance hours. Services sleep after idle periods and the filesystem is ephemeral. Keep tests bounded and inspect current allowance before larger load. Fifty-player hosting and sixty-minute endurance are still open. Local synthetic 49+1/4,000-hostile server results do not establish equivalent Free-host capacity.

The admission queue holds at most 128 waiting requests, renews thirty-second tickets and reserves an offered slot for fifteen seconds. Slots include reconnect reservations. Room and participant limits are separate. Public discovery excludes private codes and recovery credentials. A live process reserves disconnected seats for sixty seconds; late arrivals are admitted at encounter boundaries.

Offline Practice has validated local boundary saves. Online recovery foundations include signed 24-hour boundaries, transactional SQL ownership/sequence guards, authenticated bounded HTTP requests, nonce replay prevention and a lease/claim journal. Local tests stop and restart a separate HTTP process with persisted SQLite, race owners and verify unchanged builds, choices and purchase history. That journal is not called by GraveRoom yet. Deployed D1, player/new-transport recovery credentials, historical team records and rankings remain unfinished. Interrupted combat can only be recovered as Practice.

Current supported browser control reports disabled in Work settings despite the user's working localhost preview. The Sites connector also cannot currently access the saved Site ID; the public page remains available. Existing Site identity and audience are preserved. These access issues do not justify a duplicate project, new source checkout or invented browser approval.

LAN hosting and a portable Windows download are pending. No paid provisioning is authorized.
