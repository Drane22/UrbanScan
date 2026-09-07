import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const COLONY_SHADER = createSculpturalWorldShader(/* wgsl */ `
fn worldCount()->u32 {return 76u;}
fn worldAnchor(i:u32)->vec3f {
  let p=spiral(i,76.0,uniforms.gridSize*0.39);
  let h=2.5*exp(-dot(p.xz,p.xz)/(uniforms.gridSize*uniforms.gridSize*0.07));
  return p+vec3f(0,h,0);
}
fn worldFoundation(v:u32)->Surface {
  let d=disk(v); let r=length(d);
  let a=atan2(d.y,d.x);
  let edge=1.0+0.07*sin(a*3.0)+0.035*cos(a*7.0);
  return surface(vec3f(d.x*edge*uniforms.gridSize*0.46,2.2*(1.0-r*r)-0.55,d.y*edge*uniforms.gridSize*0.43),mix(palette(0),palette(2),0.55),0.0);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i); let seed=random(f32(i)+1.0);
  let s=select(0.65+seed*0.6,1.7,i<3u);
  let earth=mix(palette(0),palette(2),0.55);
  if(part==0u) {
    let d=disk(v);let r=length(d);
    let crest=exp(-pow((r-0.74)*5.0,2.0));
    let p=vec3f(d.x*s,crest*(0.55+seed*0.55)-0.10,d.y*s);
    return surface(c+p,mix(palette(0)*0.45,earth,smoothstep(0.28,0.72,r)),0.0);
  }
  let next=worldAnchor(select(i-1u,0u,i==0u));
  if(part==1u) {return surface(bridge(v,c,next,0.16),earth*0.72,0.0);}
  if(part==2u) {
    let p=sphere(v,vec3f(0.16,0.24,0.16))+c+vec3f(0.22,0.18,0.0);
    return surface(p,palette(1),0.0);
  }
  let travel=0.5+0.5*sin(uniforms.time*0.48+seed*17.0);
  let worker=mix(c,next,travel)+vec3f(0.0,0.2,0.0);
  return surface(worker+sphere(v,vec3f(0.08,0.065,0.14)),palette(0)*0.35,0.0);
}
`);
