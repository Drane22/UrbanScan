import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const CONSTELLATION_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn constellationClusters()->u32 {return 5u+u32(gene(700u).w*5.0);}
fn constellationNodes()->u32 {return 7u+u32(gene(701u).w*4.0);}
fn worldCount()->u32 {return constellationClusters()*constellationNodes();}
fn worldAmbientCount()->u32 {return 320u;}
// Five graph families, each with a seeded pose, elevation, size and location.
fn worldAnchor(i:u32)->vec3f {
  let count=constellationNodes();let cluster=i/count;let node=i%count;
  let dna=gene(710u+cluster);let variant=u32(gene(702u).w*4.0);
  let t=f32(node)/f32(count-1u);let a=t*PI*1.7;
  var p=vec3f((t-0.5)*4.4,sin(t*PI)*1.1,0);
  let family=(u32(dna.w*5.0)+variant)%5u;
  if(family==0u){p=vec3f((t-0.5)*4.3,0.45*sin(t*7.0),select(-1.0,1.0,node%2u==0u)*t*1.65);}
  if(family==1u){p=vec3f(cos(a)*2.0,0.8*sin(a),sin(a)*1.6);}
  if(family==2u){p=vec3f((t-0.5)*4.8,sin(t*PI*2.0)*0.8,sin(t*PI*2.5)*1.1);}
  if(family==3u){let r=select(1.9,0.65,node%2u==0u);p=vec3f(cos(a)*r,sin(a)*0.9,sin(a)*r);}
  if(family==4u){p=vec3f(cos(a*1.4)*(0.3+t*1.8),t*1.7,sin(a*1.4)*(0.3+t*1.8));}
  p=rotate(p,dna.w*PI*2.0)*(0.8+dna.z*0.32);
  var center=squarePatch(cluster,3u)*0.80;
  // Ring, staggered rows and diagonal rivers have different silhouettes.
  if(variant==1u){let angle=f32(cluster)/f32(constellationClusters())*PI*2.0+gene(703u).w*PI;center=vec3f(cos(angle),0,sin(angle))*uniforms.gridSize*(0.21+0.10*dna.w);}
  if(variant==2u){center=vec3f((f32(cluster%2u)-0.5)*0.49,0,(f32(cluster/2u)/4.0-0.4)*0.76)*uniforms.gridSize;}
  if(variant==3u){let u=f32(cluster)/f32(constellationClusters()-1u)-0.5;center=vec3f(u*0.76,0,sin(u*5.0)*0.26)*uniforms.gridSize;}
  center+=vec3f(dna.x,0,dna.y)*uniforms.gridSize*0.11;
  center.y=(2.0+dna.w*4.4+gene(704u).w*1.5)*uniforms.gridSize/25.0;
  return center+p*uniforms.gridSize/25.0;
}
fn constellationParent(i:u32)->u32 {
  let count=constellationNodes();let node=i%count;
  let family=(u32(gene(710u+i/count).w*5.0)+u32(gene(702u).w*4.0))%5u;
  if(node==0u){return i;}
  if(family==0u || family==3u){return i-node+(node-1u)/2u;}
  return i-1u;
}
fn starGem(v:u32,r:f32)->vec3f {
  let p=sphere(v,vec3f(1));return p/max(abs(p.x)+abs(p.y)+abs(p.z),0.001)*vec3f(r,r*1.65,r);
}
fn worldFoundation(v:u32)->Surface {return tile(v,palette(0)*0.8,mix(palette(0),palette(2),0.16),0.19,5.0);}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let g=gene(i);let s=uniforms.gridSize/25.0;
  let color=mix(palette(f32(1u+(i/constellationNodes())%3u)),uniforms.themeFifth.rgb,0.35);
  let pulse=1.0+sin(uniforms.time*(0.8+g.w)+g.w*19.0)*0.12*alive();
  let radius=(0.26+g.w*0.24)*s*pulse;
  if(part==0u){return surface(c+starGem(v,radius),color,0.95);}
  if(part==1u){
    if(i%constellationNodes()==0u){return surface(c,color,0);}
    return surface(bridge(v,c,worldAnchor(constellationParent(i)),0.042*s),mix(color,palette(1),0.5),0.85);
  }
  if(part==2u){
    let ray=select(vec3f(radius*1.55,0,0),vec3f(0,0,radius*1.55),v>=192u);
    return surface(bridge(v,c-ray,c+ray,0.025*s),uniforms.themeFifth.rgb,1.0);
  }
  let next=worldAnchor(constellationParent(i));
  let travel=fract(uniforms.time*(0.24+g.w*0.18)+g.w)*alive();
  let path=mix(c,next,travel)+vec3f(0,0.055*s,0);
  return surface(path+starGem(v,0.11*s),uniforms.themeFifth.rgb,1.0);
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
  let g=gene(i+100u);let s=uniforms.gridSize/25.0;let ground=squarePatch(i,16u);
  if(part==4u){return surface(ground,palette(0),0);}
  if(i<256u){
    if(part==0u){return surface(ground+starGem(v,(0.05+g.w*0.10)*s),mix(palette(1),palette(3),g.w),0.65);}
    return surface(ground,palette(0),0);
  }
  if(i<304u){
    let a=uniforms.time*0.22+g.w*PI*2.0;
    let p=vec3f(g.x*uniforms.gridSize, (1.1+g.z*2.7+sin(a)*0.35)*s,g.y*uniforms.gridSize);
    if(part==0u){return surface(p+starGem(v,(0.07+g.w*0.07)*s),mix(palette(3),uniforms.themeFifth.rgb,0.6),0.9);}
    return surface(p,palette(0),0);
  }
  let cycle=fract(uniforms.time*(0.08+g.w*0.04)+g.w);let envelope=sin(cycle*PI);
  let path=rotate(vec3f((cycle-0.5)*uniforms.gridSize*0.85,(4.0+g.z*2.0)*s,g.y*uniforms.gridSize*0.75),gene(707u).w*PI);
  let tail=rotate(vec3f(-1.7*envelope*s,0.25*envelope*s,0),gene(707u).w*PI);
  if(part==0u){return surface(path+starGem(v,0.18*envelope*s),uniforms.themeFifth.rgb,1);}
  if(part==1u){return surface(bridge(v,path,path+tail,0.04*envelope*s),palette(3),0.9);}
  return surface(path,palette(0),0);
}
`,
  5,
);
