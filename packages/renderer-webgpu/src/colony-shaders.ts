import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const COLONY_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn colonyHero(i:u32)->bool {
  let width=colonyWidth();let x=i%width;let z=i/width;
  return x>0u && x<width-1u && z>0u && z<width-1u && (i+u32(worldDNA(7u).w*17.0))%(3u+sceneVariant(4u))==0u;
}
fn colonyParent(i:u32)->u32 {
  if(i==0u){return 0u;}
  let width=colonyWidth();
  if(sceneVariant(3u)==1u){return u32(gene(i).w*f32(i));}
  return select(i-1u,i-width,i%width==0u && i>=width);
}
fn worldAnchor(i:u32)->vec3f {
  let g=gene(i);
  let p=squarePatch(i,colonyWidth())+vec3f(g.x,0,g.y)*uniforms.gridSize*0.04;
  return seededFrame(p+vec3f(0,0.08,0));
}
fn colonyRadius(i:u32)->f32 {return select(0.85+gene(i).w*0.7,2.3+worldDNA(i%8u).w*1.2,colonyHero(i))*uniforms.gridSize/25.0;}
fn worldCutout(p:vec3f)->f32 {
  var opening=0.0;
  for(var i=0u;i<worldCount();i++){
    if(colonyHero(i)){continue;}
    let r=length(p.xz-worldAnchor(i).xz)/colonyRadius(i);
    opening=max(opening,1.0-r/0.74);
  }
  return opening;
}
fn worldFoundation(v:u32)->Surface {
  let earth=mix(palette(2),uniforms.themeFifth.rgb,0.25);
  return tile(v,earth,mix(palette(0),palette(2),0.48),1.1,0.0);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let g=gene(i);let s=colonyRadius(i);
  let earth=mix(palette(2),uniforms.themeFifth.rgb,0.14);
  if(part==0u){
    let d=disk(v);let r=length(d);
    let rim=exp(-pow((r-0.76)*7.0,2.0));
    let hill=pow(max(0.0,1.0-r),0.75)*s*(0.75+worldDNA(8u).w*0.8);
    let basin=-0.66*pow(max(0.0,1.0-r),0.4)+rim*0.28;
    let h=select(basin,0.02+rim*s*0.27+hill,colonyHero(i));
    let p=vec3f(d.x*s,h,d.y*s);
    let pigment=mix(palette(0)*0.6,earth,smoothstep(0.37,0.75,r));
    return surface(c+p,pigment,0.0);
  }
  if(part==1u){
    let next=worldAnchor(colonyParent(i));
    let p=bridge(v,c+vec3f(0,0.03,0),next+vec3f(0,0.03,0),0.32);
    return surface(p,mix(palette(0),palette(2),0.22),0.0);
  }
  if(part==2u){
    let p=sphere(v,vec3f(s*0.21,s*0.20,s*0.21))+c+vec3f(0,select(-0.33,s*0.30,colonyHero(i)),0);
    return surface(p,palette(select(1.0,3.0,i%3u==0u)),0.10);
  }
  let stem=blade(v,s*1.1,0.20,g.w);
  return surface(c+rotate(stem,g.w*PI*2.0)+vec3f(s*0.77,0,0),palette(3),0.0);
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
  let g=gene(i+50u);var ground=squarePatch(i,18u);
  if(part==4u){return surface(ground,palette(0),0.0);}
  if(i<324u){
    let meadow=0.5+0.5*sin(ground.x*(0.25+worldDNA(8u).w*0.45)+sin(ground.z*0.37+worldDNA(9u).w*6.28)*2.0);
    let h=(0.23+g.w*0.9)*mix(0.7,2.3,meadow)*uniforms.gridSize/25.0;
    let foliage=mix(palette(3),mix(palette(2),uniforms.themeFifth.rgb,0.5),meadow*0.64);
    if(part<3u){return surface(ground+rotate(tuft(v,h,0.09+g.w*0.12,g.w+f32(part)),g.w*6.28+f32(part)*2.1),foliage,0.0);}
    if(i%9u==0u){return surface(ground+vec3f(0,h*0.85,0)+sphere(v,vec3f(0.12,0.18,0.12)*g.z),palette(1),0.12);}
    let root=bridge(v,ground,ground+vec3f(0.7,0.05,0.3)*g.z,0.055);
    return surface(root,mix(palette(0),palette(2),0.48),0.0);
  }
  // Articulated workers follow the same connected chamber graph as the tunnels.
  let node=(i-324u)%(worldCount()-1u)+1u;let a=worldAnchor(node);let b=worldAnchor(colonyParent(node));
  let t=0.5+0.5*sin(uniforms.time*(0.32+g.w*0.20)+g.w*29.0);
  let antScale=(1.9+g.w*0.7)*uniforms.gridSize/25.0;
  let c=mix(a,b,t)+vec3f(0,0.24*antScale,0);let forward=select(0.0,PI,cos(uniforms.time*(0.32+g.w*0.20)+g.w*29.0)<0.0);let heading=atan2(b.z-a.z,b.x-a.x)+forward;
  let dark=mix(palette(0),palette(1),0.16);
  if(part<2u){
    let body=sphere(v,select(vec3f(0.25,0.15,0.16),vec3f(0.13,0.12,0.13),part==1u));
    return surface(c+rotate((body+vec3f(select(-0.15,0.22,part==1u),0,0))*antScale,heading),dark,0.1);
  }
  if(part==2u){
    let uv=quad(v);let leg=v/64u%6u;let side=select(-1.0,1.0,leg%2u==1u);
    let gait=sin(uniforms.time*11.0+f32(leg)*PI+g.w*9.0)*0.08*alive();
    let p=vec3f((f32(leg/2u)-1.0)*0.16+gait*uv.y,-0.22*uv.y,side*uv.y*0.32);
    return surface(c+rotate((p+vec3f(0.03*(uv.x-0.5),0,0))*antScale,heading),dark,0.0);
  }
  return surface(c+rotate(vec3f(0.39,0.13,0)*antScale,heading)+sphere(v,vec3f(0.12*antScale)),palette(1),0.15);
}
`,
  0,
  true,
);
