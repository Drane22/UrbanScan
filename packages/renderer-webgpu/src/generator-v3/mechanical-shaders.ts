import { facetedShader } from "./faceted-shader.js";
import { MECHANICAL_MOTION_WGSL } from "./mechanical-motion.js";
import { MECHANICAL_LIGHTING_WGSL } from "./mechanical-lighting.js";

export const MECHANICAL_SHADER = facetedShader(
  MECHANICAL_MOTION_WGSL,
  /* wgsl */ `
${MECHANICAL_LIGHTING_WGSL}
fn faceMaterial(o:FacetOutput)->vec3f {
 let view=treeViewDirection()*vec3f(-1,1,-1);
 let normal=normalize(o.normal+vec3f(0,0.000001,0));let n=select(-normal,normal,dot(normal,view)>=0.0);
 let light=normalize(vec3f(-0.6,0.8,-0.9));
 let visibility=machineVisibility(o.world,n);
 let diffuse=0.26+0.74*max(0.0,dot(n,light))*visibility;
 let halfVector=normalize(view+light);
 let spec=pow(max(0.0,dot(n,halfVector)),48.0)*visibility;
 let fresnel=pow(1.0-max(0.0,dot(n,view)),4.0);
 var color=uniforms.themePrimary.rgb*diffuse;
 if(o.material==1u){
  color=mix(uniforms.themeSecondary.rgb,uniforms.themeFifth.rgb,0.2)*diffuse;
  color+=uniforms.themeFifth.rgb*(spec*0.62+fresnel*0.11);
  let height=o.world.y/(uniforms.gridSize*uniforms.blockSize);
  // Low-contrast machining bands; no independent sparkle or time-based pulsing.
  color*=0.985+0.015*sin(height*360.0);
 }else if(o.material==2u){
  color=uniforms.themeThird.rgb*diffuse+uniforms.themeFifth.rgb*spec*0.12;
 }else if(o.material==3u){
  color=uniforms.themeFourth.rgb*diffuse+uniforms.themeFifth.rgb*spec*0.22;
 }else if(o.material==4u){
  let p=o.world/(uniforms.gridSize*uniforms.blockSize);
  let tread=0.90+0.10*sin((p.x+p.y)*280.0-uniforms.time*18.0);
  color=mix(uniforms.themePrimary.rgb,vec3f(0.025),0.70)*diffuse*tread;
 }else if(o.material==5u){color=mix(uniforms.themeThird.rgb,uniforms.themeFifth.rgb,0.62);}
 // Darkened contact near the engine bed complements the moving cast shadows.
 let height=o.world.y/(uniforms.gridSize*uniforms.blockSize);
 color*=0.78+0.22*smoothstep(0.0,0.07,height);
 if(uniforms.appearance.x>0.5){
  // Blackened steel with copper edge light and luminous instrument glass.
  color=mix(vec3f(0.025,0.031,0.042),color,0.65);
  if(o.material==1u){color+=vec3f(0.48,0.65,0.85)*(0.12+spec*0.60+fresnel*0.34);}
  if(o.material==3u){color+=vec3f(0.95,0.43,0.13)*(0.16+fresnel*0.35);}
  if(o.material==5u){color=vec3f(0.35,0.90,1.0);}
  if(o.material==0u){color=vec3f(0.025,0.028,0.035)*diffuse;}
 }
 return color;
}
`,
  1.95,
);
