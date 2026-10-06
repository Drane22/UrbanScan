import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const STAINED_GLASS_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn glassWindows()->u32 {return 3u+u32(gene(700u).w*3.0);}
fn worldCount()->u32 {return glassWindows()*32u;}
fn worldAmbientCount()->u32 {return 345u;}
fn glassCenter(window:u32)->vec3f {
  let g=gene(710u+window);let variant=u32(gene(701u).w*3.0);
  let t=f32(window)/f32(glassWindows()-1u);var p=vec3f((t-0.5)*16.0,4.0+g.w*1.7,-2.0+sin(t*PI)*4.0);
  if(variant==1u){let a=t*PI*1.6+gene(702u).w*PI;p=vec3f(cos(a)*6.5,4.0+g.w*2.2,sin(a)*6.0);}
  if(variant==2u){p=vec3f((f32(window%2u)-0.5)*10.0,3.4+g.w*3.0,(f32(window/2u)-1.0)*6.4);}
  p+=vec3f(g.x*2.0,0,g.y*2.0);
  return p*uniforms.gridSize/25.0;
}
fn glassRadius(window:u32)->f32 {return (2.35+gene(720u+window).w*1.0+select(0.0,0.65,window==u32(gene(703u).w*f32(glassWindows()))))*uniforms.gridSize/25.0;}
fn glassOrient(p:vec3f,window:u32)->vec3f {
  let angle=-0.62+gene(730u+window).x*0.9+sin(uniforms.time*0.52+f32(window)*1.8)*0.24*alive();
  return rotate(p,angle);
}
fn glassOutline(a:f32,window:u32)->vec2f {
  let shape=u32(gene(740u+window).w*4.0);var p=vec2f(cos(a),sin(a));
  if(shape==1u){p*=vec2f(0.73,1.18);}
  if(shape==2u){p/=abs(p.x)+abs(p.y);p*=vec2f(1.18,1.18);}
  if(shape==3u){p*=0.88+0.12*cos(a*6.0);}
  return p;
}
fn glassPoint(i:u32,u:f32,w:f32)->vec3f {
  let window=i/32u;let slot=i%32u;let band=slot/16u;let sector=slot%16u;
  let motif=u32(gene(750u+window).w*3.0);
  let a=(f32(sector)+u)*PI/8.0+gene(720u+window).x;
  let inner=0.09+gene(750u+window).w*0.13;
  var middle=0.46+0.13*sin(u*PI);
  if(motif==1u){middle=0.45+select(-0.10,0.15,sector%2u==0u)*sin(u*PI);}
  if(motif==2u){middle=0.36+0.22*sin((f32(sector)+u)*PI/4.0)*sin(u*PI);}
  let r=select(mix(inner,middle,w),mix(middle,0.98,w),band==1u)*glassRadius(window);
  let outline=glassOutline(a,window);
  let p=vec3f(outline*r,0.0);
  // Petal panes hinge around their outer tips in a slow opening wave.
  let hinge=vec3f(glassOutline((f32(sector)+0.5)*PI/8.0+gene(720u+window).x,window)*glassRadius(window),0);
  let opening=(0.30+0.30*sin(uniforms.time*0.72+f32(sector/2u)*0.7+f32(window)))*alive();
  return glassCenter(window)+glassOrient(hinge+rotate(p-hinge,opening),window);
}
fn worldAnchor(i:u32)->vec3f {return glassPoint(i,0.5,0.5);}
fn worldFoundation(v:u32)->Surface {
  return tile(v,mix(palette(0),palette(2),0.12),mix(palette(0),palette(3),0.1),0.19,3.0);
}
fn glassFloorPoint(i:u32,u:f32,w:f32)->vec3f {
  let band=i/32u;let sector=i%32u;
  let radial=(f32(band)+w)/8.0;
  let a=(f32(sector)+u)*PI/16.0+gene(704u).w*PI+sin(radial*PI)*gene(705u).x*1.4;
  let petals=4.0+floor(gene(706u).w*5.0)*2.0;
  let ripple=radial+sin(a*petals)*0.045*sin(radial*PI);
  let direction=vec2f(cos(a),sin(a));
  let center=gene(707u).xy*uniforms.gridSize*0.30;
  let boundary=direction/max(abs(direction.x),abs(direction.y))*uniforms.gridSize*0.499;
  let point=mix(center,boundary,ripple);
  return vec3f(point.x,0.045,point.y);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let q=squarePoint(v)+vec2f(0.5);let window=i/32u;let sector=i%16u;let band=(i%32u)/16u;
  let motif=u32(gene(750u+window).w*3.0);
  let jewel=palette(f32(1u+(sector/(1u+motif)+band+window)%3u));
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
  if(i<5u){
    if(i>=glassWindows()){return surface(vec3f(0),palette(0),0);}
    let c=glassCenter(i);let radius=glassRadius(i);
    if(part==4u){return surface(vec3f(c.x,0,c.z),palette(0),0.0);}
    if(part==0u){let p=ring(v,radius,0.085*s);let a=atan2(p.z,p.x);let outline=glassOutline(a,i)*length(p.xz);return surface(c+glassOrient(vec3f(outline,p.y),i),mix(palette(0),palette(3),0.1),0.3);}
    if(part==1u){
      let side=select(-1.0,1.0,v>=192u);let foot=vec3f(c.x+side*radius*0.7,0,c.z);
      return surface(bridge(v,foot,c+glassOrient(vec3f(side*radius*0.7,-radius*0.7,0),i),0.11*s),palette(0),0.15);
    }
    if(part==2u){return surface(vec3f(c.x,0,c.z)+box(v,vec3f(radius*1.7,0.19*s,0.65*s)),mix(palette(0),palette(3),0.16),0.2);}
    return surface(c+sphere(v,vec3f(0.24*s)),palette(3),0.8);
  }
  if(i<261u){
    let slot=i-5u;let q=squarePoint(v)+vec2f(0.5);let center=glassFloorPoint(slot,0.5,0.5);
    if(part==4u){return surface(center,palette(0),0.0);}
    if(part==0u){
      let p=glassFloorPoint(slot,q.x,q.y);let band=slot/32u;let sector=slot%32u;
      let motif=1u+u32(gene(708u).w*4.0);
      let petal=sin((f32(sector)+0.5)*PI/f32(motif+1u)+f32(band)*gene(709u).w*2.0);
      let main=select(palette(2),palette(1),petal>0.0);
      let color=select(mix(main,uniforms.themeFifth.rgb,0.22),mix(palette(3),uniforms.themeFifth.rgb,0.1),(band+motif)%4u==0u);
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
  if(i<325u){
    let slot=i-261u;let edge=slot/16u;let t=(f32(slot%16u)+0.5)/16.0;
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
  let c=vec3f(g.x*uniforms.gridSize*0.75,0,g.y*uniforms.gridSize*0.75);
  if(part==4u){return surface(c,palette(0),0);}
  let a=uniforms.time*(0.30+g.w*0.20)+g.w*PI*2.0;
  let path=c+vec3f(sin(a)*2.1,2.2+g.z*2.1+sin(a*1.7)*0.75,cos(a)*1.8)*s;
  let color=mix(palette(f32(1u+i%3u)),uniforms.themeFifth.rgb,0.30);
  if(i<337u){
    if(part==0u){return surface(path+rotate(butterfly(v,g.w,(0.65+g.w*0.40)*s),-a),color,0.65);}
    if(part==1u){return surface(path+rotate(box(v,vec3f(0.065*s,0.07*s,0.4*s)),-a),palette(0),0.3);}
    return surface(path,palette(0),0);
  }
  if(part==0u){
    let uv=quad(v);let t=(f32(v/6u)+uv.x)/64.0;
    let b=a-t*0.9;let p=c+vec3f(sin(b)*2.1,2.2+g.z*2.1+sin(b*1.7)*0.75,cos(b)*1.8)*s;
    return surface(p+vec3f(0,(uv.y-0.5)*0.21*s*sin(t*PI),0),color,0.8);
  }
  if(part==1u){return surface(path+sphere(v,vec3f(0.12*s)),uniforms.themeFifth.rgb,0.9);}
  return surface(path,palette(0),0);
}
`,
  3,
);
