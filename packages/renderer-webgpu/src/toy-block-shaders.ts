import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const TOY_BLOCK_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn toyDistrict(i:u32)->vec3f {
  let g=gene(i+270u);let s=uniforms.gridSize/25.0;
  if(sceneVariant(3u)==1u){return spiral(i,8.0,uniforms.gridSize*0.22)+vec3f(g.x,0,g.y)*s;}
  let corners=array<vec2f,4>(vec2f(-3.8,-3.8),vec2f(3.8,-3.8),vec2f(-3.8,3.8),vec2f(3.8,3.8));
  let p=(corners[i%4u]+g.xy*1.6)*s;return vec3f(p.x,0,p.y);
}
fn towerHeight(i:u32)->f32 {
  if(sceneVariant(3u)==0u){return 5.75;}
  if(sceneVariant(3u)==1u){return 5.75*(0.55+gene(i+280u).w*0.65);}
  return 3.9;
}
fn towerCenter(i:u32)->vec3f {
  if(sceneVariant(3u)>0u){return toyDistrict(i);}
  let corners=array<vec2f,4>(vec2f(-4.6,-4.6),vec2f(4.6,-4.6),vec2f(-4.6,4.6),vec2f(4.6,4.6));
  let p=corners[i%4u]*uniforms.gridSize/25.0;return vec3f(p.x,0,p.y);
}
fn worldAnchor(i:u32)->vec3f {
  let s=uniforms.gridSize/25.0;
  let style=sceneVariant(3u);
  if(style==1u && i<128u){
    let district=i/16u;let slot=i%16u;
    return toyDistrict(district)+vec3f((f32(slot%2u)-0.5)*1.13,f32(slot/2u)*0.72*(0.55+gene(district+280u).w*0.65),0)*s;
  }
  if(style==2u && i<128u){
    let slot=i%32u;let steps=f32((slot/4u)%4u);
    return toyDistrict(i/32u)+rotate(vec3f((f32(slot%4u)-1.5)*1.12,steps*0.72+f32(slot/16u)*0.72,(steps-1.5)*0.9),f32(i/32u)*PI*0.5)*s;
  }
  if(i<96u){
    let course=i/32u;let slot=i%32u;let side=slot/8u;
    let p=rotate(vec3f((f32(slot%8u)-3.5)*1.15,f32(course)*0.72,4.6),f32(side)*PI*0.5);
    return p*s;
  }
  if(i<128u){return towerCenter(i-96u)+vec3f(0,f32((i-96u)/4u)*0.72*s,0);}
  return rotate(vec3f(2.2,0.08,0),f32(i-128u)*PI*0.25)*s;
}
fn worldFoundation(v:u32)->Surface {
  return tile(v,mix(uniforms.themeFifth.rgb,palette(3),0.14),mix(palette(0),palette(2),0.35),0.8,6.0);
}
// One continuous road profile is shared by the cars, bridge deck and rails.
fn toyRoadHeight(a:f32)->f32 {
  let wrapped=abs(atan2(sin(a),cos(a)));
  return (0.15+3.0*(1.0-smoothstep(0.12,0.70,wrapped)))*uniforms.gridSize/25.0;
}
fn toyCarPoint(p:vec3f,a:f32)->vec3f {
  let r=uniforms.gridSize*0.37;let s=uniforms.gridSize/25.0;
  let pitch=atan2(toyRoadHeight(a+0.02)-toyRoadHeight(a-0.02),r*0.04);
  var base=toyRoadHeight(a)+0.325*s;
  // Fit the rigid chassis above all four tire contacts, including curved ramps.
  for(var wheel=0u;wheel<4u;wheel++){
    let x=select(-0.725,0.725,wheel%2u==0u)*s;
    let z=select(-0.80,0.80,wheel>=2u)*s;let y=-0.325*s;
    let foot=rotate(vec3f(x*cos(pitch)-y*sin(pitch),0,z),a+PI*0.5)+vec3f(cos(a)*r,0,sin(a)*r);
    let contact=toyRoadHeight(atan2(foot.z,foot.x));
    base=max(base,contact-x*sin(pitch)-y*cos(pitch)+0.025*s);
  }
  let tilted=vec3f(p.x*cos(pitch)-p.y*sin(pitch),p.x*sin(pitch)+p.y*cos(pitch),p.z);
  return vec3f(cos(a)*r,base,sin(a)*r)+rotate(tilted,a+PI*0.5);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let s=uniforms.gridSize/25.0;
  let style=sceneVariant(3u);let side=(i%32u)/8u;
  var heading=select(f32(side)*PI*0.5,0.0,i>=96u);
  if(style==1u){heading=0.0;}else if(style==2u && i<128u){heading=f32(i/32u)*PI*0.5;}
  let color=palette(f32(1u+(i/(16u+u32(worldDNA(7u).w*24.0))+side)%3u));
  let width=select(1.11,1.75,i>=96u && i<128u && style==0u);
  let depth=select(0.90,1.75,i>=96u && i<128u && style==0u);
  let doorway=style==0u && i<64u && side==0u && (i%8u==3u || i%8u==4u);
  if(part==0u){
    let h=select(0.66,0.015,doorway);
    return surface(c+rotate(box(v,vec3f(width,h,depth))*s,heading),color,0.18);
  }
  if(part==1u || part==2u){
    if(doorway){return surface(c,color,0.0);}
    let p=cylinder(v,0.21,0.14)+vec3f(select(-0.28,0.28,part==2u),0.66,0);
    return surface(c+rotate(p*s,heading),color*1.06,0.28);
  }
  if(i<128u){return surface(c,color,0.0);}
  // A turning gear mounted inside the courtyard.
  let a=uniforms.time*0.65+f32(i)*0.5;
  let p=gear(v,a);
  return surface(c+(p+vec3f(0,0.75,0))*s,palette(1),0.25);
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
  let g=gene(i+110u);let s=uniforms.gridSize/25.0;
  if(i<4u){
    let c=towerCenter(i)+vec3f(0,towerHeight(i)*s,0);
    if(part==4u){return surface(c,palette(0),0.0);}
    if(part==0u){return surface(c+cylinder(v,0.045*s,1.6*s),palette(0),0.35);}
    if(part==1u){
      let q=squarePoint(v)+vec2f(0.5);
      let wave=sin(uniforms.time*1.4+q.x*4.0+g.w*6.28)*0.17*q.x;
      let p=vec3f(q.x*1.1,1.55-q.y*0.6,wave)*s;
      return surface(c+p,palette(f32(1u+i%3u)),0.0);
    }
    if(part==2u){return surface(c+vec3f(0,1.65*s,0)+sphere(v,vec3f(0.075*s)),palette(1),0.35);}
    return surface(c,palette(0),0.0);
  }
  var ground=squarePatch(select(0u,i-14u,i>=14u),18u);
  if(i>=338u){
    let n=i-338u;
    if(n<16u){let a=(f32(n)+0.5)/16.0*1.4-0.7;ground=vec3f(cos(a)*uniforms.gridSize*0.37,0,sin(a)*uniforms.gridSize*0.37);}
    else if(n<30u){ground=vec3f((f32(n-16u)-6.5)*0.72,0.12,5.5)*s;}
    else{ground=vec3f(-5.8,0.12,(f32(n-30u)-7.5)*0.58)*s;}
  }
  if(part==4u){return surface(ground,palette(0),0.0);}
  if(i<14u){
    if(i>=10u+u32(worldDNA(5u).w*4.0)){return surface(ground,palette(0),0.0);}
    let a=uniforms.time*(0.16+g.w*0.12)+g.w*6.28;
    let carScale=s*2.5;
    let r=uniforms.gridSize*0.37;
    if(part==0u){return surface(toyCarPoint(box(v,vec3f(0.95,0.30,0.48))*carScale,a),palette(f32(1u+i%3u)),0.25);}
    if(part<3u){
      let wheel=v/192u;let local=v%192u;let uv=quad(local);
      let wa=(f32((local/6u)%8u)+uv.x)*PI*0.25;let band=local/48u;
      let rs=array<f32,5>(0,1,1,0,0);let ys=array<f32,5>(1,1,0,0,0);
      let wr=mix(rs[band],rs[band+1u],uv.y)*0.17;
      let tire=vec3f(cos(wa)*wr,mix(ys[band],ys[band+1u],uv.y)*0.09,sin(wa)*wr);
      let wheelAngle=uniforms.time*(0.16+g.w*0.12)*r/0.17;
      let spoke=select(0.82,1.0,sin(atan2(tire.z,tire.x)*6.0-wheelAngle)>0.0);
      let p=vec3f(tire.x+select(-0.29,0.29,wheel==1u), tire.z+0.04, tire.y+select(-0.32,0.23,part==2u));
      return surface(toyCarPoint(p*carScale,a),palette(0)*spoke,0.15);
    }
    return surface(toyCarPoint((box(v,vec3f(0.44,0.24,0.36))+vec3f(-0.05,0.3,0))*carScale,a),mix(palette(3),uniforms.themeFifth.rgb,0.28),0.3);
  }
  if(i<338u){
    let cell=uniforms.gridSize/18.0;
    let region=select(select(1.0,2.0,ground.x>0.0),3.0,ground.z>uniforms.gridSize*0.16);
    let r=length(ground.xz)/uniforms.gridSize;
    let road=1.0-smoothstep(0.025,0.065,abs(r-0.36));
    let color=mix(mix(palette(region),uniforms.themeFifth.rgb,0.13+g.w*0.08),mix(palette(0),palette(2),0.36),road*0.84);
    if(part==0u){return surface(ground+box(v,vec3f(cell*0.94,select(0.10+g.w*0.14,0.10,road>0.15)*s,cell*0.94)),mix(color,uniforms.themeFifth.rgb,0.16),0.20);}
    if(part==1u && road<0.15){return surface(ground+vec3f(0,(0.10+g.w*0.14)*s,0)+cylinder(v,cell*0.18,0.07*s),color,0.20);}
    if(part==2u && i%8u==0u && road<0.15){return surface(ground+box(v,vec3f(cell*0.8,0.40*s,cell*0.8)),color,0.18);}
    return surface(ground,palette(0),0.0);
  }
  let n=i-338u;let color=palette(f32(1u+(n/4u)%3u));
  if(n<16u){
    let a=(f32(n)+0.5)/16.0*1.4-0.7;let h=toyRoadHeight(a);
    let heading=a+PI*0.5;let segment=uniforms.gridSize*0.37*1.4/16.0*1.08;
    if(part==0u){
      let local=box(v,vec3f(segment,0.18*s,3.4*s));var p=ground+rotate(local,heading);
      p.y=toyRoadHeight(atan2(p.z,p.x))+local.y-0.18*s;
      return surface(p,color,0.18);
    }
    let side=select(-1.0,1.0,v>=192u);let edge=ground+rotate(vec3f(0,0,side*1.58*s),heading);
    if(part==1u){
      if(n%4u!=0u){return surface(ground,color,0);}
      return surface(edge+box(v,vec3f(0.22*s,max(0.1*s,h-0.18*s),0.22*s)),palette(2),0.15);
    }
    if(part==2u){return surface(edge+vec3f(0,h,0)+cylinder(v%192u,0.06*s,0.72*s),palette(3),0.2);}
    let local=box(v,vec3f(segment,0.10*s,0.11*s));var p=edge+rotate(local,heading);
    p.y=toyRoadHeight(atan2(p.z,p.x))+0.72*s+local.y;
    return surface(p,palette(3),0.2);
  }
  if(n<30u){
    // An articulated conveyor of gears animates the foreground workshop.
    let height=select(0.36,0.8,n%3u==0u)*s;
    if(part==0u){return surface(ground+box(v,vec3f(0.62*s,height,1.0*s)),color,0.2);}
    if(part==1u){return surface(ground+vec3f(0,height+0.05*s,0)+gear(v,uniforms.time*select(-0.65,0.65,n%2u==0u))*s,palette(3),0.28);}
    return surface(ground,color,0.0);
  }
  let h=(0.8+sin(f32(n)*0.85)*0.35)*s;
  if(part==0u){return surface(ground+cylinder(v,0.10*s,h),palette(2),0.15);}
  if(part==1u){
    let bladePart=v/96u;let q=quad(v);let a=f32(bladePart)*PI*0.5+uniforms.time*0.55+g.w*6.28;
    let p=vec3f((q.x-0.5)*0.33,q.y*0.73,0.04*sin(q.y*PI))*s;
    let turn=vec3f(p.x*cos(a)-p.y*sin(a),p.x*sin(a)+p.y*cos(a),p.z);
    return surface(ground+vec3f(0,h,0)+turn,color,0.25);
  }
  if(part==2u){return surface(ground+vec3f(0,h,0.06*s)+sphere(v,vec3f(0.12*s)),palette(3),0.3);}
  return surface(ground+box(v,vec3f(0.6*s,0.2*s,0.6*s)),palette(1),0.15);
}
`,
  6,
  false,
  true,
);
