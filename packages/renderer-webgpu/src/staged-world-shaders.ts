export const STAGED_PROJECTION_WGSL = /* wgsl */ `
fn worldProject(p: vec3f, worldScale: f32, lift: f32) -> vec4f {
  let t = uniforms.progress;
  let yaw = mix(0.78,0.0,t);
  let tilt = mix(-0.62,-1.57079632679,t);
  let x = p.x*cos(yaw)-p.z*sin(yaw);
  let z = p.x*sin(yaw)+p.z*cos(yaw);
  let y = p.y*cos(tilt)-z*sin(tilt);
  let depth = p.y*sin(tilt)+z*cos(tilt);
  let scale = mix(worldScale,1.90,t)/((uniforms.gridSize+10.0)*uniforms.blockSize)
    * mix(uniforms.camera.x,min(uniforms.camera.x,1.0),t);
  return vec4f(x*scale/max(uniforms.aspectRatio,1.0),
    (y-lift*(1.0-t))*scale/max(1.0/uniforms.aspectRatio,1.0),depth*0.02+0.5,1.0);
}
`;
