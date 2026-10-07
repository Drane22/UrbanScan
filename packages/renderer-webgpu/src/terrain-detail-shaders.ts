import { TERRAIN_UNIFORMS_WGSL, TERRAIN_RELIEF_WGSL } from "./terrain-shaders.js";
import { DIORAMA_PRIMITIVES_WGSL } from "./diorama-primitives.js";

export { TERRAIN_DETAIL_INSTANCES } from "./terrain-population.js";
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
 @location(3) @interpolate(flat) material:u32,
}
fn gardenAnchor(i:u32)->vec3f {
 var p=squarePatch(i,12u);let n=uniforms.gridSize;
 p.x=clamp(p.x,-n*0.48,n*0.48);p.z=clamp(p.z,-n*0.48,n*0.48);
 // Plant on banks, retaining an open channel for the moving water.
 if(terrainRiver(p.xz)>0.50){
  let dna=terrainGene(705u);let axis=select(p.xz,p.zx,dna.w>0.5);
  let bend=sin(axis.y/n*7.0+dna.x*6.28)*n*(0.12+dna.z*0.035)+dna.y*n*0.35;
  let across=bend+select(-1.0,1.0,gene(i).x>0.0)*n*0.055;
  let bank=select(vec2f(across,axis.y),vec2f(axis.y,across),dna.w>0.5);
  p.x=clamp(bank.x,-n*0.48,n*0.48);p.z=clamp(bank.y,-n*0.48,n*0.48);
 }
 p.y=terrainTransitionElevation(p.xz);return p;
}
fn gardenFlower(v:u32,scale:f32)->vec3f {
 let d=disk(v);let a=atan2(d.y,d.x);let petal=0.76+cos(a*5.0)*0.24;
 return vec3f(d.x*petal,0.06+sin(length(d)*PI)*0.14,d.y*petal)*scale;
}
@vertex fn vertexMain(@builtin(vertex_index) v:u32,@builtin(instance_index) instance:u32)->DetailOutput {
 var o:DetailOutput;o.position=vec4f(2,2,2,1);
 if(treeFoliageVisibility()<0.001){return o;}
 let i=instance/4u;let part=instance%4u;let g=gene(i+110u);let s=uniforms.gridSize/25.0;
 let time=uniforms.time*motionTempo();var anchor=gardenAnchor(i);var p=anchor;
 var color=terrainGrassColor();var glow=0.0;
 if(i<144u){
  let reeds=1.0-smoothstep(0.02,0.16,terrainRiver(anchor.xz));
  let h=(0.28+g.z*0.22)*s;let sway=sin(time*0.85+anchor.x*0.3+anchor.z*0.4)*0.12*s;
  if(part<2u){
   p=anchor+rotate(tuft(v,h*(1.1+f32(part)*0.18),0.10*s,g.w+f32(part)*0.3),g.w*6.28)+vec3f(f32(part)*0.33*s,0,0);
   color=mix(terrainGrassColor()*0.76,terrainGrassColor()*1.28,f32(part)*0.52+g.w*0.24);
  }else if(part==2u){
   p=anchor+cylinder(v,0.020*s,h*0.95)+vec3f(sway,0,0);
   color=terrainGrassColor()*0.72;
  }else{
   let flowerSize=(0.14+g.w*0.065)*s;
   p=anchor+gardenFlower(v,flowerSize)+vec3f(sway,h*0.95,0);
   color=mix(palette(1),uniforms.themeFifth.rgb,select(0.12,0.70,i%5u==0u));
   if(materialStyle()==2u){color=mix(palette(3),uniforms.themeFifth.rgb,0.14);}
   if(materialStyle()==3u){color=palette(3);}
   if(reeds<0.70){p=anchor+cylinder(v,0.08*s,h*1.25);color=mix(palette(2),palette(0),0.3);}
  }
 }else if(i<168u){
  // Rounded shrubs and small canopy trees, with separately moving leaf clusters.
  anchor=gardenAnchor((i-144u)*5u+2u);let h=(3.6+g.z*1.25)*s;
  anchor.x=clamp(anchor.x,-uniforms.gridSize*0.42,uniforms.gridSize*0.42);
  anchor.z=clamp(anchor.z,-uniforms.gridSize*0.42,uniforms.gridSize*0.42);
  anchor.y=terrainTransitionElevation(anchor.xz);
  let sway=sin(time*0.65+g.w*9.0)*0.10*s;
  if(part==0u){p=anchor+cylinder(v,0.17*s,h*0.76);color=mix(palette(0),palette(2),0.3);}
  else if(part==1u){p=anchor+bridge(v,vec3f(0,h*0.45,0),vec3f(0.70*s+sway,h*0.80,0.45*s),0.065*s);color=palette(2)*0.72;}
  else{
   let a=g.w*6.28+f32(part)*2.4;
   var canopy=sphere(v,vec3f((1.10+g.w*0.26)*s,1.08*s,1.08*s));
   let lobe=1.0+sin(atan2(canopy.z,canopy.x)*5.0+g.w*6.0)*0.09;
   canopy.x*=lobe;canopy.z*=lobe;
   p=anchor+canopy+vec3f(cos(a)*0.55*s+sway,h*(0.63+f32(part-2u)*0.19),sin(a)*0.55*s);
   color=mix(terrainGrassColor(),uniforms.terrainMeadow.rgb,0.10+f32(part-2u)*0.24);
  }
 }else if(i<180u){
  // Ripples travel down the exact meander carved into the terrain.
  let t=fract(time*0.035+f32(i-168u)/12.0+g.w*0.08);let dna=terrainGene(705u);let n=uniforms.gridSize;
  let along=(t-0.5)*n*0.96;let bend=sin(along/n*7.0+dna.x*6.28)*n*(0.12+dna.z*0.035)+dna.y*n*0.35;
  let xz=clamp(select(vec2f(bend,along),vec2f(along,bend),dna.w>0.5),vec2f(-n*0.48),vec2f(n*0.48));
  anchor=vec3f(xz.x,terrainTransitionElevation(xz)+0.06*s,xz.y);
  if(part<2u){p=anchor+ring(v,(0.24+f32(part)*0.23)*s,0.024*s);color=mix(terrainStreamColor(),uniforms.themeFifth.rgb,0.55);glow=0.25;}
  else{p=anchor+sphere(v,vec3f(0.12*s,0.045*s,0.09*s))+vec3f(f32(part-2u)*0.38*s,0,0);color=uniforms.themeFifth.rgb;}
 }else if(i<186u){
  // Large dragonflies hover, steer and dart; wings beat independently of foliage.
  anchor=gardenAnchor((i-180u)*23u+11u);
  let a=time*0.43+g.w*6.28;let hover=vec3f(sin(a)*1.0,1.6+sin(time*1.2+g.w*6.0)*0.28,cos(a*0.8)*0.8)*s;
  var body=vec3f(0.0);color=palette(1);
  if(part==0u){body=sphere(v,vec3f(0.12*s,0.11*s,0.62*s));color=terrainStreamColor()*0.65;}
  else if(part==1u){body=sphere(v,vec3f(0.19*s))+vec3f(0,0,0.58*s);color=palette(0);}
  else{
   let side=select(-1.0,1.0,part==3u);let wing=sphere(v,vec3f(0.62*s,0.025*s,0.24*s));
   body=wing+vec3f(side*0.52*s,abs(wing.x)*sin(time*16.0+g.w*9.0)*0.55,0.10*s);
   color=mix(palette(1),uniforms.themeFifth.rgb,0.55);glow=0.20;
  }
  p=anchor+hover+rotate(body,a+PI*0.5);
 }else{
  // Rabbits pause between hops. Bodies, heads and ears remain easy to distinguish.
  anchor=gardenAnchor((i-186u)*19u+4u);
  let cycle=fract(time*0.17+g.w);let hop=pow(max(sin(cycle*PI*2.0),0.0),3.0);
  let drift=vec3f(sin(time*0.23+g.w*8.0)*0.85,hop*0.50,cos(time*0.23+g.w*8.0)*0.65)*s;
  anchor.x+=drift.x;anchor.z+=drift.z;anchor.y=terrainTransitionElevation(anchor.xz)+drift.y;
  var body=vec3f(0);color=mix(uniforms.themeFifth.rgb,palette(2),0.20+g.w*0.18);
  if(part==0u){body=sphere(v,vec3f(0.42*s,0.30*s,0.59*s))+vec3f(0,0.30*s,0);}
  else if(part==1u){body=sphere(v,vec3f(0.29*s))+vec3f(0,0.54*s,0.46*s);}
  else{body=sphere(v,vec3f(0.095*s,0.35*s,0.10*s))+vec3f(select(-0.13,0.13,part==3u)*s,0.95*s,0.45*s);color=mix(color,palette(1),0.22);}
  p=anchor+rotate(body,time*0.23+g.w*8.0);
 }
 let build=smoothstep(0.30+g.w*0.55,1.80,uniforms.camera.z);
 let show=treeFoliageVisibility()*mix(build,1.0,phase(0.0,0.15));
 p=mix(anchor,p,show);p.x=clamp(p.x,-uniforms.gridSize*0.5,uniforms.gridSize*0.5);p.z=clamp(p.z,-uniforms.gridSize*0.5,uniforms.gridSize*0.5);
 o.material=0u;
 if(i<144u && part==3u){o.material=3u;}
 else if(i>=144u && i<168u){o.material=select(2u,1u,part>=2u);}
 else if(i>=168u && i<180u){o.material=4u;}
 else if(i>=186u){o.material=5u;}
 o.world=p*uniforms.blockSize;o.position=terrainProject(o.world);o.color=color;o.emission=glow;return o;
}
@fragment fn fragmentMain(o:DetailOutput)->@location(0) vec4f {
 let n=normalize(cross(dpdx(o.world),dpdy(o.world))+vec3f(0.000001));
 let light=0.60+abs(dot(n,normalize(vec3f(-0.4,0.85,-0.3))))*0.40;
 let grain=0.91+fract(sin(dot(o.world.xz/uniforms.blockSize,vec2f(37.1,61.7)))*43758.5)*0.16;
 let p=o.world/uniforms.blockSize;var texture=grain;var roughness=0.95;
 if(o.material==1u){
  let leaves=floor(p.xz*6.0+p.y*2.0);let seed=fract(sin(dot(leaves,vec2f(127.1,311.7)))*43758.5);
  let veins=pow(max(sin(p.x*24.0+p.z*19.0+sin(p.y*13.0)),0.0),10.0);
  texture=0.78+seed*0.37+veins*0.11;roughness=0.70;
 }else if(o.material==2u){
  let cracks=pow(max(sin(p.x*45.0+p.z*36.0+sin(p.y*2.4)*1.5),0.0),8.0);
  texture=0.78+grain*0.18-cracks*0.25;
 }else if(o.material==3u){texture*=0.95+sin(p.x*32.0+p.z*27.0)*0.065;}
 else if(o.material==4u){roughness=0.12;}
 else if(o.material==5u){texture=0.90+sin(p.x*65.0+p.y*43.0)*0.05;}
 let view=treeViewDirection();let normal=select(-n,n,dot(n,view)>=0.0);
 let specular=pow(max(dot(normal,normalize(view+normalize(vec3f(-0.4,0.85,-0.3)))),0.0),mix(48.0,5.0,roughness))*mix(0.22,0.005,roughness);
 let color=o.color*mix(light*texture,1.08,o.emission)+mix(o.color,vec3f(1.0),0.55)*specular;
 return vec4f(clamp(color,vec3f(0),vec3f(1)),1);
}
`;
