import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const MYCELIUM_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn worldCount()->u32 {return 100u;}
fn worldAmbientCount()->u32 {return 384u;}
fn worldAnchor(i:u32)->vec3f {
  let g=gene(i);let p=squarePatch(i,10u);
  return p+vec3f(g.x*1.5,0.065,g.y*1.5)*uniforms.gridSize/25.0;
}
fn worldFoundation(v:u32)->Surface {
  return tile(v,mix(palette(0),palette(3),0.48),mix(palette(0),palette(2),0.22),1.05,4.0);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let g=gene(i);
  let hero=i==23u || i==44u || i==65u || i==76u;
  let size=select(0.38+pow(g.w,1.8)*1.25,2.45+g.w*0.7,hero)*uniforms.gridSize/25.0;
  let height=(1.1+g.w*1.4)*size;
  let sway=(sin(uniforms.time*0.58+g.w*19.0)*0.075+sin(uniforms.time*1.1+g.w*7.0)*0.022)*alive();
  if(part==0u){
    let d=disk(v);let r=length(d);
    let tall=select(0.40,1.4,i%4u==0u);
    let dome=mix(sqrt(max(0.0,1.0-r*r)),pow(1.0-r,0.6),select(0.0,1.0,i%4u==0u));
    let p=vec3f(d.x*size+sway*height,height+dome*size*tall,d.y*size);
    let spots=step(0.86,sin(d.x*15.0+g.w*7.0)*cos(d.y*17.0-g.w*3.0));
    let cluster=0.5+0.5*sin(c.x*0.39+cos(c.z*0.32));
    let cap=mix(palette(2),palette(select(3.0,1.0,hero)),cluster);
    return surface(c+p,mix(cap,uniforms.themeFifth.rgb,spots*0.6),0.08);
  }
  if(part==1u){
    var p=cylinder(v,size*0.14,height);
    p.x+=sway*p.y*p.y/height;
    let stem=mix(uniforms.themeFifth.rgb,palette(2),0.10);
    return surface(c+p,stem,0.0);
  }
  if(part==2u){
    let d=disk(v);let r=length(d);let ridges=0.87+sin(atan2(d.y,d.x)*32.0)*0.10;
    let p=vec3f(d.x*size+sway*height,height-0.045+0.11*(1.0-r),d.y*size);
    return surface(c+p,mix(uniforms.themeFifth.rgb,palette(1),0.13)*ridges,0.0);
  }
  let prior=select(i-1u,0u,i==0u);
  let next=worldAnchor(select(prior,i-10u,i%10u==0u && i>=10u));
  return surface(bridge(v,c,next,0.038),mix(palette(3),uniforms.themeFifth.rgb,0.26),0.35);
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
  let g=gene(i+90u);let c=squarePatch(i,18u);
  if(part==4u){return surface(c,palette(0),0.0);}
  if(i<315u){
    if(part<3u){
      let leaf=rotate(tuft(v,(0.35+g.z*0.6)*uniforms.gridSize/25.0,0.11+g.w*0.08,g.w+f32(part)),f32(part)*2.1+g.w*6.28);
      return surface(c+leaf,mix(palette(3),palette(1),g.w*0.15),0.0);
    }
    return surface(c+sphere(v,vec3f(0.17,0.09,0.17)*g.z),mix(palette(0),palette(3),0.52),0.0);
  }
  if(i<365u){
    if(part>0u){return surface(c,palette(3),0.0);}
    let cycle=fract(uniforms.time*(0.07+g.w*0.05)+g.w);
    let drift=vec3f(sin(uniforms.time*0.5+g.w*19.0)*0.65,1.0+cycle*4.1,cos(uniforms.time*0.3+g.w*7.0)*0.55);
    return surface(c+drift+sphere(v,vec3f(0.055*g.z*sin(cycle*PI))),palette(1),0.85);
  }
  let a=uniforms.time*(0.19+g.w*0.14)+g.w*6.28;
  let path=vec3f(cos(a),0,sin(a))*uniforms.gridSize*(0.15+g.w*0.15)+vec3f(0,1.6+g.z+sin(a*1.7)*0.4,0);
  if(part==0u){return surface(path+rotate(butterfly(v,g.w,0.25),a),palette(1),0.55);}
  if(part==1u){return surface(path+rotate(sphere(v,vec3f(0.04,0.04,0.08)),a),palette(0),0.0);}
  return surface(path,palette(0),0.0);
}
`,
  4,
);
