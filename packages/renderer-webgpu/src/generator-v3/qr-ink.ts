/** Use the palette's visible accents, with the same contrast ceiling as SVG/PNG exports. */
export const PALETTE_QR_INK_WGSL = /* wgsl */ `
fn paletteScanInk(source:vec3f)->vec3f {
 var ink=source;
 for(var i=0u;i<64u;i++){
  let linear=select(pow((ink+vec3f(0.055))/1.055,vec3f(2.4)),ink/12.92,ink<=vec3f(0.04045));
  if(dot(linear,vec3f(0.2126,0.7152,0.0722))<=0.1){break;}
  ink*=0.94;
 }
 return round(ink*255.0)/255.0;
}
fn paletteQrInk(cell:vec2f)->vec3f {
 let t=clamp((cell.x+cell.y+9.0)/(2.0*(uniforms.gridSize+8.0)),0.0,1.0);
 let first=paletteScanInk(uniforms.themeSecondary.rgb);
 let middle=paletteScanInk(uniforms.themeThird.rgb);
 let last=paletteScanInk(uniforms.themeFourth.rgb);
 return mix(mix(first,middle,clamp((t-0.28)/0.10,0.0,1.0)),last,clamp((t-0.62)/0.10,0.0,1.0));
}
`;
