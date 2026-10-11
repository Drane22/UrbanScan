import { facetedShader } from "./faceted-shader.js";
import { CRYSTALLINE_MATERIALS_WGSL } from "./crystalline-materials.js";

export const CRYSTALLINE_SHADER = facetedShader(
  `fn turnY(p:vec3f,a:f32)->vec3f {return vec3f(p.x*cos(a)+p.z*sin(a),p.y,-p.x*sin(a)+p.z*cos(a));}
  fn movePart(p:vec3f,n:vec3f,instance:u32)->mat2x3f {
   let d=worldData[instance*3u];let pivot=worldData[instance*3u+1u];
   if(d.z==1.0){
    let angle=uniforms.time*0.60*pivot.w+d.w;
    let lift=sin(uniforms.time*1.8+d.w)*0.022;
    return mat2x3f(pivot.xyz+turnY(p-pivot.xyz,angle)+vec3f(0,lift,0),turnY(n,angle));
   }
   return mat2x3f(p,n);
  }`,
  CRYSTALLINE_MATERIALS_WGSL,
);
