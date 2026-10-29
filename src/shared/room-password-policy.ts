export const ROOM_PASSWORD_MIN=4,ROOM_PASSWORD_MAX=64;
/** Empty is allowed only when the host chooses an open room. Keep case and spaces intact. */
export function validRoomPassword(value:unknown,optional=false):value is string{
  if(typeof value!=='string')return false;
  const length=[...value].length;
  return optional&&length===0||length>=ROOM_PASSWORD_MIN&&length<=ROOM_PASSWORD_MAX;
}
