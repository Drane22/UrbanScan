import { SEED_UNIFORMS_WGSL } from "../shared-shaders.js";
import { DIORAMA_MATERIALS_WGSL } from "../diorama-materials.js";
import { OCEAN_QR_FIRST_INSTANCE } from "./waves-model.js";
import { PALETTE_QR_INK_WGSL } from "./qr-ink.js";

/** All ocean-specific geometry and materials stay in the candidate subtree. */
export const WAVES_SHADER = /* wgsl */ `
${SEED_UNIFORMS_WGSL}
@group(0) @binding(0) var<uniform> uniforms:Uniforms;
@group(0) @binding(1) var<storage,read> blockTypes:array<u32>;
@group(0) @binding(2) var<storage,read> blockPositions:array<vec4f>;
@group(0) @binding(3) var<storage,read> blockHeights:array<f32>;
@group(0) @binding(4) var<storage,read> worldData:array<vec4f>;
${DIORAMA_MATERIALS_WGSL}
${PALETTE_QR_INK_WGSL}
const PI:f32=3.14159265359;
struct OceanOutput {
 @builtin(position) position:vec4f,
 @location(0) world:vec3f,
 @location(1) normal:vec3f,
 @location(2) uv:vec2f,
 @location(3) @interpolate(flat) kind:u32,
 @location(4) @interpolate(flat) owner:u32,
}
fn quad(v:u32)->vec2f {
 let q=array<vec2f,6>(vec2f(0,0),vec2f(0,1),vec2f(1,0),vec2f(1,0),vec2f(0,1),vec2f(1,1));return q[v%6u];
}
// A lower shore-side camera exposes the barrel instead of looking down onto its roof.
// It converges to the shared top-down camera at the QR endpoint.
fn oceanProject(p:vec3f)->vec4f {
 let t=uniforms.progress;
 let yaw=mix(0.78,0.0,t)+uniforms.cameraBobX;
 let tilt=mix(-0.30,-1.5708,t)+uniforms.cameraBobY;
 let x=p.x*cos(yaw)-p.z*sin(yaw);let z=p.x*sin(yaw)+p.z*cos(yaw);
 let y=p.y*cos(tilt)-z*sin(tilt);let depth=p.y*sin(tilt)+z*cos(tilt);
 let denominator=(uniforms.gridSize+10.0)*uniforms.blockSize;
 let portrait=mix(select(1.0,1.2,uniforms.aspectRatio<0.8),1.0,t);
 let zoom=mix(uniforms.camera.x,min(uniforms.camera.x,1.0),t);
 let scale=1.90/denominator*portrait*(1.0+sin(t*PI)*0.035)*zoom;
 return vec4f(x*scale/max(uniforms.aspectRatio,1.0),
  (y-uniforms.gridSize*uniforms.blockSize*0.045*(1.0-t))*scale/max(1.0/uniforms.aspectRatio,1.0),depth*0.01+0.5,1.0);
}
fn deform(p:vec3f,n:vec3f,index:u32,base:f32)->mat2x3f {
 let center=worldData[4u+index*3u];let parameters=worldData[5u+index*3u];
 let cycle=fract(uniforms.time*0.23+parameters.w*0.15915494+f32(index)*0.34);
 let gather=smoothstep(0.0,0.30,cycle);
 let collapse=1.0-smoothstep(0.58,0.94,cycle);
 let stretch=0.055+gather*collapse*1.10;
 let shear=(smoothstep(0.25,0.76,cycle)*0.12-0.025)/parameters.x;
 let direction=vec2f(-sin(center.w),cos(center.w));
 let rise=max(0.0,p.y-base);
 let travel=(cycle-0.30)*0.23;
 let q=vec3f(p.x+direction.x*(rise*shear+travel),base+rise*stretch,p.z+direction.y*(rise*shear+travel));
 let normal=normalize(vec3f(n.x,(n.y-dot(n.xz,direction)*shear)/stretch,n.z));
 return mat2x3f(q,normal);
}
fn quietRipple(p:vec3f,n:vec3f)->mat2x3f {
 let a=p.x*18.0+uniforms.time*1.8;let b=p.z*14.0-uniforms.time*2.1;
 let ex=1.0-pow(abs(p.x*2.0),8.0);let ez=1.0-pow(abs(p.z*2.0),8.0);
 let edge=max(0.0,ex*ez);
 let dx=0.018*cos(a)*cos(b)*edge-0.024*sin(a)*cos(b)*pow(abs(p.x*2.0),7.0)*sign(p.x)*ez;
 let dz=-0.0135*sin(a)*sin(b)*edge-0.024*sin(a)*cos(b)*pow(abs(p.z*2.0),7.0)*sign(p.z)*ex;
 let wet=smoothstep(-0.31,-0.20,p.z);
 return mat2x3f(p+vec3f(0,sin(a)*cos(b)*0.004*edge*wet,0),normalize(vec3f(n.x-n.y*dx,n.y,n.z-n.y*dz)));
}
@vertex
fn vertexMain(@builtin(vertex_index) v:u32,@builtin(instance_index) instance:u32)->OceanOutput {
 var o:OceanOutput;o.position=vec4f(2,2,2,1);o.normal=vec3f(0,1,0);o.kind=0u;o.owner=0u;
 let q=quad(v);let grid=uniforms.gridSize;let size=uniforms.blockSize;
 if(instance>=${OCEAN_QR_FIRST_INSTANCE}u){
  let owner=instance-${OCEAN_QR_FIRST_INSTANCE}u;let n=u32(grid);if(owner>=n*n){return o;}
  let cell=vec2f(f32(owner%n),f32(owner/n));
  let low=select(vec2f(0),vec2f(-4),cell==vec2f(0));
  let high=select(vec2f(1),vec2f(5),cell==vec2f(grid-1.0));
  let local=mix(low,high,q);
  o.world=vec3f(cell.x+local.x-grid*0.5,0,grid*0.5-cell.y-local.y)*size;
  o.position=worldProject(o.world,1.68,grid*size*0.045);o.uv=local;o.kind=4u;o.owner=owner;return o;
 }
 if(uniforms.progress>=0.92){return o;}
 var p:vec3f;var normal=vec3f(0,1,0);var uv=q;
 if(instance>=50u){
  let descriptor=worldData[select(2u+instance-50u,13u,instance>=52u)];
  let record=u32(descriptor.x)+v*2u;
  let point=worldData[record];normal=worldData[record+1u].xyz;
  p=point.xyz;o.kind=u32(point.w);
  if(instance>=52u){
   let track=u32(worldData[14].x)+(instance-52u)*2u;
   let lane=worldData[track];let gait=worldData[track+1u];
   let cycle=uniforms.time*gait.y+lane.w;
   let stride=sin(cycle*8.0+worldData[record+1u].w*PI);
   let tag=worldData[record+1u].w;
   let walking=0.35+0.65*abs(cos(cycle));
   if(tag>=1.0 && tag<=8.0){
    let weight=smoothstep(0.014,0.039,abs(p.x));
    p.z+=stride*0.006*weight*walking;p.y+=max(0.0,stride)*0.004*weight*walking;
   }else if(tag==9.0){p.y+=sin(cycle*2.0)*0.003;}
   p*=gait.x;
   p+=vec3f(lane.x+sin(cycle)*lane.z,0.003,lane.y+sin(cycle*2.0)*0.006);
  }else if(instance==50u){
   let roll=sin(uniforms.time*1.1)*0.065;
   p=vec3f(p.x,p.y*cos(roll)-p.z*sin(roll),p.y*sin(roll)+p.z*cos(roll));
   normal=vec3f(normal.x,normal.y*cos(roll)-normal.z*sin(roll),normal.y*sin(roll)+normal.z*cos(roll));
   p+=vec3f(-0.23+sin(uniforms.time*0.23)*0.035,0.015+sin(uniforms.time*1.1)*0.006,0.32);
  }else{
   let anchor=worldData[12];let ride=deform(anchor.xyz,vec3f(0,1,0),0u,anchor.w);
   let lean=0.10+sin(uniforms.time*1.15)*0.06;
   p=vec3f(p.x*cos(lean)-p.y*sin(lean),p.x*sin(lean)+p.y*cos(lean),p.z);
   normal=vec3f(normal.x*cos(lean)-normal.y*sin(lean),normal.x*sin(lean)+normal.y*cos(lean),normal.z);
   p+=ride[0]+vec3f(0,0.007,0);
  }
 }else if(instance==0u){
  let edge=v/6u;
  if(edge==0u){p=vec3f(q.x-0.5,-q.y*0.026,0.5);normal=vec3f(0,0,1);}
  else if(edge==1u){p=vec3f(q.x-0.5,-q.y*0.026,-0.5);normal=vec3f(0,0,-1);}
  else if(edge==2u){p=vec3f(0.5,-q.y*0.026,q.x-0.5);normal=vec3f(1,0,0);}
  else if(edge==3u){p=vec3f(-0.5,-q.y*0.026,q.x-0.5);normal=vec3f(-1,0,0);}
  else {p=vec3f(q.x-0.5,-0.026,q.y-0.5);normal=vec3f(0,-1,0);}
 } else if(instance<8u){
  var meshInfo=worldData[0];
  if(instance>=2u){meshInfo=worldData[6u+(instance-2u)*3u];o.kind=2u;o.owner=instance-2u;}
  else {o.kind=1u;}
  let along=u32(meshInfo.y);let across=u32(meshInfo.z);
  let cell=v/6u;let column=cell%along+u32(q.x);let row=cell/along+u32(q.y);
  let record=u32(meshInfo.x)+(row*(along+1u)+column)*2u;
  p=worldData[record].xyz;normal=worldData[record+1u].xyz;uv=vec2f(f32(column)/f32(along),f32(row)/f32(across));
  if(instance>=2u){let moved=deform(p,normal,o.owner,worldData[record].w);p=moved[0];normal=moved[1];}
  let rippled=quietRipple(p,normal);p=rippled[0];normal=rippled[1];
 } else {
  let record=u32(worldData[1].x)+(instance-8u)*2u;
  let origin=worldData[record];let info=worldData[record+1u];
  let corners=array<vec3f,6>(vec3f(1,0,0),vec3f(0,1,0),vec3f(0,0,1),vec3f(-1,0,0),vec3f(0,-1,0),vec3f(0,0,-1));
  let triangles=array<u32,24>(0u,1u,2u,2u,1u,3u,3u,1u,5u,5u,1u,0u,0u,2u,4u,2u,3u,4u,3u,5u,4u,5u,0u,4u);
  normal=corners[triangles[v%24u]];
  if(info.z>90.0){
   p=origin.xyz+normal*vec3f(info.x,info.y,info.x*0.8);o.kind=5u;
  }else{
   let moved=deform(origin.xyz,vec3f(0,1,0),u32(info.z),origin.w);
   let rippled=quietRipple(moved[0],moved[1]);
   let cycle=fract(uniforms.time*1.15+info.w*117.1+f32(instance)*0.713);
   let crestCycle=fract(uniforms.time*0.23+worldData[5u+u32(info.z)*3u].w*0.15915494+info.z*0.34);
   let burst=smoothstep(0.30,0.48,crestCycle)*(1.0-smoothstep(0.80,0.96,crestCycle));
   let radius=info.w*sin(cycle*PI)*burst;
   p=rippled[0]+vec3f(info.x*cycle*0.085,sin(cycle*PI)*0.045,info.y*cycle*0.085)+normal*radius;
   o.kind=3u;
  }
 }
 let build=smoothstep(0.02,0.85,uniforms.camera.z);
 let visibility=1.0-smoothstep(0.08,0.88,uniforms.progress);
 p.y*=build*visibility;
 o.world=p*grid*size;o.normal=normal;o.uv=uv;
 o.position=oceanProject(o.world);return o;
}
@fragment
fn fragmentMain(o:OceanOutput)->@location(0) vec4f {
 let phase=worldData[5u+min(o.owner,2u)*3u].w;
 let foamCoord=vec2f(o.uv.x*65.0-uniforms.time*2.2+phase,o.uv.y*36.0+uniforms.time*1.5);
 let foamPattern=noise(foamCoord)*0.65+noise(foamCoord*2.1)*0.35;
 let foamAA=max(fwidth(foamPattern),0.025);
 let coordinate=o.world/(uniforms.gridSize*uniforms.blockSize);
 let shore=coordinate.z+0.285+sin(coordinate.x*5.0+worldData[5].w)*0.028;
 let ripples=sin(coordinate.x*70.0+coordinate.z*30.0-uniforms.time*2.4)*sin(coordinate.x*23.0-coordinate.z*73.0+uniforms.time*1.1);
 let rippleAA=max(fwidth(ripples),0.04);
 if(o.kind==4u){
  let outside=any(o.uv<vec2f(0))||any(o.uv>vec2f(1));
  if(outside || blockTypes[o.owner]==0u){return vec4f(1,1,1,1);}
  return vec4f(paletteQrInk(blockPositions[o.owner].xy),1);
 }
 let view=treeViewDirection()*vec3f(-1,1,-1);
 let normal=normalize(o.normal);let n=select(-normal,normal,dot(normal,view)>=0.0);
 let light=normalize(vec3f(-0.4,0.85,-0.6));
 let shade=0.42+0.58*max(0.0,dot(n,light));
 let height=o.world.y/(uniforms.gridSize*uniforms.blockSize);
 let depth=smoothstep(-0.035,0.025,height);
 let shallows=1.0-smoothstep(0.04,0.60,shore);
 let water=mix(uniforms.themePrimary.rgb,uniforms.themeThird.rgb,0.52+depth*0.24+shallows*0.15);
 var color=water*shade;
 let fresnel=pow(1.0-max(0.0,dot(n,view)),4.0);
 let reflection=pow(max(0.0,dot(n,normalize(light+view))),72.0);
 color+=uniforms.themeFifth.rgb*(reflection*0.18+fresnel*0.065);
 if(o.kind==0u){
  let sand=vec3f(0.78,0.64,0.42)*shade;
  color=mix(sand,mix(uniforms.themePrimary.rgb,uniforms.themeThird.rgb,0.35)*0.85,smoothstep(-0.01,0.035,shore));
 } else if(o.kind==1u){
  color+=uniforms.themeFifth.rgb*smoothstep(0.70-rippleAA,0.70+rippleAA,ripples)*0.025*depth;
  // The same continuous field becomes wet sand and beach; no disconnected shore mesh.
  let wash=sin(uniforms.time*1.445+worldData[5].w)*0.043;
  let boundary=shore+wash+sin(coordinate.x*23.0+uniforms.time*1.2)*0.009;
  let sand=mix(vec3f(0.80,0.68,0.48),vec3f(0.93,0.84,0.65),1.0-smoothstep(-0.10,0.005,shore));
  color=mix(sand,color,smoothstep(-0.008,0.020,boundary));
  let grain=noise(coordinate.xz*320.0)*0.03;
  color-=grain*(1.0-smoothstep(-0.02,0.02,boundary));
  let foamLine=exp(-pow((boundary-0.027)/0.014,2.0));
  let washLace=smoothstep(0.38-foamAA,0.38+foamAA,foamPattern);
  color=mix(color,uniforms.themeFifth.rgb,foamLine*(0.48+0.35*washLace));
  let trailing=exp(-pow((boundary-0.075)/0.030,2.0))*smoothstep(0.55-foamAA,0.55+foamAA,foamPattern);
  color=mix(color,uniforms.themeFifth.rgb,trailing*0.24);
 } else if(o.kind==2u){
  let lip=0.73+sin(o.uv.x*15.0+phase)*0.012;
  let cap=smoothstep(lip-0.055,lip,o.uv.y)*(1.0-smoothstep(lip+0.10,lip+0.15,o.uv.y));
  let edge=smoothstep(0.94,0.99,o.uv.y);
  let skin=max(cap*0.72,edge*0.82);
  let density=0.72+0.28*smoothstep(0.45-foamAA,0.45+foamAA,foamPattern);
  let taper=smoothstep(0.02,0.16,o.uv.x)*(1.0-smoothstep(0.84,0.98,o.uv.x));
  let foam=skin*density*taper;
  let seafoam=uniforms.themeFifth.rgb*(0.78+0.22*max(0.0,dot(n,light)));
  color=mix(color,seafoam,foam*0.96);
 } else if(o.kind==3u){color=uniforms.themeFifth.rgb*shade;}
 else if(o.kind==5u){color=mix(vec3f(0.40,0.38,0.32),vec3f(0.67,0.61,0.49),o.normal.y*0.4+0.4)*shade;}
 var opacity=1.0;
 if(o.kind==2u){
  let cycle=fract(uniforms.time*0.23+phase*0.15915494+f32(o.owner)*0.34);
  opacity=smoothstep(0.01,0.15,cycle)*(1.0-smoothstep(0.75,0.96,cycle));
 }
 return vec4f(color,opacity*(1.0-smoothstep(0.60,0.88,uniforms.progress)));
}
fn hash(p:vec2f)->f32 {return fract(sin(dot(p,vec2f(127.1,311.7)))*43758.5453);}
fn noise(p:vec2f)->f32 {
 let i=floor(p);let f=fract(p);let u=f*f*(3.0-2.0*f);
 return mix(mix(hash(i),hash(i+vec2f(1,0)),u.x),mix(hash(i+vec2f(0,1)),hash(i+vec2f(1,1)),u.x),u.y);
}
`;
