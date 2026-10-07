import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const MYCELIUM_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn fungusWidth()->u32 {return 8u+u32(worldDNA(5u).w*5.0);}
fn worldCount()->u32 {return fungusWidth()*fungusWidth();}
fn worldAmbientCount()->u32 {return 373u+u32(worldDNA(6u).w*11.0);}
fn worldAnchor(i:u32)->vec3f {
  let g=gene(i);var p=squarePatch(i,fungusWidth());
  let style=sceneVariant(3u);let angle=atan2(p.z,p.x)+worldDNA(7u).w*6.28;
  if(style==1u){p.x+=sin(p.z*0.43+worldDNA(8u).w*6.28)*uniforms.gridSize*0.065;}
  if(style==2u){p.x+=cos(angle*3.0)*uniforms.gridSize*0.04;p.z+=sin(angle*3.0)*uniforms.gridSize*0.04;}
  return seededFrame(p+vec3f(g.x,0.065,g.y)*uniforms.gridSize/25.0);
}
fn worldFoundation(v:u32)->Surface {
  return tile(v,mix(palette(0),palette(3),0.48),mix(palette(0),palette(2),0.22),1.05,4.0);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let g=gene(i);
  let hero=gene(i+230u).w>0.955-worldDNA(8u).w*0.035 && max(abs(c.x),abs(c.z))<uniforms.gridSize*0.34;
  let size=select(0.35+pow(g.w,1.8)*(0.9+worldDNA(9u).w*0.8),1.9+g.w*1.1,hero)*uniforms.gridSize/25.0;
  let height=(0.8+g.w*1.6+worldDNA(11u).w*0.6)*size;
  let sway=(sin(uniforms.time*0.75+g.w*19.0)*0.13+sin(uniforms.time*1.1+g.w*7.0)*0.04)*alive();
  if(part==0u){
    let d=disk(v);let r=length(d);
    let pointed=gene(i+190u).w<0.15+worldDNA(12u).w*0.55;
    let tall=select(0.28+worldDNA(13u).w*0.35,1.2,pointed);
    let dome=mix(sqrt(max(0.0,1.0-r*r)),pow(1.0-r,0.6),select(0.0,1.0,pointed));
    let p=vec3f(d.x*size+sway*height,height+dome*size*tall,d.y*size);
    let spots=step(0.86,sin(d.x*15.0+g.w*7.0)*cos(d.y*17.0-g.w*3.0));
    let cluster=0.5+0.5*sin(c.x*(0.21+worldDNA(14u).w*0.4)+cos(c.z*0.32)+worldDNA(15u).w*6.28);
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
  let width=fungusWidth();let next=worldAnchor(select(prior,i-width,i%width==0u && i>=width));
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
    return surface(c+drift+sphere(v,vec3f(0.13*g.z*sin(cycle*PI))*uniforms.gridSize/25.0),palette(1),0.85);
  }
  let a=uniforms.time*(0.12+g.w*0.10)*alive()+g.w*6.28;
  let s=uniforms.gridSize/25.0;
  let path=vec3f(cos(a),0,sin(a))*uniforms.gridSize*(0.17+g.w*0.20)+vec3f(0,0.42*s,0);
  // Jewel beetles crawl through the undergrowth; spores handle the flying motion.
  if(part==0u){return surface(path+rotate(sphere(v,vec3f(0.42,0.22,0.62)*s),a),mix(palette(2),palette(1),0.30),0.22);}
  if(part==1u){return surface(path+rotate(sphere(v,vec3f(0.22,0.18,0.24)*s)+vec3f(0,0,0.63*s),a),palette(0),0.05);}
  if(part==2u){
    let leg=v/64u;let local=v%64u;let side=select(-1.0,1.0,leg%2u==0u);
    let z=(f32(leg/2u)-1.0)*0.36*s;let step=sin(uniforms.time*4.0+f32(leg)*PI)*0.12*alive();
    let start=path+rotate(vec3f(side*0.25*s,0,z),a);
    let end=path+rotate(vec3f(side*0.65*s,-0.28*s+max(step,0.0)*s,z+step*s),a);
    let uv=quad(local);
    return surface(mix(start,end,uv.x)+vec3f(0,(uv.y-0.5)*0.06*s,0),palette(0),0);
  }
  return surface(path,palette(0),0.0);
}
`,
  4,
);
