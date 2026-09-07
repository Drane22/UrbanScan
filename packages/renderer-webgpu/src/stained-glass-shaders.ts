import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const STAINED_GLASS_SHADER = createSculpturalWorldShader(/* wgsl */ `
fn worldCount()->u32 {return 96u;}
fn glassPoint(i:u32,u:f32,w:f32)->vec3f {
  let band=i/12u;let sector=i%12u;
  let r=(f32(band)+w+0.35)/8.35*uniforms.gridSize*0.43;
  let angle=(f32(sector)+u)*PI/6.0+f32(band)*0.075;
  let h=0.30+1.7*(1.0-pow(r/(uniforms.gridSize*0.46),2.0));
  return vec3f(cos(angle)*r,h,sin(angle)*r);
}
fn worldAnchor(i:u32)->vec3f {return glassPoint(i,0.5,0.5);}
fn worldFoundation(v:u32)->Surface {
  let d=disk(v);
  return surface(vec3f(d.x*uniforms.gridSize*0.45,-0.25,d.y*uniforms.gridSize*0.45),mix(palette(0),vec3f(0.065,0.075,0.10),0.70),0.0);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let q=squarePoint(v)+vec2f(0.5);
  let d=disk(v);let r=length(d);
  let jewel=palette(f32((i/12u+i%12u)%4u));
  var p=glassPoint(i,q.x,q.y);
  if(part==0u) {
    p.y+=0.14*(1.0-r);
    let light=0.90+0.10*sin(uniforms.time*0.45+p.x*0.25+p.z*0.17);
    return surface(p,jewel*light,0.65);
  }
  if(part==1u || part==2u) {
    let uv=quad(v);let angle=(f32((v/6u)%8u)+uv.x)*PI*0.25;
    let along=(f32(v/48u)+uv.y)*0.25;
    let edge=select(glassPoint(i,along,0.0),glassPoint(i,0.0,along),part==2u);
    p=edge+vec3f(cos(angle)*0.045,sin(angle)*0.045+0.04,0.0);
    return surface(p,mix(palette(0)*0.25,vec3f(0.12),0.55),0.0);
  }
  let anchor=glassPoint(i,0.0,0.0);
  return surface(anchor+sphere(v,vec3f(0.075)),mix(palette(3),vec3f(0.9,0.65,0.22),0.4),0.4);
}
`);
