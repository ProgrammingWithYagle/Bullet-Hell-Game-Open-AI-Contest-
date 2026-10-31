import {randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import {validRoomPassword} from '../shared/room-password-policy.ts';
type PasswordVerifier={salt:Buffer;digest:Buffer};
const derive=(password:string,salt:Buffer)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,32,(error,key)=>error?reject(error):resolve(key)));
export async function createRoomPassword(value:unknown):Promise<PasswordVerifier|null>{
  if(value===undefined||value==='')return null;
  if(!validRoomPassword(value))throw Error('invalidPasswordSetting');
  const salt=randomBytes(16);
  return {salt,digest:await derive(value,salt)};
}
export async function matchesRoomPassword(verifier:PasswordVerifier,value:unknown){
  if(!validRoomPassword(value))return false;
  return timingSafeEqual(verifier.digest,await derive(value,verifier.salt));
}
