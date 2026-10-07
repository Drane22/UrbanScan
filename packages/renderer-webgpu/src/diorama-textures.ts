/** Fragment-only materials. Coordinates are in QR-cell units, before QR blending. */
export const DIORAMA_TEXTURES_WGSL = /* wgsl */ `
fn dtHash(p:vec2f)->f32 {
  var q=fract(vec3f(p.x,p.y,p.x)*vec3f(0.1031,0.1030,0.0973));
  q+=dot(q,q.yzx+vec3f(33.33));
  return fract((q.x+q.y)*q.z);
}
fn dtNoise(p:vec2f)->f32 {
  let i=floor(p);let f=fract(p);let u=f*f*(3.0-2.0*f);
  return mix(mix(dtHash(i),dtHash(i+vec2f(1,0)),u.x),
    mix(dtHash(i+vec2f(0,1)),dtHash(i+vec2f(1,1)),u.x),u.y);
}
fn dtFbm(p:vec2f)->f32 {
  let r=mat2x2f(vec2f(0.80,0.60),vec2f(-0.60,0.80));
  let q=r*p*2.07+vec2f(13.2,7.1);
  let s=r*q*2.03+vec2f(6.1,19.7);
  return dtNoise(p)*0.57+dtNoise(q)*0.28+dtNoise(s)*0.15;
}
// The two nearest jittered seeds give organic islands and connected seams.
// z carries a stable island pigment; x/y are geometric distances, not pixel noise.
fn dtCells(p:vec2f)->vec3f {
  let cell=floor(p);let f=fract(p);var first=8.0;var second=8.0;var pigment=0.0;
  for(var y=-1;y<=1;y++) {for(var x=-1;x<=1;x++) {
    let o=vec2f(f32(x),f32(y));let id=cell+o;
    let seed=vec2f(dtHash(id),dtHash(id+vec2f(39.3,17.8)));
    let d=length(o+0.18+seed*0.64-f);
    if(d<first){second=first;first=d;pigment=dtHash(id+vec2f(5.6,73.2));}
    else{second=min(second,d);}
  }}
  return vec3f(first,second-first,pigment);
}
fn dtLine(d:f32,width:f32,pixel:f32)->f32 {
  let aa=max(pixel*0.65,0.001);
  return 1.0-smoothstep(max(0.0,width-aa),width+aa,abs(d));
}
fn dtDot(q:vec2f,scale:f32,radius:f32,pixel:f32,threshold:f32)->f32 {
  let p=q*scale;let id=floor(p);
  let center=vec2f(dtHash(id+vec2f(7,19)),dtHash(id+vec2f(29,3)))*0.56+0.22;
  let d=length(fract(p)-center);
  return dtLine(d,radius,pixel*scale)*step(threshold,dtHash(id+vec2f(71,11)));
}
fn dtEarth(color:vec3f,q:vec2f,p:vec3f,up:f32,pixel:f32,part:u32)->vec3f {
  let warp=vec2f(dtFbm(q*0.29),dtFbm(q*0.29+vec2f(31,17)))-0.5;
  let soil=dtFbm(q*2.1+warp*1.5);
  let crust=dtCells(q*0.73+warp*0.7);
  let crack=dtLine(crust.y,0.026,pixel*0.73);
  let stone=dtCells(q*3.2);
  let pebble=(1.0-smoothstep(0.12,0.22,stone.x))*step(0.68,stone.z);
  let grit=dtNoise(q*18.0);
  let moss=smoothstep(0.47,0.68,dtFbm(q*0.57+vec2f(13,9)))*up;
  var out=color*(0.77+soil*0.38+grit*0.07-crack*0.19);
  out=mix(out,out*0.68+palette(3)*0.32,moss*0.55);
  out=mix(out,color*(1.13+stone.z*0.12),pebble*0.68);
  // Foundation cross-section: sediment lenses with jagged roots between layers.
  let strata=fract((p.y+dtFbm(q*0.35)*0.13)*5.5);
  let seam=dtLine(min(strata,1.0-strata),0.045,pixel*5.5);
  out*=1.0-(1.0-up)*(0.12+seam*0.19);
  if(part==2u){out=mix(color,out,0.25);}
  if(part==3u || part==8u){
    let vein=dtLine(fract(q.x*7.0+dtNoise(q*1.3)*0.9)-0.5,0.035,pixel*7.0);
    out=color*(0.88+soil*0.22+vein*0.15);
  }
  return out;
}
fn dtStone(color:vec3f,q:vec2f,pixel:f32,foundation:bool)->vec3f {
  let scale=select(vec2f(0.88,1.7),vec2f(0.66,0.84),foundation);
  var b=q*scale;let row=floor(b.y);b.x+=fract(row*0.5)*0.92;
  let id=floor(b);let f=fract(b);let seed=dtHash(id);
  let edge=min(min(f.x,1.0-f.x),min(f.y,1.0-f.y));
  let chipped=edge+(dtNoise(q*12.0)-0.5)*0.022;
  let mortar=1.0-smoothstep(0.025,0.055+pixel,chipped);
  let bevel=1.0-smoothstep(0.055,0.10+pixel,chipped);
  let grain=dtFbm(q*5.5+vec2f(seed*9.0));
  let chisel=dtLine(fract(q.x*5.0+dtNoise(q*0.8)*2.5)-0.5,0.08,pixel*5.0);
  let pits=dtDot(q,7.5,0.09,pixel,0.71);
  var out=color*(0.76+seed*0.24+grain*0.24-pits*0.17-chisel*0.055);
  out*=1.0-mortar*0.38-bevel*0.08;
  // Mineral deposits collect only in a few joints, leaving cut faces legible.
  let mineral=smoothstep(0.55,0.78,dtFbm(q*0.44))*bevel;
  return mix(out,color*0.70+palette(3)*0.22,mineral*0.32);
}
fn dtPaper(color:vec3f,q:vec2f,uv:vec2f,pixel:f32,foundation:bool)->vec3f {
  let cloud=dtFbm(q*1.5);
  // Sparse elongated cells imitate pulp fibres and crossed washi strands.
  let fibers=dtCells(q*vec2f(14.0,1.1));
  let crossed=dtCells((q.yx+vec2f(4.1))*vec2f(18.0,0.8));
  let fiber=dtLine(fibers.x,0.12,pixel*7.0)*step(0.3,fibers.z);
  let crossFiber=dtLine(crossed.x,0.085,pixel*9.0)*step(0.64,crossed.z);
  var out=color*(0.94+cloud*0.105-fiber*0.085+crossFiber*0.045);
  if(foundation){
    let sheet=floor(q*0.39);let f=fract(q*0.39);
    let seam=dtLine(min(min(f.x,1.0-f.x),min(f.y,1.0-f.y)),0.008,pixel*0.39);
    out*=0.97+dtHash(sheet)*0.04-seam*0.14;
  }else{
    let fold=dtLine(uv.x-uv.y,0.014,pixel);
    let crease=dtLine(uv.x+uv.y-1.0,0.01,pixel);
    out*=1.0-fold*0.07+crease*0.035;
  }
  return out;
}
fn dtGlass(color:vec3f,q:vec2f,n:vec3f,pixel:f32,foundation:bool)->vec3f {
  let warp=vec2f(dtFbm(q*0.40),dtFbm(q*0.40+vec2f(18,7)));
  let cloud=dtFbm(q*1.7+warp*2.8);
  if(foundation){
    let marble=dtFbm(q*0.71+warp*3.4);
    let vein=dtLine(marble-0.50,0.023,pixel*0.6);
    let hairline=dtLine(marble-0.62,0.009,pixel*0.6);
    return color*(0.89+cloud*0.17-vein*0.22-hairline*0.11);
  }
  let ripples=dtCells(q*4.0+warp);
  let bubbles=dtDot(q,5.2,0.06,pixel,0.79);
  let scratch=dtLine(fract(q.x*2.7+dtNoise(q*vec2f(0.1,1.9))*0.25)-0.5,0.008,pixel*2.7);
  let sheen=pow(max(dot(n,normalize(vec3f(-0.42,0.86,0.32))),0.0),18.0);
  var out=color*(0.80+cloud*0.34+ripples.x*0.09-bubbles*0.12);
  out+=mix(color,vec3f(1.0),0.40)*(sheen*0.17+scratch*0.06);
  return out;
}
fn dtFungus(color:vec3f,q:vec2f,p:vec3f,pixel:f32,part:u32,up:f32)->vec3f {
  let warp=vec2f(dtFbm(q*0.65),dtFbm(q*0.65+vec2f(9,23)))-0.5;
  let velvet=dtFbm(q*6.0+warp*2.0);
  if(part==9u){
    let mat=smoothstep(0.29,0.65,dtFbm(q*0.53));
    let net=dtCells(q*1.6+warp*1.3);
    let hyphae=dtLine(net.y,0.020,pixel*1.6);
    let root=dtCells(q*0.63+warp);
    let rootSeam=dtLine(root.y,0.028,pixel*0.63);
    let spores=dtDot(q,5.1,0.11,pixel,0.83);
    var out=color*(0.66+velvet*0.44-rootSeam*0.16);
    out=mix(out,mix(color,palette(3),0.25)*(0.82+velvet*0.30),mat*up*0.75);
    out+=mix(color,palette(2),0.30)*(hyphae*0.29+spores*0.16);
    let section=dtLine(fract((p.y+warp.x*0.15)*7.0)-0.5,0.04,pixel*7.0);
    let pulse=pow(max(sin(q.x*1.7+q.y*2.2-uniforms.time*1.1*motionTempo()),0.0),7.0)*alive();
    let exposed=(1.0-up)*(hyphae+rootSeam)*0.68;
    out=mix(out,palette(1)*(0.70+pulse*0.32),exposed);
    out+=palette(1)*pulse*hyphae*0.22*(1.0-up);
    return out*(1.0-(1.0-up)*(0.10+section*0.18));
  }
  if(part==0u){
    let pores=dtCells(q*6.0+warp*0.6);
    let spots=(1.0-smoothstep(0.10,0.21+pixel*6.0,pores.x))*step(0.38,pores.z);
    let pinhole=dtDot(q,12.0,0.07,pixel,0.74);
    return mix(color*(0.88+velvet*0.19-pinhole*0.13),mix(color,vec3f(0.93,0.89,0.76),0.52),spots*0.74);
  }
  let fibres=dtLine(fract(q.x*8.0+warp.x*0.7)-0.5,0.055,pixel*8.0);
  return color*(0.89+velvet*0.17-fibres*0.10);
}
fn dtCosmic(color:vec3f,q:vec2f,n:vec3f,pixel:f32,foundation:bool)->vec3f {
  let warp=vec2f(dtFbm(q*0.16),dtFbm(q*0.16+vec2f(7,41)))-0.5;
  let nebula=dtFbm(q*0.49+warp*3.0);
  let cloud=smoothstep(0.34,0.72,nebula);
  let stardust=dtDot(q,3.2,0.035,pixel,0.80);
  let stars=dtDot(q,0.9,0.046,pixel,0.87);
  let enamel=dtFbm(q*9.0);
  var out=color*(0.78+enamel*0.13);
  if(foundation){
    let sweep=dtFbm(q*0.22+warp*4.8);
    let nebulaColor=mix(palette(1),palette(2),smoothstep(0.28,0.75,sweep));
    out=mix(out,mix(color,nebulaColor,0.45)*(0.72+cloud*0.42),cloud*0.80);
    let r=length(q);let azimuth=atan2(q.y,q.x);
    let orbit=dtLine(fract(r*0.22)-0.5,0.008,pixel*0.22);
    let ticks=dtLine(fract(azimuth*24.0/3.141593)-0.5,0.018,pixel)*step(0.45,fract(r*0.22));
    out+=palette(3)*(orbit*0.14+ticks*0.025);
    out+=mix(color,vec3f(1.0),0.45)*(stardust*0.20+stars*0.46);
  }else{
    let glint=pow(max(dot(n,normalize(vec3f(-0.42,0.84,0.34))),0.0),22.0);
    out+=mix(color,vec3f(1.0),0.32)*(glint*0.20+stardust*0.08);
  }
  return out;
}
fn dtPlastic(color:vec3f,q:vec2f,n:vec3f,pixel:f32,foundation:bool)->vec3f {
  let grain=dtNoise(q*30.0);let f=fract(q*0.8+vec2f(0.5));
  let molded=min(min(f.x,1.0-f.x),min(f.y,1.0-f.y));
  let seam=dtLine(molded,0.008,pixel*0.8);
  let spec=pow(max(dot(n,normalize(vec3f(-0.45,0.83,0.34))),0.0),26.0);
  var out=color*(0.96+grain*0.035-seam*0.09);
  out+=mix(color,vec3f(1.0),0.42)*spec*0.12;
  if(foundation){
    let d=length(f-0.5);let stud=1.0-smoothstep(0.24,0.26+pixel*0.8,d);
    let rim=dtLine(d-0.25,0.016,pixel*0.8);
    let shade=dot(normalize(vec3f(f-0.5,0.24)),normalize(vec3f(-0.5,-0.6,0.7)));
    out*=1.0-rim*0.16+stud*(0.045+shade*0.10);
  }
  return out;
}
fn dioramaTexture(color:vec3f,p:vec3f,n:vec3f,uv:vec2f,part:u32)->vec3f {
  // World-space projection keeps textures continuous across adjacent meshes.
  let an=abs(n);var q=p.xz;
  if(an.x>an.y && an.x>an.z){q=p.zy;}
  else if(an.z>an.y){q=p.xy;}
  q+=worldDNA(10u).xy*53.0;
  // Derivatives run before material/part branches (part is flat but nonuniform).
  let pixel=max(length(dpdx(q)),length(dpdy(q)));
  let up=smoothstep(0.35,0.85,an.y);let foundation=part==9u;
  var out=color;
  if(MATERIAL_KIND==0u){out=dtEarth(color,q,p,up,pixel,part);}
  else if(MATERIAL_KIND==1u){out=dtStone(color,q,pixel,foundation);}
  else if(MATERIAL_KIND==2u){out=dtPaper(color,q,uv,pixel,foundation);}
  else if(MATERIAL_KIND==3u){out=dtGlass(color,q,n,pixel,foundation);}
  else if(MATERIAL_KIND==4u){out=dtFungus(color,q,p,pixel,part,up);}
  else if(MATERIAL_KIND==5u){out=dtCosmic(color,q,n,pixel,foundation);}
  else {out=dtPlastic(color,q,n,pixel,foundation);}
  let style=materialStyle();let time=uniforms.time*motionTempo()*alive();
  // Material families have different finishes and localized ambient motion;
  // neither layout genes nor the locked QR pigments depend on this treatment.
  if(MATERIAL_KIND==0u){
    if(style==1u){let pores=dtDot(q,4.0,0.075,pixel,0.65);out=mix(out,out*0.74,pores*0.35);}
    if(style==2u){let seams=dtLine(fract(q.y*1.2+dtNoise(q*.5)*.2)-.5,.032,pixel);out*=1.0-seams*.18;}
    if(style==3u && foundation){let roots=dtLine(fract(q.x*.7+sin(q.y*.8)*.3)-.5,.025,pixel);let pulse=pow(max(sin(q.y-time),0.0),6.0);out+=palette(1)*roots*pulse*.20;}
  }else if(MATERIAL_KIND==1u){
    if(style==1u){let moss=smoothstep(.55,.78,dtFbm(q*.8+vec2f(time*.015,0)));out=mix(out,palette(3)*.65,moss*.28);}
    if(style==2u){let glint=pow(max(dot(n,normalize(vec3f(-.4,.8,.3))),0.0),20.0);out+=palette(1)*glint*.20;}
    if(style==3u){let ice=dtLine(fract(q.x*.75+q.y*.4)-.5,.014,pixel);out+=uniforms.themeFifth.rgb*ice*.15;}
  }else if(MATERIAL_KIND==2u){
    if(style==1u){let petal=dtDot(q,1.8,.13,pixel,.6);out=mix(out,palette(2)*.85,petal*.18);}
    if(style==2u){let weave=dtLine(fract(q.x*3.0)-.5,.02,pixel)+dtLine(fract(q.y*2.0)-.5,.015,pixel);out*=1.0-weave*.07;}
    if(style==3u){let foil=dtDot(q,3.5,.07,pixel,.72);out+=palette(1)*foil*(.12+.10*sin(q.x+time*.4));}
  }else if(MATERIAL_KIND==3u){
    if(style==1u){out*=.93+dtNoise(q*15.0)*.15;}
    if(style==2u){let ripple=dtLine(sin(length(q)*1.4-time*.35),.03,pixel);out+=palette(3)*ripple*.12;}
    if(style==3u){let sheen=pow(max(dot(n,normalize(vec3f(sin(time*.1)*.3,.9,.35))),0.0),9.0);out=mix(out,mix(out,uniforms.themeFifth.rgb,.25),sheen*.40);}
  }else if(MATERIAL_KIND==4u){
    if(style==1u && part==0u){let velvet=dtNoise(q*20.0);out*=.88+velvet*.18;}
    if(style==2u && part!=9u){out+=uniforms.themeFifth.rgb*pow(max(n.y,0.0),8.0)*.12;}
    if(style==3u && part==0u){let spots=dtDot(q,2.5,.12,pixel,.6);out=mix(out,uniforms.themeFifth.rgb,spots*.22);}
  }else if(MATERIAL_KIND==5u){
    if(style==1u && !foundation){out+=uniforms.themeFifth.rgb*pow(max(n.y,0.0),12.0)*.14;}
    if(style==2u && foundation){let gas=smoothstep(.55,.8,dtFbm(q*.3+vec2f(time*.025,0)));out+=palette(2)*gas*.16;}
    if(style==3u){let dust=dtDot(q,2.0,.04,pixel,.85);out+=palette(1)*dust*(.10+.12*sin(q.x+time*.7));}
  }else{
    if(style==1u){out=mix(out,color,.32);}
    if(style==2u){let metal=pow(max(dot(n,normalize(vec3f(-.4,.8,.35))),0.0),18.0);out+=uniforms.themeFifth.rgb*metal*.17;}
    if(style==3u && foundation){let sprinkle=dtDot(q,2.0,.06,pixel,.80);out+=palette(1)*sprinkle*.15;}
  }
  return clamp(out,vec3f(0.0),vec3f(1.35));
}
`;
