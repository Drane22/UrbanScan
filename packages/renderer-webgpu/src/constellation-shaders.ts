import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const CONSTELLATION_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn worldCount()->u32 {return 111u;}
fn worldAmbientCount()->u32 {return 320u;}
fn worldAnchor(i:u32)->vec3f {
  if(i<3u){
    let c=array<vec3f,3>(vec3f(0,6,0),vec3f(-0.24*uniforms.gridSize,3.9,0.12*uniforms.gridSize),vec3f(0.22*uniforms.gridSize,4.2,0.10*uniforms.gridSize));
    return c[i];
  }
  let cluster=(i-3u)/12u;let node=(i-3u)%12u;let g=gene(i);
  let center=squarePatch(cluster,3u);
  let angle=f32(node)*0.58+gene(cluster).w*6.28;
  let radius=(1.05+sin(f32(node)*1.7)*0.5)*uniforms.gridSize/25.0;
  return center+vec3f(cos(angle)*radius,(1.5+g.w*2.0)*uniforms.gridSize/25.0,sin(angle)*radius);
}
fn worldFoundation(v:u32)->Surface {
  return tile(v,palette(0)*1.1,mix(palette(0),palette(2),0.22),0.85,5.0);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let g=gene(i);let radius=select(0.07+g.w*0.09,1.15+g.w*0.6,i<3u)*uniforms.gridSize/25.0;
  let star=mix(palette(f32(1u+i%3u)),uniforms.themeFifth.rgb,0.35);
  if(part==0u){
    let pulse=1.0+sin(uniforms.time*(0.6+g.w*0.5)+g.w*19.0)*0.035*alive();
    let p=sphere(v,vec3f(radius*pulse));
    let band=0.5+0.5*sin(p.y/radius*19.0+sin(p.x*3.0)*0.6);
    let pigment=select(star,mix(star,palette(f32(1u+i%3u))*0.72,band*0.6),i<3u);
    return surface(c+p,pigment*(0.94+sin(uniforms.time*0.8+g.w*17.0)*0.06*alive()),0.75);
  }
  if(part==1u){
    if(i<3u || (i-3u)%12u==0u){return surface(c,star,0.0);}
    let next=worldAnchor(i-1u);
    let p=bridge(v,c,next,0.016);
    let shimmer=0.90+sin(uniforms.time*0.6+p.x*0.7+p.z*0.4)*0.10*alive();
    return surface(p,mix(palette(1),palette(2),0.4)*shimmer,0.65);
  }
  if(part==2u && i<3u){
    let p=ring(v,radius*1.8,0.025);
    let tilt=0.3+sin(uniforms.time*0.25+g.w*6.28)*0.08*alive();
    return surface(c+vec3f(p.x,p.y+p.z*tilt,p.z),palette(3),0.75);
  }
  if(part==3u && i<3u){
    let p=ring(v,radius*2.35,0.018);
    return surface(c+vec3f(p.x,p.z*0.6+p.y,p.z*0.8),palette(1),0.7);
  }
  return surface(c,star,0.0);
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
  let g=gene(i+80u);let ground=squarePatch(i,18u);
  if(part==4u){return surface(ground,palette(0),0.0);}
  if(i==0u){
    let pivot=vec3f(0,1.0,0);let aim=vec3f(cos(0.8),0.6,sin(0.8))*1.7;
    if(part==0u){return surface(cylinder(v,1.45,0.25),mix(palette(0),palette(3),0.3),0.25);}
    if(part==1u){return surface(bridge(v,pivot-aim*0.4,pivot+aim,0.26),palette(2),0.4);}
    if(part==2u){return surface(bridge(v,vec3f(0,0.25,0),pivot,0.13),palette(3),0.3);}
    return surface(pivot+aim+sphere(v,vec3f(0.28)),palette(1),0.8);
  }
  if(i<226u){
    if(part>0u){return surface(ground,palette(0),0.0);}
    return surface(ground+sphere(v,vec3f(0.04+g.w*0.065)),mix(palette(1),palette(3),g.w),0.65);
  }
  if(i<272u){
    if(part>0u){return surface(ground,palette(0),0.0);}
    let a=uniforms.time*0.15+g.w*6.28;
    let p=ground+vec3f(sin(a)*0.5,1.3+g.z+sin(a*0.6)*0.5,cos(a)*0.4);
    return surface(p+sphere(v,vec3f(0.035)),palette(1),0.85);
  }
  if(i<309u){
    let center=worldAnchor((i-272u)%3u);let a=uniforms.time*(0.20+g.w*0.15)+g.w*6.28;
    let r=1.5+g.z*0.7;let path=center+vec3f(cos(a)*r,sin(a)*0.42,sin(a)*r);
    if(part==0u){return surface(path+sphere(v,vec3f(0.075*g.z)),palette(3),0.9);}
    if(part==1u){return surface(path+rotate(box(v,vec3f(0.30,0.018,0.09)),a+PI*0.5),palette(1),0.7);}
    return surface(path,palette(0),0.0);
  }
  let cycle=fract(uniforms.time*0.06+g.w);let envelope=sin(cycle*PI);
  let path=vec3f((cycle-0.5)*uniforms.gridSize*0.6,4.8+g.z, g.y*uniforms.gridSize*0.6);
  if(part==0u){return surface(path+sphere(v,vec3f(0.075*envelope)),palette(1),0.95);}
  if(part==1u){return surface(bridge(v,path,path-vec3f(0.9*envelope,0.18*envelope,0),0.015*envelope),palette(3),0.75);}
  return surface(path,palette(0),0.0);
}
`,
  5,
);
