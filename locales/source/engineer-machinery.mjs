const entries={
  anchor:['Anchor Circuit','Q during deployment cooldown anchors all owned carriages; press again to resume following. Orders recover in 0.8 seconds and require 0.5 seconds of fresh bracing. Invalid recall paths spend nothing. Excludes Survey Drive. When Q deployment is ready, Q deploys normally.'],
  survey:['Survey Drive','Q during deployment cooldown orders all owned carriages to a fixed point 220 pixels ahead of your aim, keeping their lateral formation. They travel at 150 pixels/second, then brace for 0.5 seconds. Aim changes do not move the destination. Blocked cover, lava or map edges reject the whole order without spending recovery. Excludes Anchor Circuit. Ready Q deploys normally.'],
  coil:['Coil Lance','Adds a fourth active action (default C; remappable). A live owned carriage locks its aim and charges for 0.75 seconds, then fires a 480-pixel piercing beam for 240 base damage. Cover clips the beam. It cannot move or fire normal shots while charging. Base cooldown 12 seconds; requires enough remaining carriage lifetime. Destruction or owner loss cancels the shot.'],
  prism:['Prism Coils','Evolves Coil Lance into three separately timed rays, angled left, centre and right. Each deals 110 base damage, 0.18 seconds apart after the charge. A wider clearing pattern and 330 total base damage if all three strike; targets can move between rays. Uses the same fourth action and cooldown.'],
  salvage:['Salvage Pulse','Adds a fifth active action (default B; remappable). Dismantles your idle carriages within 125 pixels and recovers up to 6 seconds of the remaining Q deployment cooldown, once per cast. It consumes the machines and their remaining uptime. Base cooldown 24 seconds. Channeling machines, siege engines, other players’ machines and companions cannot be salvaged. Grants no health, SP, money or kill credit.'],
  convergence:['Rail Convergence','SS+ capstone: evolves Coil Lance into simultaneous rails from every surviving owned carriage toward one fixed aimed mark, each dealing 240 base damage after a 0.75-second commitment. A visible 0.4-second warning precedes a 150-damage collapse in a 90-pixel radius at the mark. Cover blocks beams and the collapse. At least one rail must reach the mark, with a machine still alive, for the collapse to resolve. Base cooldown 16 seconds. Works with one machine; paired carriages add converging geometry. Uses the run’s single capstone choice.'],
};
export function engineerMachineryMessages(){
  const m={
    'ui.pathwayAction1':'Action 1','ui.pathwayAction2':'Action 2',
    'ui.technique1':'Technique action 1','ui.technique2':'Technique action 2',
    'ui.engineer.anchor':'Anchor carriages','ui.engineer.recall':'Recall carriages','ui.engineer.waypoint':'Set waypoint',
    'ui.pathwayEarned':'Available after earning {count} SP in this run ({earned} earned).',
    'ui.pathwayFieldManual':'The Engineer’s field manual','ui.pathwayManualHelp':'Follow a route to develop its technique. Choose a carriage control, add new actions, then evolve their behaviour. Select any emblem to inspect before spending.',
    'ui.pathwayMap':'Tree','ui.pathwayList':'Reading view','ui.pathwayControls':'Arrow keys follow the tree. Enter inspects. Tab leaves the map.',
    'ui.pathwayNewAction':'New active action','ui.pathwayEvolution':'Ability evolution','ui.pathwayControl':'Control choice','ui.pathwayEntry':'Q specialization','ui.pathwayCapstone':'Capstone evolution',
    'ui.pathwayExclusive':'Choose one','ui.pathwayOptional':'Optional control fork','ui.pathwayAbilityRoute':'Develop your machinery',
    'ui.pathwayLate':'Late progression expands your kit; General keeps the numerical foundations.',
  };
  for(const [suffix,[name,description]]of Object.entries(entries)){
    const id='engineer-machinery-'+suffix+'-1';m['skill.'+id+'.name']=name;m['skill.'+id+'.description']=description;m['pathway.'+id+'.summary']=description;
  }
  return m;
}
