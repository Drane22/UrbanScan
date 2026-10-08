import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const WAVES_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn worldAnchor(i:u32)->vec3f {let g=gene(i);return vec3f(g.x*uniforms.gridSize,0.04,g.y*uniforms.gridSize);}
fn worldFoundation(v:u32)->Surface {return tile(v,palette(2),palette(0),1.8*uniforms.gridSize/25.0,7.0);}
// Sixteen along-crest segments and four cross-section bands form a curling ribbon.
fn wavePoint(v:u32,i:u32,crest:bool)->vec3f {
 let uv=quad(v);let g=gene(i);let s=uniforms.gridSize/25.0;
 let x=(f32((v/6u)%16u)+uv.x)/16.0-0.5;
 let t=(f32(v/96u)+uv.y)/4.0;
 let time=uniforms.time*motionTempo();let drift=sin(time*0.65+g.w*6.28+x*8.0)*0.12*alive();
 let theta=select(t*4.7,4.25+t*0.38,crest);
 let amplitude=g.z*(1.0+sin(x*7.0+g.w*6.28)*0.18);
 return worldAnchor(i)+vec3f(x*uniforms.gridSize,0.08+(1.0-cos(theta))*amplitude*(1.0+drift),sin(theta)*amplitude*0.72+sin(x*8.0+g.w*6.28)*0.28*s);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
 let g=gene(i);let c=worldAnchor(i);let s=uniforms.gridSize/25.0;
 if(part==0u){return surface(wavePoint(v,i,false),mix(palette(2),palette(3),g.w*0.38),0.04);}
 if(part==1u){return surface(wavePoint(v,i,true)+vec3f(0,0.025*s,0),mix(uniforms.themeFifth.rgb,palette(1),0.12),0.15);}
 if(part==2u){let d=disk(v);let a=g.w*6.28;let p=c+vec3f(d.x*1.3*s,0.07,d.y*0.55*s);return surface(p,mix(palette(2),palette(1),0.25+sin(a)*0.1),0.05);}
 // A translucent-looking inner ridge is a second solid surface, bounded and deterministic.
 return surface(wavePoint(v,i,false)+vec3f(0,-0.08*s,0.09*s),mix(palette(0),palette(2),0.68),0.01);
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
 let g=gene(i+90u);let s=uniforms.gridSize/25.0;let time=uniforms.time*motionTempo();
 var c=vec3f(g.x*uniforms.gridSize,0.10,g.y*uniforms.gridSize);
 if(i<96u){
  let ribbon=i%12u;let x=(f32(i/12u)/8.0-0.44)*uniforms.gridSize;let wave=gene(ribbon);
  let cycle=fract(time*(0.11+g.w*0.08)+g.w);let puff=sin(cycle*PI);
  c=worldAnchor(ribbon)+vec3f(x,1.7*wave.z+cycle*1.4*s,-0.7*wave.z+cycle*0.7*s);
  if(part==4u){return surface(c,palette(0),0);}
  if(part==0u){return surface(c+sphere(v,vec3f(0.045+g.z*0.06)*s*puff),uniforms.themeFifth.rgb,0.22);}
  return surface(c,palette(0),0);
 }
 if(i<128u){
  c.y=0.12+sin(time*0.8+g.w*19.0)*0.05*alive();
  if(part==4u){return surface(c,palette(0),0);}
  if(part==0u){return surface(c+ring(v,(0.28+g.w*0.4)*s,0.035*s),mix(palette(1),uniforms.themeFifth.rgb,0.50),0.12);}
  return surface(c,palette(0),0);
 }
 // A small flock of gulls follows short loops over the sea tile.
 let a=time*0.18+g.w*6.28;c=vec3f(cos(a)*uniforms.gridSize*0.34,(4.1+g.z)*s,sin(a)*uniforms.gridSize*0.32);
 if(part==4u){return surface(c,palette(0),0);}
 if(part==0u){let uv=quad(v);let side=select(-1.0,1.0,v>=192u);let t=(f32((v%192u)/24u)+uv.y)/8.0;let flap=sin(time*3.0+g.w*7.0)*0.3*alive();return surface(c+rotate(vec3f(side*t*0.7,flap*t,(uv.x-0.5)*sin(t*PI)*0.26)*s,a),uniforms.themeFifth.rgb,0.04);}
 return surface(c,palette(0),0);
}
`,
  7,
);
