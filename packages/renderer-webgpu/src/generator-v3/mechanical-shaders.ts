import { facetedShader } from "./faceted-shader.js";
import { MECHANICAL_MOTION_WGSL } from "./mechanical-motion.js";

export const MECHANICAL_SHADER = facetedShader(
  MECHANICAL_MOTION_WGSL,
  /* wgsl */ `
fn faceMaterial(o:FacetOutput)->vec3f {
 let view=treeViewDirection()*vec3f(-1,1,-1);
 let normal=normalize(o.normal+vec3f(0,0.000001,0));let n=select(-normal,normal,dot(normal,view)>=0.0);
 let light=normalize(vec3f(-0.6,0.8,-0.9));let diffuse=0.56+0.44*max(0.0,dot(n,light));
 let halfVector=normalize(view+light);
 let spec=pow(max(0.0,dot(n,halfVector)),36.0);
 let fresnel=pow(1.0-max(0.0,dot(n,view)),4.0);
 var color=uniforms.themePrimary.rgb*diffuse;
 if(o.material==1u){
  color=mix(uniforms.themeSecondary.rgb,uniforms.themeFifth.rgb,0.2)*diffuse;
  color+=uniforms.themeFifth.rgb*(spec*0.35+fresnel*0.08);
  let height=o.world.y/(uniforms.gridSize*uniforms.blockSize);
  // Low-contrast machining bands; no independent sparkle or time-based pulsing.
  color*=0.985+0.015*sin(height*360.0);
 }else if(o.material==2u){
  color=uniforms.themeThird.rgb*diffuse+uniforms.themeFifth.rgb*spec*0.12;
 }else if(o.material==3u){
  color=uniforms.themeFourth.rgb*diffuse+uniforms.themeFifth.rgb*spec*0.22;
 }else if(o.material==4u){color=mix(uniforms.themePrimary.rgb,vec3f(0.025),0.70)*diffuse;}
 return color;
}
`,
);
