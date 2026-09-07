import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const CONSTELLATION_SHADER = createSculpturalWorldShader(/* wgsl */ `
fn worldCount()->u32 {return 72u;}
fn worldAnchor(i:u32)->vec3f {
  let p=spiral(i,72.0,uniforms.gridSize*0.43);
  return p+vec3f(0.0,1.3+sin(f32(i)*1.73)*2.3+random(f32(i))*1.5,0.0);
}
fn worldFoundation(v:u32)->Surface {
  // A narrow orbital ribbon leaves the star field open instead of a square plate.
  let p=ring(v,uniforms.gridSize*0.43,0.035);
  return surface(p+vec3f(0,-1.4,0),mix(palette(1),palette(3),0.5),0.55);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let seed=random(f32(i)+1.0);
  let radius=select(0.13+seed*0.18,0.85,i<3u);
  let star=mix(palette(f32(i%4u)),vec3f(1.0),0.5);
  if(part==0u) {
    let twinkle=0.94+0.06*sin(uniforms.time*0.8+seed*20.0);
    return surface(c+sphere(v,vec3f(radius)),star*twinkle,0.9);
  }
  if(part==1u) {
    let next=worldAnchor(select(i-13u,i,i<13u));
    return surface(bridge(v,c,next,0.016),mix(palette(1),vec3f(0.8),0.3),0.5);
  }
  if(part==2u) {
    let p=ring(v,radius*2.0,0.018);
    return surface(c+vec3f(p.x,p.y+p.z*0.35,p.z),star*0.7,0.6);
  }
  let a=uniforms.time*(0.16+seed*0.12)+seed*PI*2.0;
  let orbit=vec3f(cos(a),sin(a)*0.35,sin(a))*radius*2.0;
  return surface(c+orbit+sphere(v,vec3f(0.07)),palette(3),0.9);
}
`);
