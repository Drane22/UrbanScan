import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const MYCELIUM_SHADER = createSculpturalWorldShader(/* wgsl */ `
fn worldCount()->u32 {return 64u;}
fn worldAnchor(i:u32)->vec3f {
  let branch=i%5u;let along=f32(i/5u)/13.0;
  let a=f32(branch)*PI*0.4+0.22*sin(along*5.0);
  let r=(0.10+along*0.80)*uniforms.gridSize*0.46;
  return vec3f(cos(a)*r,0.1+0.6*(1.0-along),sin(a)*r);
}
fn worldFoundation(v:u32)->Surface {
  let d=disk(v);let a=atan2(d.y,d.x);let r=length(d);
  let lobes=0.84+0.16*cos(a*5.0);
  return surface(vec3f(d.x*lobes*uniforms.gridSize*0.48,-0.50+0.35*(1.0-r*r),d.y*lobes*uniforms.gridSize*0.48),mix(palette(0),palette(2),0.50)*0.70,0.0);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let seed=random(f32(i)+1.0);
  let size=select(0.65+seed*0.65,1.85,i<5u);
  let height=(1.0+seed*0.8)*size;
  let sway=sin(uniforms.time*0.55+seed*6.28)*0.055;
  if(part==0u) {
    let d=disk(v);let r=length(d);
    let p=vec3f(d.x*size+ sway,height+sqrt(max(0.0,1.0-r*r))*size*0.52,d.y*size);
    let spots=step(0.90,sin(d.x*22.0+seed)*cos(d.y*22.0));
    let cap=mix(palette(1),palette(3),seed*0.55);
    return surface(c+p,mix(cap,uniforms.themeFifth.rgb,spots*0.55),0.12+0.10*sin(uniforms.time*0.65+seed*9.0));
  }
  if(part==1u) {
    var p=cylinder(v,size*0.13,height);
    p.x+=sway*p.y/height;
    return surface(c+p,mix(uniforms.themeFifth.rgb,palette(2),0.12),0.0);
  }
  if(part==2u) {
    let next=worldAnchor(select(i-5u,i,i<5u));
    return surface(bridge(v,c,next,0.055),mix(palette(3),uniforms.themeFifth.rgb,0.4),0.3);
  }
  let cycle=fract(uniforms.time*0.10+seed);
  let drift=vec3f(sin(uniforms.time*0.40+seed*15.0)*0.6,height+0.6+cycle*1.8,cos(uniforms.time*0.3+seed*11.0)*0.4);
  let radius=0.055*sin(cycle*PI);
  return surface(c+drift+sphere(v,vec3f(radius)),palette(3),0.8);
}
`);
