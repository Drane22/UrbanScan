import { createSculpturalWorldShader } from "./sculptural-world-shaders.js";

export const DUNGEON_SHADER = createSculpturalWorldShader(
  /* wgsl */ `
fn roomCenter(room:u32)->vec3f {
  let centers=array<vec2f,3>(vec2f(-6.55,-6.5),vec2f(6.55,-6.5),vec2f(0,6.5));
  let p=centers[room%3u]*uniforms.gridSize/25.0;return vec3f(p.x,0,p.y);
}
fn roomSize(room:u32)->vec2f {
  let g=worldDNA(5u+room);
  return select(vec2f(3.8+g.w*0.95,3.8+(g.x+0.41)*1.0),vec2f(4.6+g.w*1.1,3.9+(g.y+0.41)*0.8),room==2u);
}
fn roomDoor(room:u32,side:u32)->bool {
  return (room==0u && (side==0u || side==3u)) || (room==1u && (side==0u || side==1u)) || (room==2u && side==2u);
}
fn gateSide(i:u32)->u32 {let sides=array<u32,5>(0u,3u,0u,1u,2u);return sides[i];}
fn dungeonArch(v:u32)->vec3f {
  let uv=quad(v);let a=(f32((v/6u)%16u)+uv.x)*PI/16.0;let band=v/96u;
  let r=select(0.86+uv.y*0.42,select(0.86,1.28,band==2u),band>=2u);
  let z=select(select(-0.42,0.42,band==1u),mix(-0.42,0.42,uv.y),band>=2u);
  return vec3f(cos(a)*r,sin(a)*r+1.48,z);
}
fn dungeonCrystal(v:u32,h:f32,w:f32)->vec3f {
  let uv=quad(v);let a=(f32((v/6u)%16u)+uv.x)*PI/8.0;let band=v/96u;
  let ys=array<f32,5>(0.0,0.18,0.70,1.0,1.0);let rs=array<f32,5>(0.0,1.0,0.78,0.0,0.0);
  let r=mix(rs[band],rs[band+1u],uv.y)*w;
  return vec3f(cos(a)*r,mix(ys[band],ys[band+1u],uv.y)*h,sin(a)*r);
}
fn verticalRing(v:u32,r:f32,t:f32)->vec3f {let p=ring(v,r,t);return vec3f(p.x,p.z,p.y);}
fn worldAnchor(i:u32)->vec3f {
  let s=uniforms.gridSize/25.0;
  if(i<180u){
    let room=i/60u;let slot=i%60u;let side=(slot%20u)/5u;let size=roomSize(room);
    let span=select(size.x,size.y,side%2u==1u);let depth=select(size.y,size.x,side%2u==1u);
    return roomCenter(room)+rotate(vec3f((f32(slot%5u)-2.0)*span*0.4,f32(slot/20u)*0.68,depth),f32(side)*PI*0.5)*s;
  }
  if(i<228u){let k=i-180u;return rotate(vec3f((f32(k%12u)-5.5)*2.03,0,12.15),f32(k/12u)*PI*0.5)*s;}
  if(i<231u){return roomCenter(i-228u);}
  if(i<239u){return vec3f(0);}
  if(i<244u){
    let k=i-239u;let room=min(k/2u,2u);let side=gateSide(k);let size=roomSize(room);
    return roomCenter(room)+rotate(vec3f(0,0,select(size.y,size.x,side%2u==1u)),f32(side)*PI*0.5)*s;
  }
  if(i<256u){
    let k=i-244u;let size=roomSize(k/4u);
    return roomCenter(k/4u)+vec3f(select(-size.x,size.x,k%2u==1u),0,select(-size.y,size.y,k%4u>=2u))*s;
  }
  if(i<272u){
    let k=i-256u;if(k<4u){return roomCenter(0u)+vec3f(0,0,-0.6)*s;}
    let a=f32(k-4u)*PI/6.0;return roomCenter(0u)+vec3f(cos(a)*3.25,0,sin(a)*3.15)*s;
  }
  if(i<304u){
    let k=i-272u;let rows=select(8u,4u,sceneVariant(2u)==1u);
    let spacing=select(vec2f(0.91,1.9),vec2f(1.8,0.88),rows==4u);
    return roomCenter(1u)+vec3f((f32(k%rows)-f32(rows-1u)*0.5)*spacing.x,0,(f32(k/rows)-f32(32u/rows-1u)*0.5)*spacing.y)*s;
  }
  if(i<336u){
    let k=i-304u;if(k<4u){return roomCenter(2u)+vec3f(0,0,0.9)*s;}
    let a=f32(k-4u)*PI/14.0;let r=select(3.2,4.2,k>=18u);
    return roomCenter(2u)+vec3f(cos(a)*r,0,sin(a)*r*0.72+0.5)*s;
  }
  if(i<356u){
    let k=i-336u;let n=k%10u;
    return vec3f(select(-8.55,8.55,k>=10u)+(f32(n%2u)-0.5)*1.35,0,2.45+f32(n/2u)*1.75)*s;
  }
  if(i<372u){let k=i-356u;return rotate(vec3f((f32(k%4u)-1.5)*5.6,1.75,11.75),f32(k/4u)*PI*0.5)*s;}
  let k=i-372u;return vec3f(select(-1.55,1.55,k%2u==1u),0,(f32(k/2u)-2.5)*4.1)*s;
}
fn worldFoundation(v:u32)->Surface {
  return tile(v,mix(palette(2),uniforms.themeFifth.rgb,0.36),mix(palette(0),palette(2),0.32),0.9,1.0);
}
fn worldSurface(v:u32,i:u32,part:u32)->Surface {
  let c=worldAnchor(i);let s=uniforms.gridSize/25.0;let g=gene(i);
  let stone=mix(palette(2),uniforms.themeFifth.rgb,0.16+g.w*0.12);let dark=mix(palette(0),palette(2),0.24);
  if(i<180u){
    let room=i/60u;let slot=i%60u;let side=(slot%20u)/5u;let size=roomSize(room);
    let span=select(size.x,size.y,side%2u==1u)*0.4;
    let door=slot%5u==2u && roomDoor(room,side);let cutaway=slot>=40u && (side==1u || side==2u);
    let gallery=sceneVariant(3u)==2u && ((room==0u && side==3u)||(room==1u && side==1u));
    let openSanctum=sceneVariant(3u)==1u && room==2u && (side==0u || side==3u);
    if(door || cutaway || gallery || openSanctum){return surface(c,stone,0.0);}
    if(part==0u){return surface(c+rotate(box(v,vec3f(span-0.04,0.64,0.58))*s,f32(side)*PI*0.5),stone,0.0);}
    if(part==1u){return surface(c+rotate(box(v,vec3f(span+0.06,0.08,0.68))*s,f32(side)*PI*0.5)+vec3f(0,0.64*s,0),stone*1.09,0.0);}
    if(part==2u && slot<20u){return surface(c+rotate(box(v,vec3f(span,0.14,0.86))*s,f32(side)*PI*0.5),dark,0.0);}
    return surface(c,stone,0.0);
  }
  if(i<228u){
    let side=(i-180u)/12u;let k=(i-180u)%12u;let h=select(1.15,1.85,side==0u || side==3u);
    if(part==0u){return surface(c+rotate(box(v,vec3f(2.02,h,0.65))*s,f32(side)*PI*0.5),stone*0.86,0.0);}
    if(part==1u){return surface(c+rotate(box(v,vec3f(2.08,0.17,0.80))*s,f32(side)*PI*0.5)+vec3f(0,h*s,0),stone,0.0);}
    if(part==2u && k%3u==0u){return surface(c+cylinder(v,0.39*s,(h+0.52)*s),dark,0.0);}
    if(part==3u && k%3u==0u){return surface(c+box(v,vec3f(0.9,0.16,0.9)*s)+vec3f(0,(h+0.52)*s,0),stone,0.0);}
    return surface(c,stone,0.0);
  }
  if(i<231u){
    let room=i-228u;let size=roomSize(room)*2.0;
    if(part==0u){return surface(c+box(v,vec3f(size.x,0.13,size.y)*s),mix(palette(2),uniforms.themeFifth.rgb,0.47),0.0);}
    if(part==1u && room!=1u){return surface(c+box(v,vec3f(select(2.4,3.7,room==2u),0.018,size.y-1.1)*s)+vec3f(0,0.14*s,0),mix(palette(0),palette(3),0.33),0.0);}
    if(part==2u && room==2u){return surface(c+ring(v,3.25*s,0.065*s)+vec3f(0,0.17*s,0),palette(3),0.45);}
    return surface(c,stone,0.0);
  }
  if(i<239u){
    let k=i-231u;
    let centers=array<vec2f,8>(vec2f(0,0),vec2f(0,0),vec2f(-11.35,0),vec2f(11.35,0),vec2f(0,-11.35),vec2f(0,11.35),vec2f(-6.7,0.35),vec2f(6.7,0.35));
    let sizes=array<vec2f,8>(vec2f(2.9,24),vec2f(24,2.9),vec2f(1.3,24),vec2f(1.3,24),vec2f(24,1.3),vec2f(24,1.3),vec2f(2.6,5.4),vec2f(2.6,5.4));
    let p=vec3f(centers[k].x,0,centers[k].y)*s;
    if(part==0u){return surface(p+box(v,vec3f(sizes[k].x,0.24,sizes[k].y)*s),mix(palette(2),uniforms.themeFifth.rgb,0.66),0.0);}
    if(part==1u){return surface(p+box(v,vec3f(max(0.1,sizes[k].x-0.25),0.04,max(0.1,sizes[k].y-0.25))*s)+vec3f(0,0.24*s,0),mix(palette(2),palette(1),0.22),0.0);}
    return surface(p,stone,0.0);
  }
  if(i<244u){
    let a=f32(gateSide(i-239u))*PI*0.5;
    if(part<2u){return surface(c+rotate(box(v,vec3f(0.39,1.5,0.85))*s+vec3f(select(-1.06,1.06,part==1u)*s,0,0),a),dark,0.0);}
    if(part==2u){return surface(c+rotate(dungeonArch(v)*s,a),stone*1.1,0.0);}
    return surface(c+rotate(box(v,vec3f(0.30,0.49,0.92))*s+vec3f(0,2.30*s,0),a),mix(stone,palette(1),0.35),0.0);
  }
  if(i<256u || i>=372u){
    let h=select(2.35,1.42,i>=372u);
    if(part==0u){return surface(c+box(v,vec3f(0.78,0.20,0.78)*s),dark,0.0);}
    if(part==1u){return surface(c+cylinder(v,0.28*s,h*s),stone*0.95,0.0);}
    if(part==2u){return surface(c+box(v,vec3f(0.73,0.20,0.73)*s)+vec3f(0,h*s,0),stone*1.12,0.0);}
    return surface(c+ring(v,0.28*s,0.075*s)+vec3f(0,h*0.46*s,0),palette(1)*0.8,0.0);
  }
  if(i<272u){
    let k=i-256u;
    if(k<4u){
      if(k==0u){if(part==0u){return surface(c+box(v,vec3f(4.4,0.24,3.8)*s),dark,0.0);}if(part==1u){return surface(c+box(v,vec3f(3.7,0.25,3.1)*s)+vec3f(0,0.24*s,0),stone,0.0);}}
      if(k==1u){if(part==0u){return surface(c+box(v,vec3f(2.45,0.72,1.2)*s)+vec3f(0,0.49*s,0),stone,0.0);}if(part==1u){return surface(c+box(v,vec3f(2.75,0.18,1.5)*s)+vec3f(0,1.20*s,0),mix(stone,palette(1),0.28),0.0);}}
      if(k==2u){
        let bob=sin(uniforms.time*1.2)*0.35*alive();
        if(part==0u){return surface(c+dungeonCrystal(v,1.45*s,0.43*s)+vec3f(0,(1.72+bob)*s,0),palette(3),0.7);}
        if(part==1u){return surface(c+ring(v,0.78*s,0.065*s)+vec3f(0,(1.82+bob)*s,0),palette(1),0.5);}
      }
      if(k==3u && part<3u){return surface(c+box(v,vec3f(2.0-f32(part)*0.2,0.16,0.52)*s)+vec3f(0,0.16*f32(part)*s,-(2.2-f32(part)*0.45)*s),stone,0.0);}
      return surface(c,stone,0.0);
    }
    if(part==0u){return surface(c+cylinder(v,0.32*s,0.20*s),dark,0.0);}
    if(part==1u){return surface(c+cylinder(v,0.14*s,1.0*s),palette(1)*0.6,0.0);}
    if(part==2u){return surface(c+ring(v,0.34*s,0.07*s)+vec3f(0,0.82*s,0),palette(1),0.1);}
    let flicker=sin(uniforms.time*7.0+g.w*15.0)*0.05*alive();
    return surface(c+dungeonCrystal(v,(0.37+flicker)*s,0.11*s)+vec3f(0,1.02*s,0),palette(1),0.85);
  }
  if(i<304u){
    let k=i-272u;let chest=gene(k+300u).w<0.25+worldDNA(8u).w*0.6;let wood=mix(palette(0),palette(1),0.24+g.w*0.12);let h=select(0.65+gene(k+310u).w*0.6,0.62,chest);
    if(part==0u){return surface(c+box(v,vec3f(0.81,h,1.1)*s),wood,0.0);}
    if(part==1u){
      if(chest){return surface(c+sphere(v,vec3f(0.43,0.33,0.57)*s)+vec3f(0,h*s,0),wood*1.18,0.0);}
      return surface(c+box(v,vec3f(0.86,0.08,1.14)*s)+vec3f(0,h*s,0),wood*1.15,0.0);
    }
    return surface(c+box(v,vec3f(0.09,h+0.22,1.14)*s)+vec3f(select(-0.23,0.23,part==3u)*s,0,0),mix(palette(1),stone,0.4),0.0);
  }
  if(i<336u){
    let k=i-304u;
    if(k<4u){
      if(k==0u && part==0u){return surface(c+cylinder(v,2.3*s,0.34*s),dark,0.0);}
      if(k==0u && part==1u){return surface(c+cylinder(v,1.85*s,0.14*s)+vec3f(0,0.34*s,0),stone,0.0);}
      if(k==1u && part==0u){
        if(sceneVariant(3u)==1u){return surface(c+dungeonCrystal(v,4.8*s,0.9*s)+vec3f(0,0.48*s,0),palette(3),0.35);}
        return surface(c+verticalRing(v,(1.4+worldDNA(11u).w*0.8)*s,0.22*s)+vec3f(0,2.4*s,0),stone,0.0);
      }
      if(k==1u && part==1u){return surface(c+verticalRing(v,1.56*s,0.055*s)+vec3f(0,2.4*s,0),palette(3),0.85);}
      if(k==2u && part==0u){
        let pulse=sin(uniforms.time*1.5)*0.22*alive();
        if(sceneVariant(3u)==1u){return surface(c+ring(v,1.45*s,0.1*s)+vec3f(0,(2.4+pulse)*s,0),palette(1),0.7);}
        return surface(c+sphere(v,vec3f(1.38,1.38,0.075)*s)+vec3f(0,(2.4+pulse)*s,0),mix(palette(3),palette(0),0.36),0.45);
      }
      if(k==3u && part<2u){return surface(c+box(v,vec3f(0.62,1.3,0.84)*s)+vec3f(select(-1.72,1.72,part==1u)*s,0.35*s,0),dark,0.0);}
      return surface(c,stone,0.0);
    }
    let h=(0.8+g.z*0.75)*select(1.0,1.65,k%7u==0u);
    if(part==0u){return surface(c+dungeonCrystal(v,h*s,0.29*s),mix(palette(3),palette(2),g.w*0.25),0.32);}
    if(part==1u){return surface(c+rotate(dungeonCrystal(v,h*0.58*s,0.17*s),g.w*6.28)+vec3f(0.28*s,0,0.16*s),palette(3)*0.82,0.2);}
    if(part==2u){return surface(c+sphere(v,vec3f(0.51,0.14,0.43)*s),dark,0.0);}
    return surface(c,stone,0.0);
  }
  if(i<356u){
    let k=i-336u;
    if(k<10u){
      if(part==0u){return surface(c+box(v,vec3f(0.92,0.37,1.25)*s),dark,0.0);}
      if(part==1u){return surface(c+box(v,vec3f(1.02,0.15,1.34)*s)+vec3f(0,0.37*s,0),stone,0.0);}
      if(part==2u){return surface(c+box(v,vec3f(0.12,0.035,0.74)*s)+vec3f(0,0.525*s,0),palette(1)*0.8,0.0);}
      return surface(c+box(v,vec3f(0.52,0.035,0.12)*s)+vec3f(0,0.525*s,-0.16*s),palette(1)*0.8,0.0);
    }
    if(part==0u){return surface(c+box(v,vec3f(0.82,1.34,0.65)*s),dark,0.0);}
    if(part==1u || part==2u){return surface(c+box(v,vec3f(0.88,0.12,0.76)*s)+vec3f(0,select(0.72,1.34,part==1u)*s,0),stone,0.0);}
    return surface(c+box(v,vec3f(0.13,0.45,0.70)*s)+vec3f(0,0.8*s,0),mix(palette(1),palette(3),g.w),0.0);
  }
  let k=i-356u;let angle=f32(k/4u)*PI*0.5;
  if(part==0u){return surface(c+rotate(bridge(v,vec3f(-0.66,0.65,0),vec3f(0.66,0.65,0),0.06)*s,angle),palette(1)*0.6,0.0);}
  if(part==1u){
    let q=squarePoint(v)*2.0;let t=(q.y+1.0)*0.5;
    let wave=sin(uniforms.time*1.3+t*4.0+g.w*9.0)*0.34*t*alive();
    return surface(c+rotate(vec3f(q.x*0.53,0.63-t*1.5,0.23+wave)*s,angle),palette(3)*0.88,0.0);
  }
  if(part==2u){return surface(c+rotate(box(v,vec3f(0.23,0.72,0.10))*s+vec3f(0,-0.13*s,0.26*s),angle),palette(1)*0.9,0.0);}
  return surface(c,stone,0.0);
}
fn firePoint(i:u32)->vec3f {
  let points=array<vec2f,16>(vec2f(-10,-10),vec2f(-3,-10),vec2f(-10,-3),vec2f(-3,-3),
    vec2f(3,-10),vec2f(10,-10),vec2f(3,-3),vec2f(10,-3),vec2f(-4,3),vec2f(4,3),
    vec2f(-4,10),vec2f(4,10),vec2f(-10,1),vec2f(10,1),vec2f(-1,-11),vec2f(1,11));
  let p=points[i%16u]*uniforms.gridSize/25.0;return vec3f(p.x,0,p.y);
}
fn worldAmbient(v:u32,i:u32,part:u32)->Surface {
  let g=gene(i+384u);let s=uniforms.gridSize/25.0;let stone=mix(palette(0),palette(2),0.55);
  if(i<16u){
    let c=firePoint(i);if(part==4u){return surface(c,stone,0.0);}
    if(part==0u){return surface(c+cylinder(v,0.30*s,0.98*s),stone,0.0);}
    if(part==1u){
      let flicker=sin(uniforms.time*7.0+g.w*17.0)*0.12*alive();
      return surface(c+dungeonCrystal(v,(0.95+flicker)*s,0.33*s)+vec3f(0.12*sin(uniforms.time*4.0+g.w)*s,0.99*s,0),palette(1),0.9);
    }
    let cycle=fract(uniforms.time*(0.15+g.w*0.08)+g.w+f32(part)*0.29);let r=sin(cycle*PI)*select(0.12,0.28,part==3u)*s;
    let drift=vec3f(sin(uniforms.time+g.w*8.0)*0.38*cycle,1.65+cycle*1.6,cos(uniforms.time*0.6+g.w*5.0)*0.23*cycle)*s;
    return surface(c+drift+sphere(v,vec3f(r)),select(palette(1),mix(palette(2),uniforms.themeFifth.rgb,0.48),part==3u),select(0.9,0.0,part==3u));
  }
  if(i<48u){
    let c=roomCenter(2u);if(part==4u || part>0u){return surface(c,stone,0.0);}
    let a=uniforms.time*(0.16+g.w*0.09)+g.w*6.28;
    let p=vec3f(cos(a)*(1.3+g.z),1.0+g.z+sin(a*2.0)*0.5,sin(a)*(1.2+g.z))*s;
    return surface(c+p+dungeonCrystal(v,(0.32+g.w*0.22)*s,0.14*s),palette(3),0.75);
  }
  let k=i-48u;let x=(f32(k%16u)-7.5)*1.44;let z=(f32(k/16u)-7.0)*1.55;
  let c=vec3f(x+g.x*0.46,0.025,z+g.y*0.46)*s;
  if(part==4u){return surface(c,stone,0.0);}
  if(part==0u){return surface(c+rotate(box(v,vec3f(0.64+g.w*0.25,0.07,0.68)*s),g.w*0.3),mix(palette(2),uniforms.themeFifth.rgb,0.35+g.w*0.24),0.0);}
  if(part==1u && k%4u==0u){return surface(c+sphere(v,vec3f(0.28,0.17,0.22)*s),stone,0.0);}
  if(part==2u && (abs(x)>9.5 || abs(z)>10.0)){return surface(c+rotate(blade(v,0.37*s,0.16,g.w),g.w*6.28),mix(palette(3),palette(2),0.6),0.0);}
  return surface(c,stone,0.0);
}
`,
  1,
  false,
  true,
);
