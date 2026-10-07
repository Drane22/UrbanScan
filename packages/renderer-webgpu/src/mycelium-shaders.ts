import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const MYCELIUM_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn pitCenter(i:u32)->vec3f {
 let positions=array<vec2f,3>(vec2f(-0.26,0.24),vec2f(0.23,0.18),vec2f(0.03,-0.32));
 let p=positions[i%3u]*uniforms.gridSize;
 return vec3f(p.x,0,p.y);
}
fn worldCutout(p:vec3f)->f32 {
 var opening=0.0;
 for(var i=0u;i<3u;i++){opening=max(opening,1.0-smoothstep(uniforms.gridSize*0.063,uniforms.gridSize*0.073,distance(p.xz,pitCenter(i).xz)));}
 return opening;
}
fn worldAnchor(i:u32)->vec3f {
 let g=gene(i);let s=uniforms.gridSize/25.0;
 if(i<4u){
  let corners=array<vec2f,4>(vec2f(-0.21,-0.20),vec2f(0.25,-0.14),vec2f(-0.16,0.18),vec2f(0.25,0.27));
  let p=(corners[i]+worldDNA(7u+i).xy*0.17)*uniforms.gridSize;
  return vec3f(p.x,0.06,p.y);
 }
 var p=squarePatch(i,fungusWidth());let style=sceneVariant(3u);
 if(style==1u){p.x+=sin(p.z*0.4+worldDNA(8u).w*6.28)*uniforms.gridSize*0.06;}
 if(style==2u){p.z+=sin(p.x*0.45+worldDNA(9u).w*6.28)*uniforms.gridSize*0.06;}
 for(var pit=0u;pit<3u;pit++){let d=p.xz-pitCenter(pit).xz;if(length(d)<uniforms.gridSize*0.085){let pushed=pitCenter(pit).xz+normalize(d+vec2f(0.001))*uniforms.gridSize*0.092;p.x=pushed.x;p.z=pushed.y;}}
 return p+vec3f(g.x,0.04,g.y)*s;
}
fn worldFoundation(v:u32)->Surface {
 return tile(v,mix(palette(0),palette(3),0.24),mix(palette(0),palette(2),0.12),2.8*uniforms.gridSize/25.0,4.0);
}
fn mushroomSize(i:u32)->f32 {
 let g=gene(i);return select(0.38+pow(g.w,1.7)*1.05,2.0+g.w*1.0,i<4u)*uniforms.gridSize/25.0;
}
fn mushroomHeight(i:u32)->f32 {
 return (0.95+gene(i+10u).w*1.6)*mushroomSize(i);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
 let c=worldAnchor(i);let g=gene(i);let size=mushroomSize(i);let height=mushroomHeight(i);
 let hero=i<4u;let species=(u32(gene(i+190u).w*4.0)+materialStyle())%4u;
 let time=uniforms.time*motionTempo();let sway=(sin(time*0.7+g.w*19.0)*0.10+sin(time*1.13+g.w*7.0)*0.035)*alive();
 let breath=1.0+sin(time*0.8+g.w*11.0)*select(0.025,0.065,hero)*alive();
 if(part==0u){
  let d=disk(v);let r=length(d);var dome=sqrt(max(0.0,1.0-r*r))*0.48;
  if(species==1u){dome=pow(1.0-r,0.65)*1.25;}
  if(species==2u){dome=(0.18+sin(r*PI)*0.22);}
  if(species==3u){dome=0.14+pow(r,3.0)*0.35;}
  let p=vec3f(d.x*size*breath+sway*height,height+dome*size,d.y*size*breath);
  let spots=step(0.78,sin(d.x*12.0+g.w*8.0)*cos(d.y*15.0-g.w*3.0));
  let rim=smoothstep(0.78,0.98,r);
  var cap=palette(2)*(0.88+g.w*0.18);
  if(materialStyle()==2u){cap=mix(cap,uniforms.themeFifth.rgb,0.48);}
  cap=mix(cap,palette(1),spots*0.22+rim*select(0.12,0.42,materialStyle()==0u));
  return surface(c+p,cap,select(0.08,0.42,materialStyle()==0u)+rim*0.10);
 }
 if(part==1u){
  var p=cylinder(v,size*0.13,height);p.x+=sway*p.y*p.y/max(height,0.001);
  return surface(c+p,mix(uniforms.themeFifth.rgb,palette(2),0.10),0.02);
 }
 if(part==2u){
  let d=disk(v);let r=length(d);let ridges=0.83+sin(atan2(d.y,d.x)*32.0)*0.14;
  let p=vec3f(d.x*size*breath+sway*height,height-0.06+0.10*(1.0-r),d.y*size*breath);
  return surface(c+p,mix(uniforms.themeFifth.rgb,palette(1),0.23)*ridges,select(0.08,0.40,materialStyle()==0u));
 }
 // Pulses travel along branching hyphae from each colony into the soil.
 let prior=worldAnchor(select(i-1u,0u,i==0u));let pulse=pow(max(sin(time*1.3-distance(c,prior)*0.6+g.w*6.28),0.0),5.0)*alive();
 return surface(bridge(v,c+vec3f(0,0.05,0),prior+vec3f(0,0.05,0),0.055*uniforms.gridSize/25.0),mix(palette(0),palette(1),0.35+pulse*0.5),pulse*0.8);
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
 let g=gene(i+90u);let s=uniforms.gridSize/25.0;let time=uniforms.time*motionTempo();
 var c=squarePatch(i,16u);
 if(i<240u){
  if(part==4u){return surface(c,palette(0),0);}
  // Ferns, moss hummocks and tiny stones fill every part of the square.
  for(var pit=0u;pit<3u;pit++){if(distance(c.xz,pitCenter(pit).xz)<uniforms.gridSize*0.079){return surface(c,palette(0),0);}}
  if(part<2u){return surface(c+rotate(tuft(v,(0.35+g.z*0.65)*s,0.16+g.w*0.09,g.w+f32(part)),f32(part)*2.1+g.w*6.28),mix(palette(3),palette(0),0.20+g.w*0.10),0);}
  if(part==2u){return surface(c+sphere(v,vec3f(0.24,0.12,0.24)*s),mix(palette(0),palette(3),0.25),0);}
  return surface(c,palette(0),0);
 }
 if(i<256u){
  let slot=i-240u;c=worldAnchor(slot*3u+15u);let a=g.w*PI;
  let end=c+rotate(vec3f(2.4+g.z,0.35,0)*s,a);let radius=(0.35+g.w*0.2)*s;
  if(part==4u){return surface(c,palette(0),0);}
  if(part==0u){return surface(bridge(v,c+vec3f(0,radius,0),end,radius),mix(palette(0),palette(2),0.20),0);}
  let spot=mix(c,end,0.18+f32(part-1u)*0.25)+vec3f(0,radius*0.9,0);
  let d=disk(v);let p=rotate(vec3f(d.x*0.9*s,0.25*s*(1.0-length(d)),d.y*0.7*s),a);
  return surface(spot+p,mix(palette(2),palette(1),0.18+f32(part)*0.04),0.15);
 }
 if(i<288u){
  c=worldAnchor((i-256u)%4u);let cycle=fract(time*(0.065+g.w*0.025)+g.w);
  let puff=sin(cycle*PI);let p=c+vec3f(sin(time*0.4+g.w*19.0)*1.5,1.2+cycle*5.5,cos(time*0.35+g.w*7.0)*1.4)*s;
  if(part==4u){return surface(c,palette(0),0);}
  if(part==0u){return surface(p+sphere(v,vec3f((0.22+g.w*0.12)*puff*s)),mix(palette(1),uniforms.themeFifth.rgb,0.32),0.72);}
  if(part==1u && materialStyle()==2u){return surface(p+ring(v,0.3*puff*s,0.035*s),palette(3),0.65);}
  return surface(p,palette(0),0);
 }
 if(i<312u){
  let slot=i-288u;let pit=slot/8u;let root=slot%8u;c=pitCenter(pit);
  let a=f32(root)*PI*0.25+worldDNA(16u+pit).w*PI;let radius=uniforms.gridSize*0.090;
  let center=c+vec3f(0,-1.8*s,0);let end=c+vec3f(cos(a)*radius,-0.25*s-g.w*1.15*s,sin(a)*radius);
  if(part==4u){return surface(center,palette(0),0);}
  if(part==0u && root==0u){
    let d=disk(v);let uv=quad(v);let band=v/96u;let radius=uniforms.gridSize*0.073;
    var p=center+vec3f(d.x*radius,0,d.y*radius);
    if(band==3u){let edge=normalize(d+vec2f(0.000001))*radius;p=c+vec3f(edge.x,-1.8*s*(1.0-uv.y),edge.y);}
    return surface(p,mix(palette(0),palette(3),0.12),0);
  }
  if(part==1u){return surface(bridge(v,center,end,0.10*s),mix(palette(1),uniforms.themeFifth.rgb,0.40),0.32);}
  if(part==2u){let t=fract(time*0.16+g.w);return surface(mix(center,end,t)+sphere(v,vec3f(0.20*s)),palette(1),0.95);}
  if(part==3u){let fork=mix(center,end,0.50);return surface(bridge(v,fork,end+vec3f(g.x,0.05,g.y)*s,0.045*s),palette(3),0.30);}
  return surface(center,palette(0),0);
 }
 if(i<328u){
  let a=f32(i-312u)/16.0*PI*2.0;let radius=uniforms.gridSize*0.43;c=vec3f(cos(a)*radius,0.04,sin(a)*radius);
  if(part==4u){return surface(c,palette(0),0);}
  let h=(0.7+g.w)*s;let sway=sin(time*0.7+a)*0.15*alive();
  if(part==0u){return surface(c+vec3f(sway,h,0)+sphere(v,vec3f(0.32,0.20,0.32)*s),palette(2),0.35);}
  if(part==1u){return surface(c+bridge(v,vec3f(0),vec3f(sway,h,0),0.05*s),mix(uniforms.themeFifth.rgb,palette(3),0.15),0);}
  return surface(c,palette(0),0);
 }
 if(i<352u){
  let slot=i-328u;let hero=slot/6u;c=worldAnchor(hero);
  let cycle=fract(time*0.075+worldDNA(20u+hero).w);let release=smoothstep(0.04,0.13,cycle)*(1.0-smoothstep(0.60,0.85,cycle));
  let angle=f32(slot%6u)*PI/3.0+g.w;let p=c+vec3f(cos(angle)*cycle*2.2,mushroomHeight(hero)/s+0.7+cycle*3.6,sin(angle)*cycle*2.2)*s;
  if(part==4u){return surface(c+vec3f(0,mushroomHeight(hero),0),palette(0),0);}
  if(part==0u){return surface(p+sphere(v,vec3f(0.30*release*s)),mix(palette(1),uniforms.themeFifth.rgb,0.35),0.65);}
  return surface(p,palette(0),0);
 }
 let a=time*(0.11+g.w*0.065)+g.w*6.28;let path=vec3f(cos(a),0,sin(a))*uniforms.gridSize*(0.20+g.w*0.18)+vec3f(0,0.55*s,0);
 if(part==4u){return surface(path,palette(0),0);}
 if(part==0u){return surface(path+rotate(sphere(v,vec3f(0.60,0.28,0.85)*s),a),mix(palette(2),palette(1),0.20),0.25);}
 if(part==1u){return surface(path+rotate(sphere(v,vec3f(0.26,0.20,0.28)*s)+vec3f(0,0,0.86*s),a),palette(0),0.02);}
 if(part==2u){
  let leg=v/64u;let uv=quad(v%64u);let side=select(-1.0,1.0,leg%2u==0u);let z=(f32(leg/2u)-1.0)*0.43*s;
  let step=sin(time*4.2+f32(leg)*PI)*0.15*alive();let start=path+rotate(vec3f(side*0.34*s,0,z),a);
  let end=path+rotate(vec3f(side*0.88*s,-0.35*s+max(step,0.0)*s,z+step*s),a);
  return surface(mix(start,end,uv.x)+vec3f(0,(uv.y-0.5)*0.075*s,0),palette(0),0);
 }
 return surface(path,palette(0),0);
}
`,
  4,
  true,
);
