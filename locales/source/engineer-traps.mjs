const entries={
  wire:['Tripwire Couplers','Two ready owned plates within 360 pixels share a visible wire when the whole connection clears cover and lava. A living hostile body crossing its swept line commits both 0.5-second fuses. The plates keep their original 36-second lifetimes and proximity triggers. Excludes Safety Switch.'],
  switch:['Safety Switch','Q holds or releases your idle plates during deployment cooldown or whenever both slots are full. Held plates still arm and expire, but do not trigger on proximity. Committed fuses cannot be stopped. Commands recover in 0.8 seconds; with a free slot and Q ready, Q deploys normally. Excludes Tripwire Couplers.'],
  key:['Firing Key','Adds a fourth active action (default C; remappable). Commit every ready owned plate, including held plates, to its full visible 0.5-second fuse. Plates with insufficient lifetime cannot fire. Base cooldown 12 seconds. Arming, hauling and spent plates are excluded; this grants no new charges or explosions.'],
  casings:['Breach Casings','Evolves committed explosions with a 320-pixel piercing shaped jet along each plate’s placed direction, for 120 base damage with ability and turret-damage bonuses. Its full lane is shown during the fuse. Cover can shorten the warned lane; removing cover cannot extend the committed warning. The ordinary blast and boss slow immunity remain.'],
  haul:['Haul Line','Adds a fifth active action (default B; remappable). Winch the nearest ready owned plate within 320 pixels to a legal point 120 pixels ahead of your aim over 0.6 seconds. It then needs a full 1-second rearm. Blocked paths, overlapping destinations and insufficient lifetime reject without spending recovery. Interruption stops the haul and rearms a legally placed plate; obstructed equipment is removed. The original lifetime remains. Base cooldown 18 seconds.'],
  corridor:['Demolition Corridor','SS+ capstone: remote-fire two ready owned plates within 360 pixels on a clear 26-pixel-radius strip. Both actual explosions must deliver, then a further visible 0.4-second commitment releases 300 base damage along their fixed connection. Ground obstruction, expiry or owner loss cancels the strip. Clear paired commitment uses a 16-second cooldown; ordinary remote firing remains 12 seconds. Uses the run’s single capstone choice.'],
};
export function engineerTrapsMessages(){
  const m={'ui.engineer.holdTraps':'Hold plates','ui.engineer.releaseTraps':'Release plates'};
  for(const [suffix,[name,description]]of Object.entries(entries)){
    const id='engineer-traps-'+suffix+'-1';m['skill.'+id+'.name']=name;m['skill.'+id+'.description']=description;m['pathway.'+id+'.summary']=description;
  }
  return m;
}
