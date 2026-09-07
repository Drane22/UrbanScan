import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const ORIGAMI_SHADER = createSculpturalWorldShader(/* wgsl */ `
fn worldCount()->u32 {return 48u;}
fn worldAnchor(i:u32)->vec3f {
  let p=spiral(i,48.0,uniforms.gridSize*0.40);
  let a=f32(i)*2.39996323;
  return p+vec3f(0,1.5+2.4*(1.0-f32(i)/48.0)+0.6*sin(a),0);
}
fn worldFoundation(v:u32)->Surface {
  let d=disk(v);let a=atan2(d.y,d.x);
  let r=length(d);let fold=abs(sin(a*4.0));
  return surface(vec3f(d.x*uniforms.gridSize*0.37,(1.0-r)*1.8*fold-0.5,d.y*uniforms.gridSize*0.28),mix(palette(2),uniforms.themeFifth.rgb,0.72),0.0);
}
fn paperWing(v:u32,side:f32,flap:f32)->vec3f {
  let q=squarePoint(v)*2.0;
  let span=(q.x+1.0)*0.5;
  return vec3f(side*span*1.65,span*(0.35+flap),q.y*(1.0-span)*0.65);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let seed=random(f32(i)+1.0);
  let heading=f32(i)*2.39996323+0.7;
  let scale=select(0.65+seed*0.40,1.8,i<3u);
  let flap=sin(uniforms.time*0.85+seed*6.28)*0.14;
  let paper=mix(palette(floor(seed*4.0)),uniforms.themeFifth.rgb,0.26);
  var p=vec3f(0.0);
  if(part==0u || part==1u) {
    p=paperWing(v,select(-1.0,1.0,part==1u),flap);
  } else if(part==2u) {
    let q=disk(v);
    p=vec3f(q.x*0.16,0.16*(1.0-abs(q.x)),q.y*0.90);
  } else {
    let q=squarePoint(v)*2.0;
    p=vec3f(q.x*0.10*(1.0-abs(q.y)),(q.y+1.0)*0.45,-0.70-abs(q.y)*0.28);
  }
  return surface(c+rotate(p*scale,heading),paper*select(1.0,0.84,part==1u),0.0);
}
`);
