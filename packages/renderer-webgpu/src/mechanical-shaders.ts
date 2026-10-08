import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const MECHANICAL_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn worldAnchor(i:u32)->vec3f {let g=gene(i);return vec3f(g.x*uniforms.gridSize,0.06,g.y*uniforms.gridSize);}
fn worldFoundation(v:u32)->Surface {return tile(v,mix(palette(0),palette(2),0.40),palette(0),1.9*uniforms.gridSize/25.0,9.0);}
fn machineGear(v:u32,a:f32,r:f32)->vec3f {
 let uv=quad(v);let tooth=(v/24u)%16u;let band=v/96u;
 let theta=(f32((v/6u)%16u)+uv.x)*PI/8.0+a;
 let radius=r*(0.82+select(0.0,0.18,(tooth%2u)==0u));
 let rs=array<f32,5>(0.0,1.0,1.0,0.0,0.0);let ys=array<f32,5>(0.15,0.15,0.0,0.0,0.0);
 let rr=radius*mix(rs[band],rs[band+1u],uv.y);
 return vec3f(cos(theta)*rr,mix(ys[band],ys[band+1u],uv.y)*r,sin(theta)*rr);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
 let g=gene(i);let c=worldAnchor(i);let s=uniforms.gridSize/25.0;let pitch=uniforms.gridSize/8.0;
 let time=uniforms.time*motionTempo();let motion=sin(time*(0.8+g.w)+g.w*6.28)*alive();
 if(part==0u){return surface(c+box(v,vec3f(pitch*0.86,(0.18+g.w*0.14)*s,pitch*0.86)),mix(palette(2),palette(3),g.w*0.20),0);}
 if(part==1u){let a=time*select(-0.45,0.45,i%2u==0u)*alive()+g.w*6.28;return surface(c+vec3f(-0.35,0.38,0)*s+machineGear(v,a,(0.72+g.w*0.35)*s),palette(1),0.04);}
 if(part==2u){
  let band=v/96u;let stroke=(0.5+motion*0.28)*g.z*s;let r=select(0.21,0.10,band>1u)*s;
  let p=cylinder(v,r,(1.15+stroke/s)*s);return surface(c+vec3f(0.65,0.26,0.35)*s+p,mix(uniforms.themeFifth.rgb,palette(2),select(0.75,0.15,band>1u)),0.02);
 }
 if(i%3u==0u){
  // Six vent slats above a dark recess.
  let slat=(v/64u)%6u;let p=cube(v%64u,vec3f(1.45,0.08,0.12)*s)+vec3f(0,0.34,(f32(slat)-2.5)*0.23)*s;
  return surface(c+p,palette(0)*1.8,0);
 }
 let end=worldAnchor(select(i+1u,i,i%8u==7u))+vec3f(0,0.3*s,0);
 return surface(bridge(v,c+vec3f(0,0.3*s,0),end,0.065*s),mix(palette(0),palette(3),0.38),0);
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
 let g=gene(i+90u);let s=uniforms.gridSize/25.0;let time=uniforms.time*motionTempo();let half=uniforms.gridSize*0.47;
 var c=vec3f(0,0.38*s,0);
 if(i<32u){
  let row=i/4u;let side=select(-1.0,1.0,i%2u==0u);let z=(f32(row)/8.0-0.4375)*uniforms.gridSize+side*1.18*s;
  c=vec3f(0,0.38*s,z);
  if(part==4u){return surface(c,palette(0),0);}
  if(part==0u){return surface(c+box(v,vec3f(uniforms.gridSize*0.95,0.12*s,0.08*s)),mix(uniforms.themeFifth.rgb,palette(2),0.30),0.02);}
  if(part==1u){let uv=quad(v);let x=(f32(v/6u)+uv.x)/64.0*uniforms.gridSize-uniforms.gridSize*0.5;return surface(vec3f(x,0.32*s,z+(uv.y-0.5)*0.35*s),palette(0),0);}
  return surface(c,palette(0),0);
 }
 if(i<48u){
  let slot=i-32u;let z=(f32(slot%8u)/8.0-0.4375)*uniforms.gridSize;
  c=vec3f(-half,0.5*s,z);let end=vec3f(half,0.5*s,z);
  if(part==4u){return surface(c,palette(0),0);}
  if(part==0u){return surface(bridge(v,c,end,0.08*s),palette(3),0.02);}
  let t=fract(time*0.12+g.w);if(part==1u){return surface(mix(c,end,t)+sphere(v,vec3f(0.13*s)),palette(1),0.65);}
  return surface(c,palette(0),0);
 }
 if(i<56u){
  let slot=i-48u;let a=f32(slot)*PI*0.25;c=vec3f(cos(a)*half,0,sin(a)*half);
  let head=c+vec3f(0,3.8*s,0);let arm=rotate(vec3f(-2.6,0,0)*s,time*0.18*alive()+g.w*6.28);
  if(part==4u){return surface(c,palette(0),0);}
  if(part==0u){return surface(bridge(v,c,head,0.14*s),palette(1),0);}
  if(part==1u){return surface(bridge(v,head,head+arm,0.12*s),palette(2),0);}
  if(part==2u){return surface(bridge(v,head+arm,head+arm-vec3f(0,1.4*s,0),0.035*s),palette(0),0);}
  return surface(head+arm-vec3f(0,1.4*s,0)+box(v,vec3f(0.42,0.35,0.42)*s),palette(3),0.08);
 }
 // Maintenance crawlers move along bounded rail lanes and reverse smoothly.
 let lane=(i-56u)%8u;let travel=sin(time*(0.16+g.w*0.07)+g.w*6.28)*half;
 c=vec3f(travel,0.55*s,(f32(lane)/8.0-0.4375)*uniforms.gridSize);
 if(part==4u){return surface(c,palette(0),0);}
 if(part==0u){return surface(c+box(v,vec3f(1.3,0.65,0.78)*s),palette(3),0);}
 if(part==1u){return surface(c+vec3f(0,0.65,0)*s+sphere(v,vec3f(0.25,0.1,0.25)*s),palette(1),0.65);}
 if(part==2u){let a=time*2.0*alive();return surface(c+vec3f(0,-0.05,0)*s+machineGear(v,a,0.48*s),palette(0),0);}
 return surface(c,palette(0),0);
}
`,
  9,
);
