/** Shared geometry timing and camera motion taken from the original Tree renderer. */
export const TREE_MORPH_WGSL = /* wgsl */ `
fn treeLayerRise(layer:f32)->f32 {
 let start=clamp(layer/42.0,0.0,0.46);
 return smoothstep(start,min(1.0,start+0.42),1.0-uniforms.progress);
}
fn treeSemanticAbsorb()->f32 {return 1.0-smoothstep(0.68,0.98,1.0-uniforms.progress);}
fn treeFoliageVisibility()->f32 {return smoothstep(0.0,0.6,1.0-uniforms.progress);}
fn treeBranchVisibility()->f32 {return smoothstep(0.38,0.88,1.0-uniforms.progress);}
fn treeViewDirection()->vec3f {
 let yaw=mix(0.78,0.0,uniforms.progress)+uniforms.cameraBobX;
 let tilt=mix(-0.55,-1.5708,uniforms.progress)+uniforms.cameraBobY;
 return normalize(vec3f(sin(yaw)*cos(tilt),-sin(tilt),cos(yaw)*cos(tilt)));
}
fn treeCameraView(p:vec3f,worldScale:f32,qrScale:f32,worldShift:vec2f,qrShift:vec2f,portrait:f32,zoom:f32)->vec4f {
 let t=uniforms.progress;
 let yaw=mix(0.78,0.0,t)+uniforms.cameraBobX;
 let tilt=mix(-0.55,-1.5708,t)+uniforms.cameraBobY;
 let x=p.x*cos(yaw)-p.z*sin(yaw);
 let z=p.x*sin(yaw)+p.z*cos(yaw);
 let y=p.y*cos(tilt)-z*sin(tilt);
 let depth=p.y*sin(tilt)+z*cos(tilt);
 let pulse=1.0+sin(t*3.14159265)*0.035;
 let scale=mix(worldScale,qrScale,t)*portrait*pulse*zoom;
 let shift=mix(worldShift,qrShift,t);
 return vec4f((x+shift.x)*scale/max(uniforms.aspectRatio,1.0),
  (y+shift.y)*scale/max(1.0/uniforms.aspectRatio,1.0),depth*0.01+0.5,1.0);
}
`;

/** Enough height bands to preserve Tree's rising/absorbing relief handoff. */
export const QR_RELIEF_LAYERS = 12;
export const QR_RELIEF_WGSL = /* wgsl */ `
// A fixed topology throughout the transition; no interpolation between unrelated meshes.
fn qrReliefCube(v:u32,size:vec3f)->vec3f {
 let maskedUv=qrReliefUv(v);let face=(v%36u)/6u;
 let uv=select(maskedUv,vec2f(maskedUv.x,1.0-maskedUv.y),face==1u);
 if(face==0u){return vec3f((uv.x-0.5)*size.x,size.y,(uv.y-0.5)*size.z);}
 if(face==1u){return vec3f((uv.x-0.5)*size.x,0,(0.5-uv.y)*size.z);}
 if(face==2u){return vec3f((uv.x-0.5)*size.x,uv.y*size.y,size.z*0.5);}
 if(face==3u){return vec3f((0.5-uv.x)*size.x,uv.y*size.y,-size.z*0.5);}
 if(face==4u){return vec3f(size.x*0.5,uv.y*size.y,(uv.x-0.5)*size.z);}
 return vec3f(-size.x*0.5,uv.y*size.y,(0.5-uv.x)*size.z);
}
fn qrReliefUv(v:u32)->vec2f {
 let q=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
 let uv=q[v%6u];return select(uv,vec2f(uv.x,1.0-uv.y),(v%36u)/6u==1u);
}
fn qrReliefNormal(v:u32)->vec3f {
 let face=(v%36u)/6u;
 let normals=array<vec3f,6>(vec3f(0,1,0),vec3f(0,-1,0),vec3f(0,0,1),vec3f(0,0,-1),vec3f(1,0,0),vec3f(-1,0,0));
 return normals[face];
}
fn qrReliefPoint(v:u32,cell:vec2f,layer:u32)->vec3f {
 let rise=treeLayerRise(f32(layer));
 let scale=select(1.0,rise*treeSemanticAbsorb(),layer>0u);
 let h=select((1.0-uniforms.progress)*0.30,1.0,layer>0u);
 let p=qrReliefCube(v,vec3f(scale,h*scale,scale));
 return vec3f(cell.x,f32(layer)*rise,cell.y)+p;
}
`;
