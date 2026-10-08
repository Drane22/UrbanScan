import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const STAINED_GLASS_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn pavilionCenter()->vec3f {return vec3f(worldDNA(6u).x*0.09,0,worldDNA(6u).y*0.09)*uniforms.gridSize;}
fn panelBase(i:u32)->vec3f {
  let s=uniforms.gridSize/25.0;let t=f32(i)/f32(glassPanels());let mode=sceneVariant(3u);
  let a=t*PI*2.0+worldDNA(7u).w*PI;var p=vec3f(cos(a),0,sin(a))*uniforms.gridSize*0.27;
  if(mode==1u){p=vec3f((t-0.5)*17.0,0,sin(t*PI*2.0)*4.8)*s;}
  if(mode==2u){let cluster=i%2u;let b=f32(i/2u)*PI*0.65+worldDNA(8u).w*PI;p=vec3f(select(-4.7,4.7,cluster==1u)+cos(b)*3.4,0,sin(b)*5.2)*s;}
  return pavilionCenter()+p;
}
fn panelHeading(i:u32)->f32 {
  let t=f32(i)/f32(glassPanels());let mode=sceneVariant(3u);
  if(mode==1u){return -0.35+gene(710u+i).x*0.6;}
  return -t*PI*2.0-worldDNA(7u).w*PI+PI*0.5;
}
fn panePoint(i:u32,u:f32,w:f32)->vec3f {
  let panel=i/24u;let slot=i%24u;let row=slot/4u;let column=slot%4u;let s=uniforms.gridSize/25.0;
  let width=(3.1+gene(710u+panel).w*0.8)*s;let height=(3.6+gene(720u+panel).w*1.7)*s;
  let x=(f32(column)+u)/4.0-0.5;let y=(f32(row)+w)/6.0;
  let arch=sin((x+0.5)*PI)*1.3*s*y*y;
  var p=vec3f(x*width,height*y+arch+0.45*s,0);
  // Each louver pivots on a real vertical hinge; its lead frame follows it.
  let hinge=vec3f((f32(column)/4.0-0.5)*width,p.y,0);
  let opening=sin(uniforms.time*(0.48+gene(730u+panel).w*0.24)+f32(row)*0.65+f32(panel))*0.60;
  p=hinge+rotate(p-hinge,opening);
  return panelBase(panel)+rotate(p,panelHeading(panel));
}
fn canopyPoint(i:u32,u:f32,w:f32)->vec3f {
 let s=uniforms.gridSize/25.0;let sector=i%16u;let band=i/16u;
 let a=(f32(sector)+u)*PI/8.0+worldDNA(9u).w*PI;let t=(f32(band)+w)/4.0;
 let petals=5.0+floor(worldDNA(12u).w*4.0);let scallop=sin(a*petals)*0.35*t*t;
 let radius=mix(0.55,6.0+worldDNA(11u).w*1.3,t)*s;
 let breathe=sin(uniforms.time*0.52+a*2.0)*0.13*t;
 let height=(8.6+worldDNA(13u).w+cos(t*PI*0.62)*1.5-t*2.8+scallop+breathe)*s;
 return pavilionCenter()+vec3f(cos(a)*radius,height,sin(a)*radius);
}
// Exact budgets avoid running a 384-vertex sphere for every flat pane or lead strip.
fn glassVertexCount(i:u32,part:u32,ambient:bool)->u32 {
 if(!ambient){return select(select(36u,144u,part==1u),24u,part==3u);}
 if(i<256u){return select(6u,24u,part==3u);}
 if(i<304u){return select(select(24u,36u,part==1u),96u,part==2u);}
 if(i<336u){return select(36u,24u,part==3u);}
 if(i<360u){return select(select(6u,36u,part==1u),24u,part==2u);}
 return select(0u,6u,part==0u);
}
fn glassBeam(v:u32,a:vec3f,b:vec3f,r:f32)->vec3f {
 let axis=normalize(b-a+vec3f(0.00001));let side=normalize(cross(axis,select(vec3f(0,1,0),vec3f(1,0,0),abs(axis.y)>0.95)));
 let q=cube(v,vec3f(r,length(b-a),r));return a+side*q.x+axis*q.y+cross(side,axis)*q.z;
}
fn glassRing(v:u32,r:f32,width:f32)->vec3f {
 let uv=quad(v);let a=(f32(v/6u)+uv.x)*PI/8.0;let radius=r+(uv.y-0.5)*width;
 return vec3f(cos(a)*radius,0,sin(a)*radius);
}
fn glassUv(v:u32,i:u32)->vec2f {
 let uv=quad(v);let slot=i%24u;
 if(i<glassPanels()*24u){return (vec2f(f32(slot%4u),f32(slot/4u))+uv)/vec2f(4,6);}
 let index=i-glassPanels()*24u;let a=(f32(index%16u)+uv.x)*PI/8.0;
 let r=(f32(index/16u)+uv.y)/8.0;return vec2f(0.5)+vec2f(cos(a),sin(a))*r;
}
fn worldAnchor(i:u32)->vec3f {
  if(i<glassPanels()*24u){return panePoint(i,0.5,0.5);}
  return canopyPoint(i-glassPanels()*24u,0.5,0.5);
}
fn jewel(v:u32,r:f32)->vec3f {
 let face=v/3u;let side=face%4u;let angle=f32(side)*PI*0.5;let corner=v%3u;
 if(corner==0u){return vec3f(0,select(-1.7,1.7,face<4u)*r,0);}
 let a=angle+select(0.0,PI*0.5,corner==2u);return vec3f(cos(a)*r,0,sin(a)*r);
}
fn worldFoundation(v:u32)->Surface {return tile(v,mix(uniforms.themeFifth.rgb,palette(0),0.24),mix(palette(0),palette(3),0.12),0.85,3.0);}
fn glassPoint(i:u32,u:f32,w:f32)->vec3f {
 if(i<glassPanels()*24u){return panePoint(i,u,w);}
 return canopyPoint(i-glassPanels()*24u,u,w);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
 let s=uniforms.gridSize/25.0;let wall=i<glassPanels()*24u;
 let color=palette(f32(1u+(i/4u+i%3u+u32(worldDNA(14u).w*3.0))%3u));
 let lead=mix(palette(0)*0.48,palette(3)*0.25,0.14);
 if(part==0u){
  // Six faces give the glass a visible cut edge; front/back use the same rose motif.
  let q=cube(v,vec3f(1,1,0.045));let u=q.x+0.5;let w=q.y;
  var p=glassPoint(i,u,w);let depth=select(vec3f(0,q.z,0),rotate(vec3f(0,0,q.z),panelHeading(i/24u)),wall);
  return surface(p+depth*s,color,0.22);
 }
 if(part==1u){
  let edge=v/36u;let index=v%36u;let corners=array<vec2f,5>(vec2f(0,0),vec2f(1,0),vec2f(1,1),vec2f(0,1),vec2f(0,0));
  let a=corners[edge];let b=corners[edge+1u];
  return surface(glassBeam(index,glassPoint(i,a.x,a.y),glassPoint(i,b.x,b.y),0.065*s),lead,0.03);
 }
 if(part==2u){
  return surface(glassBeam(v,glassPoint(i,0,0),glassPoint(i,1,1),0.025*s),mix(lead,palette(3),0.28),0.04);
 }
 return surface(glassPoint(i,0,0)+jewel(v,0.11*s),mix(palette(3),uniforms.themeFifth.rgb,0.16),0.18);
}
fn floorPoint(i:u32,q:vec2f)->vec3f {
  let cell=uniforms.gridSize/16.0;let uv=(vec2f(f32(i%16u),f32(i/16u))+q)/16.0-vec2f(0.5);
  return vec3f(uv.x*uniforms.gridSize,0.045,uv.y*uniforms.gridSize);
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
  let g=gene(i+160u);let s=uniforms.gridSize/25.0;let q=quad(v);
  if(i<256u){
    let c=floorPoint(i,vec2f(0.5));if(part==4u){return surface(c,palette(0),0);}
    let p=floorPoint(i,q);let local=p.xz-pavilionCenter().xz;let angle=atan2(local.y,local.x);
    let motif=4.0+floor(worldDNA(15u).w*5.0);let petal=sin(angle*motif+length(local)*0.35);
    let color=select(palette(2),palette(1),petal>0.0);
    let light=0.5+0.5*sin(angle*3.0-uniforms.time*0.35+length(local)*0.24);
    let stone=mix(uniforms.themeFifth.rgb,palette(0),0.28);
    let lattice=select(0.72,1.0,(i%16u+i/16u)%2u==0u);
    let projection=pow(max(sin(angle*motif+length(local)*0.4-uniforms.time*0.24),0.0),2.0);
    let mosaic=mix(stone*lattice,mix(color,palette(3),light*0.25),0.24+projection*0.38);
    if(part==0u){return surface(p,mosaic,0.10+projection*0.15);}
    if(part==1u){let uv=quad(v);return surface(floorPoint(i,vec2f(uv.x,0))+vec3f(0,0.012,(uv.y-0.5)*0.055*s),palette(0),0.1);}
    if(part==2u){let uv=quad(v);return surface(floorPoint(i,vec2f(0,uv.x))+vec3f((uv.y-0.5)*0.055*s,0.012,0),palette(0),0.1);}
    if((i%16u+i/16u)%3u==0u){return surface(c+rotate(jewel(v,0.16*s),g.w*PI),mix(color,uniforms.themeFifth.rgb,0.20),0.4);}
    return surface(c,palette(0),0);
  }
  if(i<304u){
    let slot=i-256u;let a=f32(slot)/48.0*PI*2.0+worldDNA(9u).w*PI;let radius=(2.2+f32(slot%3u)*1.25)*s;
    let anchor=pavilionCenter()+vec3f(cos(a)*radius,(6.5+worldDNA(13u).w)*s,sin(a)*radius);
    let length=(0.7+g.w*1.8)*s;let sway=sin(uniforms.time*(0.65+g.w*0.25)+g.w*18.0)*0.55;
    let head=anchor+vec3f(sin(sway)*length,-cos(sway)*length,cos(sway*1.3)*0.25*s);
    if(part==4u){return surface(anchor,palette(0),0);}
    let size=select(0.28+g.w*0.18,0.62+g.w*0.22,slot%6u==0u)*s;
    if(part==0u){return surface(head+rotate(jewel(v,size),uniforms.time*(0.25+g.w)),palette(f32(1u+slot%3u)),0.65);}
    if(part==1u){return surface(glassBeam(v,anchor,head,0.022*s),mix(palette(0),palette(3),0.25),0.2);}
    if(part==2u){return surface(head+glassRing(v,size*1.25,0.04*s),palette(3),0.6);}
    return surface(head+jewel(v,0.075*s),uniforms.themeFifth.rgb,0.9);
  }
  if(i<336u){
    let slot=i-304u;let panel=slot%glassPanels();let side=select(-1.0,1.0,(slot/glassPanels())%2u==0u);
    let base=panelBase(panel)+rotate(vec3f(side*2.05*s,0,0),panelHeading(panel));
    let height=(5.0+gene(720u+panel).w*1.7)*s;
    if(part==4u){return surface(base,palette(0),0);}
    if(part==0u){return surface(base+cube(v,vec3f(0.24*s,height,0.24*s)),mix(palette(0),palette(3),0.18),0.22);}
    if(part==1u){return surface(base+cube(v,vec3f(0.65*s,0.25*s,0.65*s)),palette(0),0.18);}
    if(part==2u){return surface(base+vec3f(0,height-0.12*s,0)+cube(v,vec3f(0.42*s,0.14*s,0.42*s)),palette(3),0.3);}
    return surface(base+vec3f(0,height+0.28*s,0)+jewel(v,0.24*s),palette(3),0.5);
  }
  if(i<360u){
    // A floating rose window rotates slowly above the vault, with a real lead rim.
    let slot=i-336u;let uv=quad(v);let s=uniforms.gridSize/25.0;
    let center=pavilionCenter()+vec3f(0,(10.4+worldDNA(13u).w)*s,0);
    let turn=worldDNA(9u).w*PI+sin(uniforms.time*0.22)*0.14;
    if(part==4u){return surface(center,palette(0),0);}
    let a=(f32(slot)+uv.x)*PI/12.0+uniforms.time*0.065;
    let radius=(0.40+uv.y*(1.55+0.28*cos(a*8.0)))*s;
    let point=vec3f(cos(a)*radius,sin(a)*radius,0);
    let start=f32(slot)*PI/12.0+uniforms.time*0.065;
    let innerPoint=vec3f(cos(start),sin(start),0)*0.38*s;
    let outerPoint=vec3f(cos(start),sin(start),0)*(1.95+0.28*cos(start*8.0))*s;
    if(part==0u){return surface(center+rotate(point,turn),palette(f32(1u+slot%3u)),0.4);}
    if(part==1u){return surface(center+rotate(glassBeam(v,innerPoint,outerPoint,0.045*s),turn),palette(0)*0.40,0.05);}
    if(part==2u){return surface(center+rotate(outerPoint+jewel(v,0.13*s),turn),palette(3),0.25);}
    return surface(center,palette(0),0);
  }
  let a=f32(i-360u)*PI/12.0+uniforms.time*0.28;let r=uniforms.gridSize*0.39;
  let c=pavilionCenter()+vec3f(cos(a)*r,0.06,sin(a)*r);
  if(part==4u){return surface(c,palette(0),0);}
  if(part==0u){return surface(c+rotate(vec3f((q.x-0.5)*1.2*s,0.008*s,(q.y-0.5)*0.35*s),a),mix(palette(f32(1u+i%3u)),uniforms.themeFifth.rgb,0.35),0.8);}
  return surface(c,palette(0),0);
}
`,
  3,
);
