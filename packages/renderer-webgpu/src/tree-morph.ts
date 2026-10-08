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
