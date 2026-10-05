import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const STAINED_GLASS_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn worldCount()->u32 {return 96u;}
fn worldAmbientCount()->u32 {return 365u;}
fn glassCenter(window:u32)->vec3f {
  let centers=array<vec3f,3>(vec3f(0,5.6,-2.5),vec3f(-6.0,3.6,1.8),vec3f(6.0,3.6,-4.0));
  return centers[window%3u]*uniforms.gridSize/25.0;
}
fn glassRadius(window:u32)->f32 {return select(2.65,4.1,window==0u)*uniforms.gridSize/25.0;}
fn glassOrient(p:vec3f,window:u32)->vec3f {
  let angle=select(select(-0.25,0.25,window==2u),0.0,window==0u)+sin(uniforms.time*0.35+f32(window)*1.8)*0.017*alive();
  return rotate(p,angle);
}
fn glassPoint(i:u32,u:f32,w:f32)->vec3f {
  let window=i/32u;let slot=i%32u;let band=slot/16u;let sector=slot%16u;
  let a=(f32(sector)+u)*PI/8.0;
  let inner=0.14;let middle=0.52+0.13*sin(u*PI);
  let r=select(mix(inner,middle,w),mix(middle,0.98,w),band==1u)*glassRadius(window);
  return glassCenter(window)+glassOrient(vec3f(cos(a)*r,sin(a)*r,0.0),window);
}
fn worldAnchor(i:u32)->vec3f {return glassPoint(i,0.5,0.5);}
fn worldFoundation(v:u32)->Surface {
  return tile(v,mix(palette(0),palette(2),0.12),mix(palette(0),palette(3),0.1),0.28,3.0);
}
fn glassFloorPoint(i:u32,u:f32,w:f32)->vec3f {
  let band=i/32u;let sector=i%32u;let a=(f32(sector)+u)*PI/16.0;
  let radial=(f32(band)+w)/8.0;
  let ripple=radial+sin(a*8.0)*0.045*sin(radial*PI);
  let direction=vec2f(cos(a),sin(a));
  let point=direction/max(abs(direction.x),abs(direction.y))*ripple*uniforms.gridSize*0.499;
  return vec3f(point.x,0.045,point.y);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let q=squarePoint(v)+vec2f(0.5);let window=i/32u;let sector=i%16u;let band=(i%32u)/16u;
  let jewel=select(select(palette(1),palette(3),sector%4u<2u),palette(2),band==0u);
  if(part==0u){
    var p=glassPoint(i,q.x,q.y);let d=disk(v);p.z+=0.06+0.08*(1.0-length(d));
    let shimmer=0.9+sin(uniforms.time*0.55+p.x*0.45+p.y*0.33)*0.10*alive();
    return surface(p,jewel*shimmer,0.5);
  }
  if(part==1u){return surface(bridge(v,glassPoint(i,0,0),glassPoint(i,0,1),0.04),palette(0),0.2);}
  if(part==2u){
    let uv=quad(v);let t=(f32(v/6u)+uv.x)/64.0;
    let a=glassPoint(i,t,1.0);let b=glassPoint(i,min(t+0.016,1.0),1.0);
    return surface(mix(a,b,uv.x)+vec3f(0,0,(uv.y-0.5)*0.085),palette(0),0.2);
  }
  let c=glassPoint(i,0,0)+vec3f(0,0,0.07);
  return surface(c+sphere(v,vec3f(0.055)),mix(palette(3),uniforms.themeFifth.rgb,0.25),0.4);
}
fn glassFlower(v:u32,radius:f32,seed:f32)->vec3f {
  let petal=(v/48u)%8u;let local=v%48u;let uv=quad(local);
  let t=(f32(local/6u)+uv.y)/8.0;let across=(uv.x-0.5)*2.0;
  let p=vec3f(across*sin(t*PI)*radius*0.28,(0.1+t*t*0.52)*radius,t*radius);
  return rotate(p,f32(petal)*PI/4.0+seed);
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
  let g=gene(i+140u);let s=uniforms.gridSize/25.0;
  if(i<3u){
    let c=glassCenter(i);let radius=glassRadius(i);
    if(part==4u){return surface(vec3f(c.x,0,c.z),palette(0),0.0);}
    if(part==0u){let p=ring(v,radius,0.11*s);return surface(c+glassOrient(vec3f(p.x,p.z,p.y),i),mix(palette(0),palette(3),0.1),0.3);}
    if(part==1u){
      let side=select(-1.0,1.0,v>=192u);let foot=vec3f(c.x+side*radius*0.7,0,c.z);
      return surface(bridge(v,foot,c+glassOrient(vec3f(side*radius*0.7,-radius*0.7,0),i),0.11*s),palette(0),0.15);
    }
    if(part==2u){return surface(vec3f(c.x,0,c.z)+box(v,vec3f(radius*1.7,0.19*s,0.65*s)),mix(palette(0),palette(3),0.16),0.2);}
    return surface(c+sphere(v,vec3f(0.24*s)),palette(3),0.8);
  }
  if(i<259u){
    let slot=i-3u;let q=squarePoint(v)+vec2f(0.5);let center=glassFloorPoint(slot,0.5,0.5);
    if(part==4u){return surface(center,palette(0),0.0);}
    if(part==0u){
      let p=glassFloorPoint(slot,q.x,q.y);let band=slot/32u;let sector=slot%32u;
      let petal=sin((f32(sector)+0.5)*PI/4.0);
      let main=select(palette(2),palette(1),petal>0.0);
      let color=select(mix(main,uniforms.themeFifth.rgb,0.22),mix(palette(3),uniforms.themeFifth.rgb,0.1),band==2u || band==6u);
      let glimmer=0.86+sin(uniforms.time*0.5+p.x*0.24+p.z*0.31)*0.10*alive();
      return surface(p,color*glimmer,0.4);
    }
    if(part==1u){
      let uv=quad(v);let t=(f32(v/6u)+uv.x)/64.0;
      let a=f32(slot%32u)*PI/16.0;
      let p=glassFloorPoint(slot,0,t)+vec3f(-sin(a)*(uv.y-0.5)*0.09*s,0.027,cos(a)*(uv.y-0.5)*0.09*s);
      return surface(p,palette(0),0.1);
    }
    if(part==2u){
      let uv=quad(v);let t=(f32(v/6u)+uv.x)/64.0;
      let p=glassFloorPoint(slot,t,1.0);
      let a=(f32(slot%32u)+t)*PI/16.0;
      return surface(p+vec3f(cos(a)*(uv.y-0.5)*0.09*s,0.029,sin(a)*(uv.y-0.5)*0.09*s),palette(0),0.1);
    }
    return surface(center,palette(0),0.0);
  }
  if(i<323u){
    let slot=i-259u;let edge=slot/16u;let t=(f32(slot%16u)+0.5)/16.0;
    let half=uniforms.gridSize*0.46;
    var c=vec3f(mix(-half,half,t),0.08,-half);
    if(edge==1u){c=vec3f(half,0.08,mix(-half,half,t));}
    if(edge==2u){c=vec3f(mix(-half,half,t),0.08,half);}
    if(edge==3u){c=vec3f(-half,0.08,mix(-half,half,t));}
    if(part==4u){return surface(c,palette(0),0.0);}
    let height=(0.35+g.w*0.6)*s;
    let bend=vec3f(sin(uniforms.time*0.6+g.w*16.0)*0.07,0,cos(uniforms.time*0.5+g.w*13.0)*0.06)*alive();
    let head=c+vec3f(0,height,0)+bend;
    if(part==0u){return surface(head+glassFlower(v,(0.38+g.w*0.18)*s,g.w),mix(palette(3),uniforms.themeFifth.rgb,0.15),0.45);}
    if(part==1u){return surface(bridge(v,c,head,0.028*s),palette(0),0.2);}
    if(part==2u){return surface(head+sphere(v,vec3f(0.075*s)),palette(1),0.8);}
    return surface(c+rotate(blade(v,height*0.7,0.12,g.w),g.w*6.28),palette(2),0.3);
  }
  let c=squarePatch(i-323u,7u);
  if(part==4u || part>0u){return surface(c,palette(0),0.0);}
  let a=uniforms.time*(0.10+g.w*0.08)+g.w*PI*2.0;
  let drift=vec3f(sin(a)*0.7,1.2+g.z*2.1+sin(a*0.7)*0.65,cos(a)*0.6)*alive();
  return surface(c+drift+sphere(v,vec3f(0.028*g.z)),mix(uniforms.themeFifth.rgb,palette(3),0.2),0.85);
}
`,
  3,
);
