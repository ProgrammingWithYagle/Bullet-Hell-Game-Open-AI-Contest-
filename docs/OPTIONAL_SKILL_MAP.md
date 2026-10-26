# Optional expanded skill map

Build `2026.10.25-skill-map`, protocol 15. In Settings, enable **Expanded skill map**. The option affects the lobby and intermission shop. Turn it off to restore the classic branch view, which remains the default.

The expanded map displays all **54 existing skills** for the current class: three parent branches, nine specialization paths and six depths per path. It does not add new powers, alter skill costs, change prerequisites or relax the one-capstone rule. The seven ability-changing class-upgrade revamps remain separate unfinished work.

## Navigation and purchase behavior

- Scroll horizontally and vertically to explore. The initial view frames the common class root.
- Use plus/minus to zoom between 65 and 140 percent, or the percentage button to return to 100 percent. The viewport's world center is preserved during zoom; minimum skill targets remain 49.4 pixels.
- Tab enters one skill at a time in the roving focus group. Left/right moves to neighboring paths; up/down moves through path depth; Home/End moves to the first/last depth. Enter or click inspects the focused skill in the existing detail panel.
- Inspection never sends a purchase. Buy uses the same existing callback and checks for owned skills, prerequisite ownership, available points and the capstone limit. The server still validates every purchase independently.
- Scroll position and item focus survive shop updates. Labels determine their own text direction inside a stable left-to-right diagram. Root/category forks are dashed; solid edges represent actual prerequisite relationships and light when their prerequisite is owned.

The map stays inside the existing lobby/shop overlay and does not cover active combat. Native scrolling supports touch and trackpads; actual controller/phone and rendered layout acceptance remain open. Reduced motion requires no animation for navigation.

## Saved settings and profiles

`branchingTree` defaults to false and persists through the existing settings/profile path. Old eight-field settings receive only `branchingTree: false`, then pass full strict validation. Known issued local profile content revisions can migrate while preserving run receipts, class mastery, discoveries, controls and other settings. Unknown revisions, corrupt types, extra fields and out-of-range values fail validation. Current-revision profiles with the previous settings shape also retain their receipts.

This is a local UI option: protocol 15, content revision, boss roster, class kits and networking rules remain unchanged. The prior verified Early Watch build remains frozen at http://127.0.0.1:5179/; its native/request/audio evidence is unchanged. The protocol-14 Constable comparison at 5178 remains separate.

## Verification and limits

The focused module tests cover all seven classes' real nodes and edges, non-overlapping target coordinates, keyboard behavior, bounded zoom/center arithmetic, escaped labels, one roving tab stop, settings/profile migration, fifteen-locale coverage and actual shop inspection/purchase guards. Classic exposes 18 skills for one branch; expanded exposes all 54 without bypassing purchase checks.

Full pipeline source/artifact hashes and final test counts are saved under `reviews/skill-map-2026-10-25/`. The module adapter tests do not render HTML or prove browser layout, touch/controller usability, native-language quality or human acceptance. Browser control remains disabled. The game is unfinished; hosted recovery/rankings, WAN/endurance/device/listening/balance and coordinated release gates remain open.
