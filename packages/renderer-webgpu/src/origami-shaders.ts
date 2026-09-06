import { SEED_UNIFORMS_WGSL } from "./shared-shaders.js";
import { STAGED_PROJECTION_WGSL } from "./staged-world-shaders.js";

export const ORIGAMI_SHADER = /* wgsl */ `
${SEED_UNIFORMS_WGSL}
${STAGED_PROJECTION_WGSL}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> blockTypes: array<u32>;
@group(0) @binding(2) var<storage, read> blockPositions: array<vec4f>;
@group(0) @binding(3) var<storage, read> blockHeights: array<f32>;
@group(0) @binding(4) var<storage, read> folds: array<vec4f>;
struct Output {
 @builtin(position) position: vec4f,
 @location(0) normal: vec3f,
 @location(1) uv: vec2f,
 @location(2) @interpolate(flat) dark: u32,
 @location(3) @interpolate(flat) facet: u32,
 @location(4) @interpolate(flat) part: u32,
 @location(5) seed: f32,
}
fn paperPoint(index: u32, angle: f32, shape: f32) -> vec3f {
 let corners = array<vec2f,5>(vec2f(0,0),vec2f(-0.5,-0.5),vec2f(0.5,-0.5),vec2f(0.5,0.5),vec2f(-0.5,0.5));
 let q=corners[index];
 let peak=sin(angle)*0.75;
 // Hinged facets shorten in the plane as they lift; unfolding restores the whole square.
 let y=select(select(0.0,peak*shape,index==2u || index==4u),peak,index==0u);
 return vec3f(q.x*cos(angle),y,q.y);
}
@vertex
fn vertexMain(@builtin(vertex_index) vertex: u32,@builtin(instance_index) instance: u32) -> Output {
 var o: Output; o.position=vec4f(2,2,2,1);
 let owner=instance/4u; let part=instance%4u;
 if(vertex>=12u) { return o; }
 let d=folds[owner];let kind=u32(d.x);let seed=fract(d.w/1000.0);
 let dark=blockTypes[owner]!=0u;
 let t=uniforms.progress;
 let delay=select(0.45+seed*0.5,0.15+seed*0.12,kind==5u);
 let creasing=smoothstep(delay,delay+1.1,uniforms.camera.z);
 let unfold=1.0-smoothstep(0.22+seed*0.12,0.94,t);
 let foldAngle=min(1.12,0.36+d.y*0.065)*creasing*unfold*f32(dark);
 let f=vertex/3u;let corner=vertex%3u;
 let indices=array<u32,3>(0u,f+1u,(f+1u)%4u+1u);
 var angle=foldAngle;var scale=1.0;var lift=0.0;
 if(part>0u) {
   if(!dark || (kind!=5u && kind!=4u && (part>1u || seed<0.65))) { return o; }
   let flourish=(1.0-smoothstep(0.08+f32(part)*0.06,0.42+f32(part)*0.06,t))
     *smoothstep(delay+0.65+f32(part)*0.2,delay+1.3+f32(part)*0.2,uniforms.camera.z);
   if(flourish<=0.0) { return o; }
   scale=(0.78-f32(part)*0.12)*flourish;
   angle=foldAngle*(1.0+f32(part)*0.12);
   lift=sin(foldAngle)*0.15*f32(part);
 }
 let shape=select(0.0,0.58,kind==3u || kind==5u);
 let a=paperPoint(indices[0],angle,shape)*scale;
 let b=paperPoint(indices[1],angle,shape)*scale;
 let c=paperPoint(indices[2],angle,shape)*scale;
 var p=paperPoint(indices[corner],angle,shape)*scale;
 var normal=normalize(cross(b-a,c-a));
 // Rosette layers rotate around their crease anchor and return to QR orientation.
 let rotation=(d.z+f32(part)*0.785398)*unfold*creasing;
 p=vec3f(p.x*cos(rotation)-p.z*sin(rotation),p.y+lift,p.x*sin(rotation)+p.z*cos(rotation));
 normal=vec3f(normal.x*cos(rotation)-normal.z*sin(rotation),normal.y,normal.x*sin(rotation)+normal.z*cos(rotation));
 let coord=blockPositions[owner].xy+vec2f(0.5)-vec2f(uniforms.gridSize*0.5);
 p.y *= 1.0+d.y*0.25;
 p.x *= mix(1.24,1.0,smoothstep(0.40,0.92,t));
 p.z *= mix(1.24,1.0,smoothstep(0.40,0.92,t));
 p+=vec3f(coord.x,select(-0.025,0.0,dark),coord.y);
 let cell=blockPositions[owner].xy;
 let far=uniforms.gridSize-7.0;
 var hub=vec2f(-100.0);
 if(cell.x<7.0 && cell.y<7.0) { hub=vec2f(3.5); }
 if(cell.x>=far && cell.y<7.0) { hub=vec2f(uniforms.gridSize-3.5,3.5); }
 if(cell.x<7.0 && cell.y>=far) { hub=vec2f(3.5,uniforms.gridSize-3.5); }
 if(hub.x>0.0) {
   // A whole finder sheet rises into a pinwheel sculpture; its owners unfold together.
   let delta=cell+vec2f(0.5)-hub;
   let hubFold=(1.0-smoothstep(0.38,0.94,t))*smoothstep(0.18,1.1,uniforms.camera.z);
   p.y+=(3.5-max(abs(delta.x),abs(delta.y)))*0.70*hubFold;
 }

 o.position=worldProject(p*uniforms.blockSize,1.48,0.012);
 o.normal=normal;o.uv=paperPoint(indices[corner],0.0,0.0).xz+vec2f(0.5);
 o.dark=u32(dark);o.facet=f;o.part=part;o.seed=seed;
 return o;
}
@fragment
fn fragmentMain(o:Output)->@location(0) vec4f {
 let paper=uniforms.themeFifth.rgb;
 let scan=smoothstep(0.64,0.98,uniforms.progress);
 var front=mix(uniforms.themeThird.rgb,paper,0.30+o.seed*0.25);
 if(o.facet%2u==0u) {front=mix(uniforms.themeSecondary.rgb,paper,0.18);}
 if(o.part>0u) {front=mix(uniforms.themeFourth.rgb,paper,0.14);}
 let shade=0.58+abs(dot(normalize(o.normal),normalize(vec3f(-0.4,0.8,0.3))))*0.42;
 var color=select(paper,front*shade,o.dark>0u);
 let ink=uniforms.themePrimary.rgb*0.58*(0.98+o.seed*0.02);
 return vec4f(mix(color,select(paper,ink,o.dark>0u),scan),1.0);
}
`;
