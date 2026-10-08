import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const CRYSTALLINE_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn worldAnchor(i:u32)->vec3f {let g=gene(i);return vec3f(g.x*uniforms.gridSize,0.04,g.y*uniforms.gridSize);}
fn worldFoundation(v:u32)->Surface {return tile(v,mix(palette(0),palette(3),0.30),palette(0),2.2*uniforms.gridSize/25.0,8.0);}
// Eight planar facets; each facet is subdivided to fit the shared 384-vertex batch.
fn mineral(v:u32,radius:f32,height:f32,lean:vec2f)->vec3f {
 let uv=quad(v);let segment=(v/6u)%16u;let face=segment/2u;
 let across=(f32(segment%2u)+uv.x)*0.5;
 let a=f32(face)*PI*0.25;let b=a+PI*0.25;
 let polygon=mix(vec2f(cos(a),sin(a)),vec2f(cos(b),sin(b)),across);
 let band=v/96u;let rs=array<f32,5>(0.0,1.0,0.85,0.0,0.0);let ys=array<f32,5>(0.0,0.08,0.74,1.0,1.0);
 let y=mix(ys[band],ys[band+1u],uv.y);let r=mix(rs[band],rs[band+1u],uv.y)*radius;
 let p=polygon*r+lean*y*y*height;
 return vec3f(p.x,y*height,p.y);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
 let g=gene(i);let c=worldAnchor(i);let s=uniforms.gridSize/25.0;let a=g.w*6.28+f32(part)*2.1;
 let small=part>0u;let size=g.z*select(1.0,0.45,small);
 let offset=select(vec3f(0),rotate(vec3f(0.54,0,0)*g.z*s,a),small);
 let lean=vec2f(cos(a),sin(a))*select(0.15,0.28,small);
 let h=(2.3+gene(i+140u).w*2.1)*size*s;
 let p=c+offset+rotate(mineral(v,(0.48+g.w*0.22)*size*s,h,lean),a);
 let facet=f32(((v/6u)%16u)/2u);let pigment=mix(palette(2),palette(3),fract(facet*0.21+g.w)*0.45);
 return surface(p,mix(pigment,palette(1),select(0.0,0.25,part==3u)),select(0.03,0.16,part==3u));
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
 let g=gene(i+100u);let s=uniforms.gridSize/25.0;let time=uniforms.time*motionTempo();
 var c=vec3f(g.x*uniforms.gridSize,0.08,g.y*uniforms.gridSize);
 if(i<144u){
  if(part==4u){return surface(c,palette(0),0);}
  if(part<2u){let a=g.w*6.28+f32(part)*2.1;return surface(c+rotate(mineral(v,(0.13+g.w*0.22)*s,(0.3+g.z*0.6)*s,vec2f(g.x,g.y)*0.22),a),mix(palette(3),palette(2),g.w),0.06);}
  if(part==2u){return surface(c+mineral(v,0.36*s,0.12*s,vec2f(0)),mix(palette(0),palette(3),0.30),0);}
  return surface(c,palette(0),0);
 }
 // Suspended mineral dust and rotating four-point sparkles around the tall clusters.
 let slot=i-144u;let hero=(slot%5u)*13u;c=worldAnchor(hero);
 let a=time*(0.13+g.w*0.12)+g.w*6.28;let r=(0.8+g.z)*s;
 c+=vec3f(cos(a)*r,(2.2+g.w*5.0+sin(time*0.7+g.w*11.0)*0.28)*s,sin(a)*r);
 if(part==4u){return surface(c,palette(0),0);}
 let flash=(0.45+pow(max(sin(time*1.2+g.w*21.0),0.0),8.0)*0.55)*alive();
 if(part==0u){return surface(c+rotate(mineral(v,0.07*s*flash,0.28*s*flash,vec2f(0)),a),uniforms.themeFifth.rgb,0.9);}
 if(part==1u){let uv=quad(v);let p=vec3f((uv.x-0.5)*0.28,(uv.y-0.5)*0.025,0)*s*flash;return surface(c+rotate(p,a),palette(1),0.8);}
 return surface(c,palette(0),0);
}
`,
  8,
);
