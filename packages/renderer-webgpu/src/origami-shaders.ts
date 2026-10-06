import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const ORIGAMI_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn craneCount()->u32 {return 3u+u32(worldDNA(5u).w*3.0);}
fn paperWidth()->u32 {return 10u+u32(worldDNA(6u).w*5.0);}
fn worldCount()->u32 {return craneCount()+paperWidth()*paperWidth();}
fn worldAmbientCount()->u32 {return 303u+u32(worldDNA(7u).w*4.0);}
fn paperPetal(v:u32,length:f32,width:f32,lift:f32)->vec3f {
  let p=array<vec3f,12>(vec3f(0,0,0),vec3f(-1,0.25,0.48),vec3f(0,0.62,0.58),vec3f(-1,0.25,0.48),vec3f(0,1,1),vec3f(0,0.62,0.58),vec3f(0,0,0),vec3f(0,0.62,0.58),vec3f(1,0.25,0.48),vec3f(1,0.25,0.48),vec3f(0,0.62,0.58),vec3f(0,1,1));
  return p[v%12u]*vec3f(width,lift,length);
}
fn paperBloom(v:u32,radius:f32,seed:f32)->vec3f {
  let petal=(v/12u)%8u;let layer=(v/96u)%2u;
  let size=select(1.0,0.65,layer==1u);
  let a=f32(petal)*PI/4.0+f32(layer)*PI/8.0+seed;
  let breathe=sin(uniforms.time*0.8+seed*9.0)*0.14*alive();
  let p=paperPetal(v,radius*size,radius*0.36*size,radius*(0.35+f32(layer)*0.65+breathe));
  return rotate(p,a)+vec3f(0,f32(layer)*radius*0.08,0);
}
fn worldAnchor(i:u32)->vec3f {
  let s=uniforms.gridSize/25.0;
  if(i<craneCount()){
    let g=gene(i+260u);let mode=sceneVariant(3u);
    var c=spiral(i,f32(craneCount()),uniforms.gridSize*(0.20+worldDNA(8u).w*0.14));
    if(mode==1u){c=vec3f((f32(i)-f32(craneCount()-1u)*0.5)*2.7,0,g.y*8.0)*s;}
    if(mode==2u){c=vec3f(g.x,0,g.y)*uniforms.gridSize*0.75;}
    return seededFrame(c+vec3f(0,(5.0+g.w*2.8)*s,0));
  }
  let c=squarePatch(i-craneCount(),paperWidth());
  return seededFrame(c+vec3f(sin(c.z*0.51+worldDNA(9u).w*6.28)*0.8*s,0,cos(c.x*0.4)*0.8*s));
}
fn worldFoundation(v:u32)->Surface {
  return tile(v,mix(uniforms.themeFifth.rgb,palette(2),0.19),mix(palette(2),uniforms.themeFifth.rgb,0.7),0.26,2.0);
}
fn craneWing(v:u32,side:f32,seed:f32)->vec3f {
  // Broad folded wings, with a raised center crease and a pointed outer tip.
  let p=array<vec3f,12>(vec3f(0,0,-0.65),vec3f(1.05,0.38,-0.05),vec3f(2.75,0.12,0.55),vec3f(0,0,-0.65),vec3f(0,0,0.75),vec3f(1.05,0.38,-0.05),vec3f(0,0,0.75),vec3f(2.75,0.12,0.55),vec3f(1.05,0.38,-0.05),vec3f(0,0,0.75),vec3f(2.75,0.12,0.55),vec3f(0.75,-0.12,0.9));
  var q=p[v%12u];let hinge=sin(uniforms.time*(1.65+seed*0.45)+seed*11.0)*0.72*alive();
  let x=q.x;q.x=(x*cos(hinge)-q.y*sin(hinge))*side;q.y=x*sin(hinge)+q.y*cos(hinge);
  return q;
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let g=gene(i);let s=uniforms.gridSize/25.0;
  let group=sin(c.x*(0.2+worldDNA(10u).w*0.3)+c.z*0.14+worldDNA(11u).w*6.28)+cos(c.z*0.36);
  let paper=mix(select(palette(1),palette(3),group>0.3),uniforms.themeFifth.rgb,0.1);
  if(i<craneCount()){
    let size=(1.15+gene(i+260u).w*0.45)*s;
    var p=vec3f(0.0);
    if(part<2u){p=craneWing(v,select(-1.0,1.0,part==1u),g.w);}
    else if(part==2u){
      let points=array<vec3f,12>(vec3f(-0.38,0,-0.65),vec3f(0,0.55,-0.08),vec3f(0.38,0,-0.65),vec3f(-0.38,0,-0.65),vec3f(0,0.65,1.85),vec3f(0,0.55,-0.08),vec3f(0.38,0,-0.65),vec3f(0,0.55,-0.08),vec3f(0,0.65,1.85),vec3f(-0.38,0,-0.65),vec3f(0.38,0,-0.65),vec3f(0,0.65,1.85));
      p=points[v%12u];
    }else{
      let points=array<vec3f,12>(vec3f(-0.18,0,-0.55),vec3f(-0.12,1.45,-1.15),vec3f(0.14,1.30,-1.10),vec3f(-0.18,0,-0.55),vec3f(0.14,1.30,-1.10),vec3f(0.18,0.1,-0.5),vec3f(-0.12,1.45,-1.15),vec3f(0,1.10,-2.10),vec3f(0.14,1.30,-1.10),vec3f(0.14,1.30,-1.10),vec3f(0,1.10,-2.10),vec3f(0.12,1.45,-1.15));
      p=points[v%12u];
    }
    let a=uniforms.time*(0.20+g.w*0.10)*alive()+g.w*PI*2.0;
    let drift=vec3f(cos(a)*(1.4+g.w),sin(uniforms.time*0.9+g.w*13.0)*0.65,sin(a)*(1.2+g.w))*s*alive();
    let bank=sin(a*1.5)*0.16*alive();
    p=vec3f(p.x*cos(bank)-p.y*sin(bank),p.x*sin(bank)+p.y*cos(bank),p.z);
    let foldedPaper=mix(palette(f32(1u+i%3u)),uniforms.themeFifth.rgb,0.86);
    let face=select(select(0.96,0.82,part==1u),1.05,part==3u);
    return surface(c+rotate(p*size,a+PI)+drift,foldedPaper*face,0.32);
  }
  let flower=gene(i+220u).w>worldDNA(13u).w*0.6;
  let hero=gene(i+230u).w>0.82+worldDNA(14u).w*0.1;
  let radius=select(0.48+g.z*0.32,1.45+g.w*0.35,hero)*s;
  let height=select(0.16+g.w*0.65,1.1+g.w*0.5,hero)*s;
  let sway=vec3f(sin(uniforms.time*0.64+g.w*15.0)*0.055,0,cos(uniforms.time*0.54+g.w*9.0)*0.045)*alive();
  if(flower){
    if(part==0u){return surface(c+vec3f(0,height,0)+sway+paperBloom(v,radius,g.w*4.0),paper,0.0);}
    if(part==1u){return surface(bridge(v,c,c+vec3f(0,height+radius*0.25,0)+sway,0.035*s),mix(palette(2),palette(0),0.2),0.0);}
    if(part==2u){return surface(c+rotate(paperPetal(v,radius*0.85,radius*0.27,0.22*s),g.w*6.28),palette(2),0.0);}
    return surface(c+vec3f(0,height+radius*0.3,0)+sway+sphere(v,vec3f(radius*0.13)),mix(palette(3),uniforms.themeFifth.rgb,0.3),0.0);
  }
  let tier=f32(part);
  let p=paperPetal(v,radius*(1.1-tier*0.13),radius*0.31,(0.65+tier*0.25)*s);
  return surface(c+rotate(p,g.w*6.28+tier*PI*0.53)+sway*tier+vec3f(0,tier*0.13*s,0),mix(palette(2),uniforms.themeFifth.rgb,tier*0.1),0.0);
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
  let g=gene(i+70u);let c=squarePatch(i,17u);let s=uniforms.gridSize/25.0;
  if(part==4u){return surface(c,palette(2),0.0);}
  if(i<289u){
    if(part==0u){
      let q=squarePoint(v)*2.0;
      let p=rotate(vec3f(q.x*0.71*s,0.025+abs(q.x*q.y)*0.07,q.y*0.72*s),g.w*0.7);
      let ink=mix(palette(2),uniforms.themeFifth.rgb,0.5+g.w*0.2);
      return surface(c+p,ink,0.0);
    }
    if(part==1u && i%3u==0u){return surface(c+paperBloom(v,(0.24+g.w*0.2)*s,g.w),mix(palette(3),uniforms.themeFifth.rgb,0.3),0.0);}
    return surface(c,palette(2),0.0);
  }
  if(i<297u){
    // Folded paper pinwheels sit around the edge rather than impersonating insects.
    let edge=i-289u;let a=f32(edge)*PI*0.25+worldDNA(15u).w;
    let foot=vec3f(cos(a)*uniforms.gridSize*0.40,0,sin(a)*uniforms.gridSize*0.40);
    let head=foot+vec3f(0,1.5*s,0);
    if(part==0u){let p=paperPetal(v,0.85*s,0.38*s,0.13*s);let blade=f32((v/12u)%4u)*PI*0.5+uniforms.time*(0.6+g.w)*alive();return surface(head+rotate(p,blade),palette(f32(1u+edge%3u)),0);}
    if(part==1u){return surface(bridge(v,foot,head,0.045*s),palette(2),0);}
    if(part==2u){return surface(head+sphere(v,vec3f(0.12*s)),palette(1),0);}
    return surface(head,palette(2),0);
  }
  let a=uniforms.time*(0.23+g.w*0.10)*alive()+g.w*PI*2.0;
  let radius=uniforms.gridSize*(0.20+g.w*0.11);
  let path=vec3f(cos(a)*radius,(3.0+g.z+sin(a*2.0)*0.7)*s,sin(a)*radius*0.72);
  let points=array<vec3f,12>(vec3f(0,0,-1.15),vec3f(-0.9,0,0.65),vec3f(-0.12,0.25,0.38),vec3f(0,0,-1.15),vec3f(-0.12,0.25,0.38),vec3f(0,0.12,0.55),vec3f(0,0,-1.15),vec3f(0.12,0.25,0.38),vec3f(0.9,0,0.65),vec3f(0,0,-1.15),vec3f(0,0.12,0.55),vec3f(0.12,0.25,0.38));
  if(part==0u){return surface(path+rotate(points[v%12u]*1.35*s,a+PI),mix(palette(f32(1u+i%3u)),uniforms.themeFifth.rgb,0.62),0);}
  if(part==1u){return surface(path+rotate(bridge(v,vec3f(0,0,0.55*s),vec3f(0,0,2.0*s),0.018*s),a+PI),mix(palette(2),uniforms.themeFifth.rgb,0.58),0);}
  return surface(path,palette(2),0);
}
`,
  2,
);
