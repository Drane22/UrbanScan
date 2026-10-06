/** Sixteen sectors and four profile bands (384 vertices) for curved silhouettes. */
export const DIORAMA_PRIMITIVES_WGSL = /* wgsl */ `
fn gene(i:u32)->vec4f { return worldData[i%arrayLength(&worldData)]; }
// Reserved composition genes are independent of individual object records.
fn worldDNA(slot:u32)->vec4f {return gene(700u+slot);}
fn sceneVariant(count:u32)->u32 {return min(u32(worldDNA(0u).w*f32(count)),count-1u);}
// Move the internal axes while retaining all four boundaries of the square.
fn seededFrame(p:vec3f)->vec3f {
  let dna=worldDNA(1u);let half=uniforms.gridSize*0.5;
  var q=p;
  q.x+=dna.x*uniforms.gridSize*0.40*max(0.0,1.0-abs(p.x)/half);
  q.z+=dna.y*uniforms.gridSize*0.40*max(0.0,1.0-abs(p.z)/half);
  q.y*=0.8+worldDNA(2u).w*0.45;
  q.x*=select(-1.0,1.0,worldDNA(3u).w>0.5);
  return rotate(q,f32(u32(worldDNA(4u).w*4.0))*PI*0.5);
}
fn phase(a:f32,b:f32)->f32 { return smoothstep(a,b,uniforms.progress); }
fn alive()->f32 { return 1.0-phase(0.0,0.65); }
fn random(n:f32)->f32 { return fract(sin(n*127.1+gene(0u).w*317.0)*43758.5453); }
fn palette(n:f32)->vec3f {
  let i=u32(max(n,0.0))%4u;
  if(i==0u){return uniforms.themePrimary.rgb;}
  if(i==1u){return uniforms.themeSecondary.rgb;}
  if(i==2u){return uniforms.themeThird.rgb;}
  return uniforms.themeFourth.rgb;
}
fn surface(p:vec3f,color:vec3f,emission:f32)->Surface {return Surface(p,color,emission);}
fn rotate(p:vec3f,a:f32)->vec3f {return vec3f(p.x*cos(a)-p.z*sin(a),p.y,p.x*sin(a)+p.z*cos(a));}
fn quad(v:u32)->vec2f {
  let q=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  return q[v%6u];
}
// Eight sectors, four profile bands was the original mesh; now sixteen sectors.
fn disk(v:u32)->vec2f {
  let uv=quad(v);let a=(f32((v/6u)%16u)+uv.x)*PI/8.0;
  let r=(f32(v/96u)+uv.y)*0.25;
  return vec2f(cos(a),sin(a))*r;
}
fn squarePoint(v:u32)->vec2f {
  let d=disk(v);return d/max(max(abs(d.x),abs(d.y)),0.00001)*length(d)*0.5;
}
fn sphere(v:u32,size:vec3f)->vec3f {
  let uv=quad(v);let a=(f32((v/6u)%16u)+uv.x)*PI/8.0;
  let b=(f32(v/96u)+uv.y)*PI*0.25;
  return vec3f(cos(a)*sin(b),cos(b),sin(a)*sin(b))*size;
}
fn ring(v:u32,r:f32,tube:f32)->vec3f {
  let uv=quad(v);let a=(f32((v/6u)%16u)+uv.x)*PI/8.0;
  let b=(f32(v/96u)+uv.y)*PI*0.5;
  return vec3f(cos(a)*(r+cos(b)*tube),sin(b)*tube,sin(a)*(r+cos(b)*tube));
}
fn cylinder(v:u32,radius:f32,height:f32)->vec3f {
  let uv=quad(v);let a=(f32((v/6u)%16u)+uv.x)*PI/8.0;
  let band=v/96u;
  let rs=array<f32,5>(0.0,1.0,1.0,0.0,0.0);
  let ys=array<f32,5>(1.0,1.0,0.0,0.0,0.0);
  let r=mix(rs[band],rs[band+1u],uv.y)*radius;
  return vec3f(cos(a)*r,mix(ys[band],ys[band+1u],uv.y)*height,sin(a)*r);
}
fn box(v:u32,size:vec3f)->vec3f {
  let uv=quad(v);let band=v/96u;let q=squarePoint(v);
  let edge=q/max(max(abs(q.x),abs(q.y)),0.00001)*0.5;
  let p=select(q/0.75,edge,band==3u);
  let y=select(size.y,size.y*(1.0-uv.y),band==3u);
  return vec3f(p.x*size.x,y,p.y*size.z);
}
fn bridge(v:u32,a:vec3f,b:vec3f,width:f32)->vec3f {
  let delta=b-a;let direction=normalize(delta+vec3f(0.000001));
  let reference=select(vec3f(0,1,0),vec3f(1,0,0),abs(direction.y)>0.95);
  let side=normalize(cross(direction,reference));
  let p=cylinder(v,width,length(delta));
  return a+side*p.x+direction*p.y+cross(side,direction)*p.z;
}
fn cube(v:u32,size:vec3f)->vec3f {
  let face=(v%36u)/6u;let uv=quad(v);
  if(face==0u){return vec3f((uv.x-0.5)*size.x,size.y,(uv.y-0.5)*size.z);}
  if(face==1u){return vec3f((uv.x-0.5)*size.x,0,(uv.y-0.5)*size.z);}
  if(face==2u){return vec3f((uv.x-0.5)*size.x,uv.y*size.y,size.z*0.5);}
  if(face==3u){return vec3f((uv.x-0.5)*size.x,uv.y*size.y,-size.z*0.5);}
  if(face==4u){return vec3f(size.x*0.5,uv.y*size.y,(uv.x-0.5)*size.z);}
  return vec3f(-size.x*0.5,uv.y*size.y,(uv.x-0.5)*size.z);
}
fn gear(v:u32,angle:f32)->vec3f {
  if(v<192u){
    let a=f32(v/48u)*PI*0.5+angle;
    return rotate(cube(v%48u,vec3f(0.22,0.12,0.25))+vec3f(0,0,0.45),a);
  }
  let local=v-192u;let uv=quad(local);
  let a=(f32((local/6u)%8u)+uv.x)*PI*0.25+angle;
  let b=(f32(local/48u)+uv.y)*PI*0.5;
  let r=0.34+cos(b)*0.1;
  return vec3f(cos(a)*r,0.06+sin(b)*0.06,sin(a)*r);
}
fn spiral(i:u32,count:f32,radius:f32)->vec3f {
  let a=f32(i)*2.39996323+gene(0u).w*0.7;
  let r=sqrt((f32(i)+0.5)/count)*radius;
  return vec3f(cos(a)*r,0,sin(a)*r);
}
// Stratified planting reaches every edge and corner; jitter avoids a rigid visual grid.
fn squarePatch(i:u32,width:u32)->vec3f {
  let g=gene(i);
  let cell=(vec2f(f32(i%width),f32((i/width)%width))+vec2f(0.5)+g.xy*1.1)/f32(width)-vec2f(0.5);
  return vec3f(cell.x*uniforms.gridSize,0.035,cell.y*uniforms.gridSize);
}
fn tuft(v:u32,height:f32,width:f32,seed:f32)->vec3f {
  let leaf=v/96u;let local=v%96u;let uv=quad(local);
  let t=(f32(local/24u)+uv.y)/4.0;
  let across=(f32((local/6u)%4u)+uv.x)*0.5-1.0;
  let a=f32(leaf)*PI*0.5+seed*6.28;
  let wind=(sin(uniforms.time*0.68+seed*17.0)*0.14+sin(uniforms.time*1.35+seed*8.0)*0.045)*alive();
  let p=vec3f(across*sin(t*PI)*width+wind*t*t*height,t*height,(0.22+t*t*0.28)*height);
  return rotate(p,a);
}
fn blade(v:u32,height:f32,width:f32,seed:f32)->vec3f {
  let uv=quad(v);let t=(f32(v/24u)+uv.y)/16.0;
  let across=(f32((v/6u)%4u)+uv.x)*0.5-1.0;
  let wind=(sin(uniforms.time*0.72+seed*13.0)*0.16+sin(uniforms.time*1.31+seed*5.0)*0.05)*alive();
  let envelope=sin(t*PI)*width;
  return vec3f(across*envelope+wind*t*t*height,t*height,0.09*height*sin(t*PI)+t*t*height*0.19);
}
fn butterfly(v:u32,seed:f32,scale:f32)->vec3f {
  let wing=v/192u;let local=v%192u;let uv=quad(v);
  let span=(f32(local/24u)+uv.y)/8.0;
  let across=(f32((local/6u)%4u)+uv.x)*0.5-1.0;
  let side=select(-1.0,1.0,wing==1u);
  let flap=sin(uniforms.time*(7.0+seed*3.0)+seed*21.0)*0.85*alive();
  let width=sin(span*PI)*0.48*(0.7+0.3*cos(span*PI*3.0));
  return vec3f(side*span*cos(flap),abs(span*sin(flap)),across*width)*scale;
}
// Shared solid square tile: theme chooses edge pigment and top material.
fn tile(v:u32,top:vec3f,edgeColor:vec3f,thickness:f32,texture:f32)->Surface {
  let p=box(v,vec3f(uniforms.gridSize,thickness,uniforms.gridSize))-vec3f(0,thickness,0);
  let isSide=v>=288u;let bands=0.87+0.13*sin(p.y*19.0+texture*4.0);
  return surface(p,select(top,edgeColor*bands,isSide),0.0);
}
`;
