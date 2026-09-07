import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const DUNGEON_SHADER = createSculpturalWorldShader(/* wgsl */ `
fn worldCount()->u32 {return 145u;}
fn worldAnchor(i:u32)->vec3f {
  // Three circular chambers joined by a central ruined keep.
  let room=i%3u;let slot=i/3u;
  let a=f32(room)*PI*2.0/3.0+0.3;
  let center=vec3f(cos(a),0.0,sin(a))*uniforms.gridSize*0.21;
  let angle=f32(slot%16u)*PI/8.0;
  let radius=uniforms.gridSize*0.14;
  return center+vec3f(cos(angle)*radius,f32(slot/16u)*0.80,sin(angle)*radius);
}
fn worldFoundation(v:u32)->Surface {
  let d=disk(v);let a=atan2(d.y,d.x);let r=length(d);
  let edge=0.92+0.09*cos(a*3.0)+0.045*sin(a*5.0);
  return surface(vec3f(d.x*edge*uniforms.gridSize*0.47,-0.6+0.4*(1.0-r),d.y*edge*uniforms.gridSize*0.47),mix(palette(0),palette(2),0.5),0.0);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let seed=random(f32(i)+1.0);
  let angle=f32((i/3u)%16u)*PI/8.0;
  let stone=mix(palette(0),palette(2),0.38+seed*0.25);
  let width=uniforms.gridSize*0.058;
  let broken=select(1.0,0.28,(i/3u)%16u==0u || (i/3u)%16u==1u);
  if(part==0u) {
    let p=rotate(box(v,vec3f(width,0.65*broken,0.6)),angle+PI*0.5);
    return surface(c+p,stone,0.0);
  }
  if(part==1u) {
    let p=rotate(box(v,vec3f(width*0.44,0.32*broken,0.68)),angle+PI*0.5);
    return surface(c+p+vec3f(0,0.66*broken,0),stone*1.12,0.0);
  }
  if(part==2u) {
    if(i%4u!=0u) {return surface(c,stone,0.0);}
    let p=cylinder(v,0.14,0.45)+c+vec3f(0,0.65,0);
    return surface(p,stone*0.45,0.0);
  }
  if(i%4u!=0u) {return surface(c,stone,0.0);}
  let flame=0.7+0.12*sin(uniforms.time*7.0+seed*23.0)+0.08*sin(uniforms.time*13.0);
  let p=sphere(v,vec3f(0.12,0.30*flame,0.12))+c+vec3f(sin(uniforms.time*2.0+seed)*0.035,1.20,0);
  return surface(p,mix(vec3f(1.0,0.36,0.055),palette(3),0.20),1.0);
}
`);
