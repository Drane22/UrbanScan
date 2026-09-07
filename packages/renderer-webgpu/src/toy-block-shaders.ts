import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const TOY_BLOCK_SHADER = createSculpturalWorldShader(/* wgsl */ `
fn worldCount()->u32 {return 120u;}
fn worldAnchor(i:u32)->vec3f {
  // Interlocked courses make a stepped castle, with four taller corner towers.
  let course=i/24u;let slot=i%24u;
  let side=slot/6u;let along=f32(slot%6u)-2.5;
  let span=select(3.0,2.0,course>=3u);
  let p=rotate(vec3f(along,0.0,span),f32(side)*PI*0.5);
  return vec3f(p.x*1.65,f32(course)*0.72,p.z*1.65);
}
fn worldFoundation(v:u32)->Surface {
  let d=disk(v);let a=atan2(d.y,d.x);
  let r=uniforms.gridSize*(0.46+0.025*cos(a*8.0));
  return surface(vec3f(d.x*r,-0.35,d.y*r),mix(palette(2),uniforms.themeFifth.rgb,0.55),0.0);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let seed=random(f32(i)+1.0);
  let heading=f32((i%24u)/6u)*PI*0.5;
  let color=palette(f32((i/24u+i%3u)%4u));
  if(part==0u) {
    return surface(c+rotate(box(v,vec3f(1.60,0.65,1.5)),heading),color,0.0);
  }
  if(part==1u || part==2u) {
    let p=cylinder(v,0.23,0.16)+vec3f(select(-0.4,0.4,part==2u),0.65,0.0);
    return surface(c+rotate(p,heading),color*1.08,0.0);
  }
  // A few small wheeled toys circle the castle; other accessories remain folded away.
  if(i>5u) {return surface(c,color,0.0);}
  let a=uniforms.time*0.12+f32(i)*0.17;
  let path=vec3f(cos(a),0.0,sin(a))*uniforms.gridSize*0.42;
  let p=rotate(box(v,vec3f(0.7,0.38,0.40)),a+PI*0.5);
  return surface(path+p,palette(f32(i)),0.0);
}
`);
