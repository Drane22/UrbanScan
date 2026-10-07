import { TERRAIN_UNIFORMS_WGSL, TERRAIN_RELIEF_WGSL } from "./terrain-shaders.js";
import { DIORAMA_PRIMITIVES_WGSL } from "./diorama-primitives.js";

export const TERRAIN_DETAIL_INSTANCES = 96 * 4;
export const TERRAIN_DETAIL_SHADER = /* wgsl */ `
${TERRAIN_UNIFORMS_WGSL}
@group(0) @binding(0) var<uniform> uniforms:Uniforms;
@group(0) @binding(3) var<storage,read> blockHeights:array<f32>;
${TERRAIN_RELIEF_WGSL}
const PI:f32=3.14159265359;
struct Surface {p:vec3f,color:vec3f,emission:f32,}
${DIORAMA_PRIMITIVES_WGSL}
struct DetailOutput {
 @builtin(position) position:vec4f,
 @location(0) world:vec3f,
 @location(1) color:vec3f,
 @location(2) emission:f32,
}
fn mineralCrystal(v:u32,radius:f32,height:f32,lean:f32)->vec3f {
 let uv=quad(v);let t=(f32((v/6u)%16u)+uv.x)/16.0;
 let edge=floor(t*6.0);let blend=fract(t*6.0);
 let a=edge*PI/3.0;let b=(edge+1.0)*PI/3.0;
 let hex=mix(vec2f(cos(a),sin(a)),vec2f(cos(b),sin(b)),blend);
 let band=v/96u;let radii=array<f32,5>(1.0,1.0,0.82,0.0,0.0);let levels=array<f32,5>(0.0,0.72,0.86,1.0,1.0);
 let r=mix(radii[band],radii[band+1u],uv.y)*radius;let y=mix(levels[band],levels[band+1u],uv.y)*height;
 return vec3f(hex.x*r+lean*y,y,hex.y*r);
}
fn floatingRock(v:u32,size:vec3f)->vec3f {
 let p=sphere(v,size);let direction=normalize(p+vec3f(0.000001));
 return p*(0.92+sin(dot(direction,vec3f(3.0,5.0,4.0)))*0.10);
}
fn mineralAnchor(i:u32)->vec3f {
 var p=squarePatch(i,8u);p.x*=0.96;p.z*=0.96;p.y=terrainElevation(p.xz);
 return p;
}
@vertex fn vertexMain(@builtin(vertex_index) v:u32,@builtin(instance_index) instance:u32)->DetailOutput {
 var o:DetailOutput;o.position=vec4f(2,2,2,1);
 if(uniforms.progress>=0.62){return o;}
 let i=instance/4u;let part=instance%4u;let g=gene(i+110u);let s=uniforms.gridSize/25.0;
 let time=uniforms.time*motionTempo();var anchor=mineralAnchor(i);var p=anchor;
 var color=palette(1);var glow=0.0;
 if(i<48u){
  // Each link chooses its own crystalline ridges, cluster sizes and facets.
  let a=g.w*PI*2.0+f32(part)*2.1;let height=(0.8+g.z*1.5)*select(1.0,2.0,i%11u==0u)*s;
  let radius=(0.30+g.w*0.35)*s;
  p=anchor+rotate(mineralCrystal(v,radius,height,g.x*0.25)+vec3f(f32(part)*0.35*s,0,0),a);
  color=mix(palette(3),uniforms.themeFifth.rgb,0.08+f32(part)*0.07);
  if(materialStyle()==0u){color=mix(palette(1),uniforms.themeFifth.rgb,0.08+f32(part)*0.06);}
  if(i%7u==0u){color=palette(1);}
  if(materialStyle()==1u){color=mix(palette(0),palette(2),0.16+f32(part)*0.10);}
  if(materialStyle()==2u){color=mix(palette(2),uniforms.themeFifth.rgb,0.2+f32(part)*0.13);}
  glow=0.12+pow(max(sin(time*0.6+g.w*8.0),0.0),10.0)*0.4;
 }else if(i<72u){
  let slot=i-48u;anchor=mineralAnchor(slot*2u+5u);
  let hover=(1.9+g.w*2.8+sin(time*0.7+g.w*9.0)*0.45)*s;
  let rockSize=(0.55+g.z*0.65)*s;
  if(part==0u){p=anchor+vec3f(0,hover,0)+rotate(floatingRock(v,vec3f(rockSize,rockSize*0.75,rockSize*0.8)),time*0.12+g.w*PI);color=mix(palette(0),palette(2),0.48);}
  else if(part==1u){p=anchor+vec3f(0,hover+rockSize*0.35,0)+mineralCrystal(v,rockSize*0.40,rockSize*1.35,g.x*0.15);color=palette(1);glow=0.30;}
  else if(part==2u){p=anchor+vec3f(0,0.1,0)+ring(v,rockSize*(0.7+sin(time+g.w*6.28)*0.12),0.045*s);color=palette(3);glow=0.15;}
  else{let a=time*0.65+g.w*6.28;p=anchor+vec3f(cos(a)*rockSize*1.7,hover*0.6,sin(a)*rockSize*1.7)+sphere(v,vec3f(0.12*s));glow=0.8;}
 }else if(i<88u){
  // Visible glints travel along the same seeded river carved into the surface.
  let t=fract(time*0.055+f32(i-72u)/16.0+g.w*0.2);let dna=terrainGene(705u);let n=uniforms.gridSize;
  let along=(t-0.5)*n;let bend=sin(along/n*7.0+dna.x*6.28)*n*(0.12+dna.z*0.035)+dna.y*n*0.35;
  var xz=select(vec2f(bend,along),vec2f(along,bend),dna.w>0.5);xz=clamp(xz,vec2f(-n*0.49),vec2f(n*0.49));
  anchor=vec3f(xz.x,terrainElevation(xz)+0.07*s,xz.y);
  if(part<2u){p=anchor+ring(v,(0.20+f32(part)*0.17)*s,0.030*s);color=mix(palette(1),uniforms.themeFifth.rgb,0.4);glow=0.65;}
  else{p=anchor;color=palette(3);}
 }else{
  // Infrequent mineral vents: magma jets, opal dust, sand fountains or geode pulses.
  anchor=mineralAnchor((i-88u)*7u+3u);
  let cycle=fract(time*0.035+worldDNA(i-88u+20u).w);
  let event=smoothstep(0.08,0.16,cycle)*(1.0-smoothstep(0.40,0.63,cycle));
  let rise=max(0.0,cycle-0.08)*12.0;let a=f32(part)*PI*0.5+g.w*PI;
  p=anchor+vec3f(cos(a)*rise*0.4,rise*1.8,sin(a)*rise*0.4)*s+sphere(v,vec3f((0.25+f32(part)*0.10)*event*s));
  color=select(palette(1),uniforms.themeFifth.rgb,materialStyle()==2u);glow=event*0.95;
 }
 let build=smoothstep(0.4+g.w*0.7,2.3,uniforms.camera.z);
 let show=(1.0-phase(0.05,0.62))*build;
 p=mix(anchor,p,show);p.x=clamp(p.x,-uniforms.gridSize*0.5,uniforms.gridSize*0.5);p.z=clamp(p.z,-uniforms.gridSize*0.5,uniforms.gridSize*0.5);
 o.world=p*uniforms.blockSize;o.position=terrainProject(o.world);o.color=color;o.emission=glow;return o;
}
@fragment fn fragmentMain(o:DetailOutput)->@location(0) vec4f {
 let n=normalize(cross(dpdx(o.world),dpdy(o.world))+vec3f(0.000001));
 let light=0.55+abs(dot(n,normalize(vec3f(-0.4,0.85,-0.3))))*0.45;
 let grain=0.95+fract(sin(dot(o.world.xz/uniforms.blockSize,vec2f(37.1,61.7)))*43758.5)*0.10;
 return vec4f(clamp(o.color*mix(light*grain,1.12,o.emission),vec3f(0),vec3f(1)),1);
}
`;
