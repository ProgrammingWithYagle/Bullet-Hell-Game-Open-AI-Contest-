# Records

Open **Leaderboards** from the home menu. **Local Practice records** lists runs saved on this device. **Team records** loads results from the selected game server. Choose a mode, difficulty and peak team size; all-time and weekly views stay separate. Expand a row to see everyone who joined combat. **Show more** loads another page; connection errors offer **Retry**.

A completed public-authority run receives one shared team rank. Leaving or disconnecting does not remove earlier combat credit. Solo practice, testing-server runs and modified runs do not enter team boards. Private room codes, connection IDs and reconnect credentials are never public record fields. Display names appear in the team history.

For a timed mode, only a completed base campaign qualifies. Its score combines speed, surviving teammates and health preserved, with one exact final rounding. Equal score/time/damage results share a rank. The base result freezes before the optional extra boss.

Endless boards compare bosses cleared, then time through the last clear, then damage through that clear. The eventual failed fight cannot improve rank by lasting longer. During a break, the host can choose **End this run** to finish and save. Guests cannot end the run. A run with no completed boss stays a local recap.

Records are written by the game authority to its SQLite file and survive process restarts when that file is retained. Desktop LAN hosts store their own records in the app data folder. A failed write leaves play running and retries the same final result while the room remains open.

These are **server records**. A shared deployed global board and durable deployed match recovery still require coordinated hosting and independent acceptance. Current local previews do not replace the older public Site or published Windows download.

[Scoring and storage details](https://github.com/ProgrammingWithYagle/Bullet-Hell-Game-Open-AI-Contest-/blob/feat/first-playable-loop/docs/LEADERBOARDS.md) · [Hosting and recovery](Hosting-and-Recovery)
