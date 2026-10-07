import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

// Preserve the stored form key while generating a different fantasy system per link.
export const CONSTELLATION_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn planetCount()->u32 {return 5u+u32(worldDNA(5u).w*5.0);}
fn worldCount()->u32 {return planetCount()+1u;}
fn worldAmbientCount()->u32 {return 384u;}
fn solarCenter()->vec3f {return vec3f(worldDNA(6u).x*0.10,0,worldDNA(6u).y*0.10)*uniforms.gridSize;}
fn orbitRadius(i:u32)->f32 {return uniforms.gridSize*(0.13+f32(i)/f32(max(planetCount()-1u,1u))*0.23);}
fn orbitPoint(i:u32,a:f32)->vec3f {
  let g=gene(710u+i);let s=uniforms.gridSize/25.0;
  let p=vec3f(cos(a)*orbitRadius(i),0,sin(a)*orbitRadius(i)*(0.78+g.w*0.20));
  return solarCenter()+rotate(p,worldDNA(7u).w*PI+g.x*0.6)+vec3f(0,(2.3+g.w*1.9+sin(a)*g.x*1.1)*s,0);
}
fn planetAngle(i:u32)->f32 {let g=gene(720u+i);return g.w*PI*2.0+uniforms.time*(0.18+g.w*0.15)/(1.0+f32(i)*0.32)*alive();}
fn planetRadius(i:u32)->f32 {
  return (0.65+gene(730u+i).w*0.95+select(0.0,0.45,i==u32(worldDNA(8u).w*f32(planetCount()))))*uniforms.gridSize/25.0;
}
fn worldAnchor(i:u32)->vec3f {
  if(i==0u){return solarCenter()+vec3f(0,3.5*uniforms.gridSize/25.0,0);}
  return orbitPoint(i-1u,planetAngle(i-1u));
}
fn starGem(v:u32,r:f32)->vec3f {let p=sphere(v,vec3f(1));return p/max(abs(p.x)+abs(p.y)+abs(p.z),0.001)*vec3f(r,r*1.6,r);}
fn tiltedRing(v:u32,r:f32,width:f32,tilt:f32)->vec3f {
  let p=ring(v,r,width);return vec3f(p.x,p.y*cos(tilt)-p.z*sin(tilt),p.y*sin(tilt)+p.z*cos(tilt));
}
fn worldFoundation(v:u32)->Surface {return tile(v,palette(0)*0.62,mix(palette(0),palette(2),0.24),0.85,5.0);}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let s=uniforms.gridSize/25.0;
  if(i==0u){
    let radius=(1.55+worldDNA(9u).w*0.65)*s;let p=sphere(v,vec3f(radius));
    let heat=sin(p.x*5.2+p.y*3.8+uniforms.time*1.1)*0.11*alive();let fire=mix(palette(3),palette(1),0.15+heat);
    if(part==0u){return surface(c+p*(1.0+heat*0.12),fire*1.10,0.92);}
    if(part==1u){return surface(c+tiltedRing(v,radius*1.18,0.07*s,worldDNA(10u).w*PI),fire,0.9);}
    let uv=quad(v);let a=(f32(v/6u)+uv.x)*PI/32.0;
    let flare=0.2+0.35*pow(max(sin(a*7.0+uniforms.time*0.8),0.0),3.0)*alive();
    let ray=vec3f(cos(a),sin(a),0)*radius*(1.02+uv.y*flare);
    if(part==2u){return surface(c+rotate(ray,worldDNA(11u).w*PI),mix(fire,uniforms.themeFifth.rgb,0.35),0.95);}
    return surface(c+rotate(vec3f(ray.x,0,ray.y),uniforms.time*0.08*alive()),fire,0.9);
  }
  let index=i-1u;let g=gene(740u+index);let radius=planetRadius(index);let kind=u32(g.w*4.0);
  let local=rotate(sphere(v,vec3f(radius)),uniforms.time*(0.18+g.w*0.25)*alive());
  let base=palette(f32(1u+index%3u));let alternate=palette(f32(1u+(index+1u)%3u));
  let bands=sin(local.y/radius*(8.0+g.z*9.0)+sin(local.x/radius*4.0)*0.9);
  let islands=sin(local.x/radius*5.0+g.w*19.0)*cos(local.z/radius*4.0+local.y/radius*3.0);
  var pigment=mix(base,alternate,smoothstep(-0.2,0.55,bands)*0.52);
  if(kind==0u){pigment=mix(base,alternate,smoothstep(0.05,0.25,islands)*0.70);}
  if(kind==2u){pigment=mix(base,uniforms.themeFifth.rgb,smoothstep(0.64,0.85,abs(local.y)/radius)*0.75);}
  if(kind==3u){pigment=base*(0.68+0.32*abs(islands));}
  if(part==0u){return surface(c+local,pigment,0.12);}
  let ringed=kind==1u || index==u32(worldDNA(12u).w*f32(planetCount()));
  let tilt=0.2+g.x*1.8+sin(uniforms.time*0.2+g.w*9.0)*0.06*alive();
  if(part==1u){
    if(ringed){return surface(c+tiltedRing(v,radius*1.55,0.16*s,tilt),mix(alternate,uniforms.themeFifth.rgb,0.28),0.45);}
    let a=uniforms.time*(0.75+g.w)*alive()+g.w*6.28;
    return surface(c+vec3f(cos(a),sin(a)*0.35,sin(a))*radius*1.6+sphere(v,vec3f(0.24*s)),alternate,0.18);
  }
  if(part==2u){
    let a=-uniforms.time*(0.48+g.w)*alive()+g.w*12.0;
    let moon=c+vec3f(cos(a),0.4+sin(a)*0.45,sin(a))*radius*1.95;
    return surface(moon+sphere(v,vec3f((0.16+g.w*0.16)*s)),mix(alternate,uniforms.themeFifth.rgb,0.40),0.18);
  }
  if(ringed){return surface(c+tiltedRing(v,radius*1.83,0.05*s,tilt),base,0.4);}
  return surface(c,pigment,0);
}
fn rocketShape(v:u32,part:u32,flame:f32)->vec3f {
  if(part==0u){let p=cylinder(v,0.30,1.45);return vec3f(p.x,p.z,p.y-0.60);}
  if(part==1u){return sphere(v,vec3f(0.32,0.32,0.52))+vec3f(0,0,0.9);}
  if(part==2u){
    let p=array<vec3f,12>(vec3f(-0.26,0,-0.55),vec3f(-0.83,0,-0.86),vec3f(-0.26,0,0.05),vec3f(0.26,0,-0.55),vec3f(0.26,0,0.05),vec3f(0.83,0,-0.86),vec3f(0,-0.26,-0.55),vec3f(0,-0.83,-0.86),vec3f(0,-0.26,0.05),vec3f(0,0.26,-0.55),vec3f(0,0.26,0.05),vec3f(0,0.83,-0.86));
    return p[v%12u];
  }
  return sphere(v,vec3f(0.20,0.20,0.65*flame))+vec3f(0,0,-0.90-0.45*flame);
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
  let g=gene(i+100u);let s=uniforms.gridSize/25.0;let ground=squarePatch(i,16u);
  if(part==4u){return surface(ground,palette(0),0);}
  if(i<256u){
    let pulse=0.75+sin(uniforms.time*(0.8+g.w)+g.w*24.0)*0.25*alive();
    if(part==0u){return surface(ground+starGem(v,(0.035+g.w*0.055)*s*pulse),mix(palette(2),uniforms.themeFifth.rgb,0.58),0.8);}
    return surface(ground,palette(0),0);
  }
  if(i<266u){
    let index=i-256u;if(index>=planetCount()){return surface(ground,palette(0),0);}
    let uv=quad(v);let a=(f32(v/6u)+uv.x)*PI/32.0;let p=orbitPoint(index,a);
    let radial=normalize(p.xz-solarCenter().xz);
    if(part==0u){return surface(p+vec3f(radial.x,0,radial.y)*(uv.y-0.5)*0.033*s,mix(palette(2),uniforms.themeFifth.rgb,0.24),0.35);}
    return surface(p,palette(0),0);
  }
  if(i<320u){
    let a=g.w*PI*2.0+uniforms.time*(0.07+g.z*0.035)*alive();let r=uniforms.gridSize*(0.28+g.x*0.13);
    let p=solarCenter()+rotate(vec3f(cos(a)*r,(2.0+g.y)*s,sin(a)*r*0.86),worldDNA(7u).w*PI);
    if(part==0u){return surface(p+rotate(starGem(v,(0.10+g.w*0.13)*s),uniforms.time*g.z*alive()),mix(palette(2),palette(3),g.w)*0.7,0.1);}
    return surface(p,palette(0),0);
  }
  if(i<344u){
    let p=vec3f(g.x*uniforms.gridSize,(1.0+g.z*4.0)*s,g.y*uniforms.gridSize);
    let pulse=0.7+0.3*sin(uniforms.time*(0.9+g.w)+g.w*19.0)*alive();
    if(part==0u){return surface(p+starGem(v,(0.07+g.w*0.12)*s*pulse),uniforms.themeFifth.rgb,0.95);}
    return surface(p,palette(0),0);
  }
  if(i<350u){
    let cycle=fract(uniforms.time/(9.0+g.w*10.0)+g.w);let flight=clamp(cycle/0.18,0.0,1.0);
    let envelope=sin(flight*PI)*select(0.0,1.0,cycle<0.18);let angle=worldDNA(13u).w*PI+g.x;
    let p=rotate(vec3f((flight-0.5)*uniforms.gridSize*0.84,(5.0+g.z)*s,g.y*uniforms.gridSize*0.55),angle);
    if(part==0u){return surface(p+starGem(v,0.20*s*envelope),uniforms.themeFifth.rgb,1);}
    if(part==1u){return surface(bridge(v,p,p+rotate(vec3f(-2.7*s*envelope,0.3*s*envelope,0),angle),0.04*s*envelope),palette(3),0.95);}
    return surface(p,palette(0),0);
  }
  if(i<353u){
    let cycle=fract(uniforms.time/(15.0+g.w*9.0)+g.w);let flight=clamp(cycle/0.28,0.0,1.0);
    let visibility=smoothstep(0.0,0.07,flight)*(1.0-smoothstep(0.90,1.0,flight));let heading=worldDNA(14u).w*PI+g.x*0.8;
    let p=rotate(vec3f(g.y*uniforms.gridSize*0.5,(5.0+g.z*1.2+sin(flight*PI))*s,(flight-0.5)*uniforms.gridSize*0.8),heading);
    let shape=rotate(rocketShape(v,part,0.85+sin(uniforms.time*17.0+g.w)*0.20)*s*1.8*visibility,heading);
    let color=select(select(uniforms.themeFifth.rgb,palette(1),part==1u || part==2u),palette(3)*1.3,part==3u);
    return surface(p+shape,color,select(0.3,0.95,part==3u));
  }
  let a=uniforms.time*0.11*alive()+g.w*PI*2.0;let p=vec3f(g.x*uniforms.gridSize,(1.2+sin(a)*0.3)*s,g.y*uniforms.gridSize);
  if(part==0u){return surface(p+starGem(v,(0.04+g.w*0.06)*s),mix(palette(1),palette(3),g.w),0.75);}
  return surface(p,palette(0),0);
}
`,
  5,
);
