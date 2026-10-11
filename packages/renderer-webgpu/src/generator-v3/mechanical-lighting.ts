/** Orthographic key light and a small PCF kernel, shared by the depth and material passes. */
export const MECHANICAL_LIGHTING_WGSL = /* wgsl */ `
@group(1) @binding(0) var machineShadow:texture_depth_2d;
@group(1) @binding(1) var machineShadowSampler:sampler_comparison;
fn machineLightPosition(p:vec3f)->vec3f {
 let light=normalize(vec3f(-0.6,0.8,-0.9));
 let right=normalize(cross(light,vec3f(0,1,0)));
 let up=cross(right,light);
 let local=p/(uniforms.gridSize*uniforms.blockSize)-vec3f(0,0.16,0);
 return vec3f(dot(local,right)/0.85,dot(local,up)/0.85,0.5-dot(local,light)/2.4);
}
fn machineVisibility(p:vec3f,n:vec3f)->f32 {
 let light=normalize(vec3f(-0.6,0.8,-0.9));
 let projected=machineLightPosition(p);
 let uv=projected.xy*vec2f(0.5,-0.5)+vec2f(0.5);
 let bias=0.00045+0.0012*(1.0-max(dot(n,light),0.0));
 var visibility=0.0;
 for(var y=-1;y<=1;y++){for(var x=-1;x<=1;x++){
  visibility+=textureSampleCompareLevel(machineShadow,machineShadowSampler,uv+vec2f(f32(x),f32(y))/1024.0,projected.z-bias);
 }}
 return visibility/9.0;
}
@vertex fn shadowVertex(@builtin(vertex_index) v:u32,@builtin(instance_index) instance:u32)->@builtin(position) vec4f {
 let vertex=facetVertex(v,instance);
 if(vertex.position.w==1.0 && vertex.position.x==2.0 && vertex.position.y==2.0){return vec4f(2,2,2,1);}
 return vec4f(machineLightPosition(vertex.world),1);
}
`;
