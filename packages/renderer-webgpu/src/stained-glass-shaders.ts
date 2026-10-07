import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const STAINED_GLASS_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn pavilionCenter()->vec3f {return vec3f(worldDNA(6u).x*0.16,0,worldDNA(6u).y*0.16)*uniforms.gridSize;}
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
  let opening=sin(uniforms.time*(0.48+gene(730u+panel).w*0.24)+f32(row)*0.65+f32(panel))*0.60*alive();
  p=hinge+rotate(p-hinge,opening);
  return panelBase(panel)+rotate(p,panelHeading(panel));
}
fn canopyPoint(i:u32,u:f32,w:f32)->vec3f {
  let s=uniforms.gridSize/25.0;let a=(f32(i)+u)*PI/32.0+worldDNA(9u).w*PI;
  let inner=(1.5+worldDNA(10u).w)*s;let outer=(5.0+worldDNA(11u).w*1.2)*s;
  let radius=mix(inner,outer,w);let petals=6.0+floor(worldDNA(12u).w*5.0);
  let breathe=sin(uniforms.time*0.60+a*3.0)*0.45*w*alive();
  let h=(6.6+worldDNA(13u).w*1.4)*s+cos(w*PI*0.5)*1.3*s+sin(a*petals)*0.32*w*s+breathe*s;
  return pavilionCenter()+vec3f(cos(a)*radius,h,sin(a)*radius);
}
fn worldAnchor(i:u32)->vec3f {
  if(i<glassPanels()*24u){return panePoint(i,0.5,0.5);}
  return canopyPoint(i-glassPanels()*24u,0.5,0.5);
}
fn jewel(v:u32,r:f32)->vec3f {
  let p=sphere(v,vec3f(1));return p/max(abs(p.x)+abs(p.y)+abs(p.z),0.001)*vec3f(r,r*1.75,r);
}
fn worldFoundation(v:u32)->Surface {return tile(v,mix(palette(0),palette(2),0.20),mix(palette(0),palette(3),0.24),0.8,3.0);}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let s=uniforms.gridSize/25.0;let uv=squarePoint(v)+vec2f(0.5);
  let wall=i<glassPanels()*24u;let slot=select(i-glassPanels()*24u,i,wall);
  let band=select(slot/8u,(i%24u)/4u,wall);let panel=i/24u;
  let color=palette(f32(1u+(band+panel+u32(worldDNA(14u).w*3.0))%3u));
  if(part==0u){
    var p=canopyPoint(slot,uv.x,uv.y);if(wall){p=panePoint(i,uv.x,uv.y);}
    let hammered=0.90+0.10*sin(p.x*2.3+p.y*3.1+p.z*1.5+uniforms.time*0.32*alive());
    return surface(p,color*hammered,0.48);
  }
  if(part==1u){
    var a=canopyPoint(slot,0,0);var b=canopyPoint(slot,0,1);
    if(wall){a=panePoint(i,0,0);b=panePoint(i,0,1);}
    return surface(bridge(v,a,b,0.045*s),mix(palette(0),palette(3),0.12),0.25);
  }
  if(part==2u){
    let q=quad(v);let t=(f32(v/6u)+q.x)/64.0;var a=canopyPoint(slot,t,1.0);var b=canopyPoint(slot,min(t+0.016,1.0),1.0);
    if(wall){a=panePoint(i,t,1.0);b=panePoint(i,min(t+0.016,1.0),1.0);}
    return surface(mix(a,b,q.x)+vec3f(0,(q.y-0.5)*0.085*s,0.045*s),palette(0),0.25);
  }
  var c=canopyPoint(slot,0,0);if(wall){c=panePoint(i,0,0);}
  return surface(c+jewel(v,0.075*s),mix(palette(3),uniforms.themeFifth.rgb,0.2),0.55);
}
fn floorPoint(i:u32,q:vec2f)->vec3f {
  let cell=uniforms.gridSize/16.0;let uv=(vec2f(f32(i%16u),f32(i/16u))+q)/16.0-vec2f(0.5);
  return vec3f(uv.x*uniforms.gridSize,0.045,uv.y*uniforms.gridSize);
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
  let g=gene(i+160u);let s=uniforms.gridSize/25.0;let q=squarePoint(v)+vec2f(0.5);
  if(i<256u){
    let c=floorPoint(i,vec2f(0.5));if(part==4u){return surface(c,palette(0),0);}
    let p=floorPoint(i,q);let local=p.xz-pavilionCenter().xz;let angle=atan2(local.y,local.x);
    let motif=4.0+floor(worldDNA(15u).w*5.0);let petal=sin(angle*motif+length(local)*0.35);
    let color=select(palette(2),palette(1),petal>0.0);
    let light=0.5+0.5*sin(angle*3.0-uniforms.time*0.35*alive()+length(local)*0.24);
    let mosaic=mix(color,palette(3),light*0.35)*(.78+light*0.24);
    if(part==0u){return surface(p,mosaic,0.25+light*0.25);}
    if(part==1u){let uv=quad(v);return surface(floorPoint(i,vec2f(uv.x,0))+vec3f(0,0.012,(uv.y-0.5)*0.055*s),palette(0),0.1);}
    if(part==2u){let uv=quad(v);return surface(floorPoint(i,vec2f(0,uv.x))+vec3f((uv.y-0.5)*0.055*s,0.012,0),palette(0),0.1);}
    if((i%16u+i/16u)%3u==0u){return surface(c+rotate(jewel(v,0.16*s),g.w*PI),mix(color,uniforms.themeFifth.rgb,0.20),0.4);}
    return surface(c,palette(0),0);
  }
  if(i<304u){
    let slot=i-256u;let a=f32(slot)/48.0*PI*2.0+worldDNA(9u).w*PI;let radius=(2.2+f32(slot%3u)*1.25)*s;
    let anchor=pavilionCenter()+vec3f(cos(a)*radius,(6.5+worldDNA(13u).w)*s,sin(a)*radius);
    let length=(0.7+g.w*1.8)*s;let sway=sin(uniforms.time*(0.65+g.w*0.25)+g.w*18.0)*0.55*alive();
    let head=anchor+vec3f(sin(sway)*length,-cos(sway)*length,cos(sway*1.3)*0.25*s);
    if(part==4u){return surface(anchor,palette(0),0);}
    let size=select(0.28+g.w*0.18,0.62+g.w*0.22,slot%6u==0u)*s;
    if(part==0u){return surface(head+rotate(jewel(v,size),uniforms.time*(0.25+g.w)*alive()),palette(f32(1u+slot%3u)),0.65);}
    if(part==1u){return surface(bridge(v,anchor,head,0.018*s),mix(palette(0),palette(3),0.25),0.2);}
    if(part==2u){return surface(head+ring(v,size*1.25,0.035*s),palette(3),0.6);}
    return surface(head+sphere(v,vec3f(0.075*s)),uniforms.themeFifth.rgb,0.9);
  }
  if(i<336u){
    let slot=i-304u;let panel=slot%glassPanels();let side=select(-1.0,1.0,(slot/glassPanels())%2u==0u);
    let base=panelBase(panel)+rotate(vec3f(side*2.05*s,0,0),panelHeading(panel));
    let height=(5.0+gene(720u+panel).w*1.7)*s;
    if(part==4u){return surface(base,palette(0),0);}
    if(part==0u){return surface(base+cylinder(v,0.15*s,height),mix(palette(0),palette(3),0.18),0.22);}
    if(part==1u){return surface(base+box(v,vec3f(0.65*s,0.25*s,0.65*s)),palette(0),0.18);}
    if(part==2u){return surface(base+vec3f(0,height-0.12*s,0)+ring(v,0.32*s,0.08*s),palette(3),0.3);}
    return surface(base+vec3f(0,height+0.28*s,0)+jewel(v,0.24*s),palette(3),0.5);
  }
  if(i<360u){
    let a=uniforms.time*(0.12+g.w*0.08)*alive()+g.w*PI*2.0;
    let r=uniforms.gridSize*(0.32+g.x*0.12);let p=pavilionCenter()+vec3f(cos(a)*r,(1.3+g.z*1.3+sin(a*2.0)*0.3)*s,sin(a)*r);
    if(part==4u){return surface(p,palette(0),0);}
    if(part==0u){return surface(p+rotate(jewel(v,(0.18+g.w*0.14)*s),a*2.0),palette(f32(1u+i%3u)),0.55);}
    return surface(p,palette(0),0);
  }
  let a=f32(i-360u)*PI/12.0+uniforms.time*0.28*alive();let r=uniforms.gridSize*0.39;
  let c=pavilionCenter()+vec3f(cos(a)*r,0.06,sin(a)*r);
  if(part==4u){return surface(c,palette(0),0);}
  if(part==0u){return surface(c+rotate(box(v,vec3f(0.85*s,0.008*s,0.22*s)),a),mix(palette(f32(1u+i%3u)),uniforms.themeFifth.rgb,0.35),0.8);}
  return surface(c,palette(0),0);
}
`,
  3,
);
