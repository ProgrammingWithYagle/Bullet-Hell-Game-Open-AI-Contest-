export function bossVariantAppearance(variant:string,alive=true){
  if(alive&&variant==='crazed')return {tint:0xd19aff,ring:0xb76df3,ringAlpha:.95,marks:6};
  return alive&&variant==='brutal'?{tint:0xffaaa0,ring:0xd86458,ringAlpha:.8,marks:4}:{tint:0xffffff,ring:0,ringAlpha:0,marks:0};
}
