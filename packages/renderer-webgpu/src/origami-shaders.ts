import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const ORIGAMI_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn worldCount()->u32 {return 174u;}
fn worldAmbientCount()->u32 {return 320u;}
fn paperPetal(v:u32,length:f32,width:f32,lift:f32)->vec3f {
  let p=array<vec3f,12>(vec3f(0,0,0),vec3f(-1,0.25,0.48),vec3f(0,0.62,0.58),vec3f(-1,0.25,0.48),vec3f(0,1,1),vec3f(0,0.62,0.58),vec3f(0,0,0),vec3f(0,0.62,0.58),vec3f(1,0.25,0.48),vec3f(1,0.25,0.48),vec3f(0,0.62,0.58),vec3f(0,1,1));
  return p[v%12u]*vec3f(width,lift,length);
}
fn paperBloom(v:u32,radius:f32,seed:f32)->vec3f {
  let petal=(v/12u)%8u;let layer=(v/96u)%2u;
  let size=select(1.0,0.65,layer==1u);
  let a=f32(petal)*PI/4.0+f32(layer)*PI/8.0+seed;
  let breathe=sin(uniforms.time*0.65+seed*9.0)*0.045*alive();
  let p=paperPetal(v,radius*size,radius*0.36*size,radius*(0.35+f32(layer)*0.65+breathe));
  return rotate(p,a)+vec3f(0,f32(layer)*radius*0.08,0);
}
fn worldAnchor(i:u32)->vec3f {
  let s=uniforms.gridSize/25.0;
  if(i<5u){
    let c=array<vec3f,5>(vec3f(-2,5.1,-2),vec3f(5,4.5,1),vec3f(-6,3.2,4),vec3f(4,3.4,-7),vec3f(-7,3.7,-6));
    return c[i]*s;
  }
  let c=squarePatch(i-5u,13u);
  return c+vec3f(sin(c.z*0.51)*0.43*s,0,cos(c.x*0.4)*0.43*s);
}
fn worldFoundation(v:u32)->Surface {
  return tile(v,mix(uniforms.themeFifth.rgb,palette(2),0.19),mix(palette(2),uniforms.themeFifth.rgb,0.7),0.26,2.0);
}
fn craneWing(v:u32,side:f32,seed:f32)->vec3f {
  let p=array<vec3f,6>(vec3f(0,0,-0.65),vec3f(0.5,0.25,0),vec3f(2.1,0.65,0.5),vec3f(0,0,-0.65),vec3f(2.1,0.65,0.5),vec3f(0,0,0.8));
  var q=p[v%6u];let hinge=sin(uniforms.time*0.82+seed*11.0)*0.13*alive();
  q.y+=q.x*hinge;q.x*=side;return q;
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let g=gene(i);let s=uniforms.gridSize/25.0;
  let group=sin(c.x*0.31+c.z*0.14)+cos(c.z*0.36);
  let paper=mix(select(palette(1),palette(3),group>0.3),uniforms.themeFifth.rgb,0.1);
  if(i<5u){
    let size=select(1.3,2.0,i==0u)*s;
    var p=vec3f(0.0);
    if(part<2u){p=craneWing(v,select(-1.0,1.0,part==1u),g.w);}
    else if(part==2u){
      let points=array<vec3f,12>(vec3f(-0.23,0,-0.7),vec3f(0,0.43,-0.1),vec3f(0.23,0,-0.7),vec3f(-0.23,0,-0.7),vec3f(0,0.1,1.65),vec3f(0,0.43,-0.1),vec3f(0.23,0,-0.7),vec3f(0,0.43,-0.1),vec3f(0,0.1,1.65),vec3f(-0.23,0,-0.7),vec3f(0.23,0,-0.7),vec3f(0,0.1,1.65));
      p=points[v%12u];
    }else{
      let points=array<vec3f,12>(vec3f(-0.12,0,-0.55),vec3f(-0.07,1.05,-1.04),vec3f(0.08,0.92,-1.0),vec3f(-0.12,0,-0.55),vec3f(0.08,0.92,-1.0),vec3f(0.12,0.1,-0.5),vec3f(-0.07,1.05,-1.04),vec3f(-0.025,0.79,-1.68),vec3f(0.08,0.92,-1.0),vec3f(0.08,0.92,-1.0),vec3f(-0.025,0.79,-1.68),vec3f(0.05,1.05,-1.04));
      p=points[v%12u];
    }
    if(part==3u){p.x*=1.65;p.y*=1.18;}
    let drift=vec3f(0,sin(uniforms.time*0.7+g.w*13.0)*0.14*alive(),0);
    return surface(c+rotate(p*size,-0.55+f32(i)*1.3)+drift,mix(paper,uniforms.themeFifth.rgb,select(0.12,0.68,i==0u))*select(1.0,0.86,part==1u),0.02);
  }
  let flower=i%4u!=0u;
  let hero=i%9u==0u;
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
  let a=uniforms.time*(0.16+g.w*0.13)+g.w*PI*2.0;
  let radius=uniforms.gridSize*(0.12+g.w*0.25);
  let path=vec3f(cos(a)*radius,(2.2+g.z+sin(a*2.0+g.w)*0.65)*s,sin(a)*radius);
  if(part==0u){return surface(path+rotate(butterfly(v,g.w,0.45*g.z*s),a),mix(palette(3),uniforms.themeFifth.rgb,0.2),0.0);}
  if(part==1u){return surface(path+rotate(sphere(v,vec3f(0.025,0.025,0.16)*s),a),palette(0),0.0);}
  return surface(path,palette(2),0.0);
}
`,
  2,
);
