/** Facet-local phase and a moving reflection make the faces shimmer without particles. */
export const CRYSTALLINE_MATERIALS_WGSL = /* wgsl */ `
fn faceMaterial(o:FacetOutput)->vec3f {
 let view=treeViewDirection()*vec3f(-1,1,-1);
 let normal=normalize(o.normal+vec3f(0,0.000001,0));
 let n=select(-normal,normal,dot(normal,view)>=0.0);
 let time=uniforms.time*0.85;
 let light=normalize(vec3f(-sin(time+o.phase*0.16),0.08+sin(time*0.7)*0.18,-cos(time+o.phase*0.16)));
 let halfVector=normalize(light+view);
 let alignment=max(0.0,dot(n,halfVector));
 let roughness=0.16+fract(o.phase*0.37)*0.14;
 let reflection=pow(alignment,mix(65.0,22.0,roughness));
 let band=dot(reflect(-view,n),light);
 let aa=max(fwidth(band),0.012);
 let glint=smoothstep(0.95-aa,0.99+aa,band)*0.34;
 let fresnel=pow(1.0-max(0.0,dot(n,view)),3.0);
 let plane=0.58+max(0.0,dot(n,normalize(vec3f(-0.5,0.85,-0.6))))*0.42;
 let depth=0.62+fract(o.phase*0.29)*0.30;
 var hue=mix(uniforms.themePrimary.rgb,uniforms.themeThird.rgb,depth);
 hue=mix(hue,uniforms.themeFourth.rgb,fract(o.phase*0.71)*0.17);
 var color=hue*plane+uniforms.themeThird.rgb*fresnel*0.14;
 color+=uniforms.themeFifth.rgb*(reflection*0.42+glint);
 let height=o.world.y/(uniforms.gridSize*uniforms.blockSize);
 let vein=sin(height*75.0+o.phase*2.7-time*2.5);
 let veinAA=max(fwidth(vein),0.06);
 let refraction=smoothstep(0.84-veinAA,0.96+veinAA,vein);
 color+=uniforms.themeFourth.rgb*refraction*0.12;
 if(o.material==2u){color=mix(color,uniforms.themeFifth.rgb,0.19)+uniforms.themeFourth.rgb*fresnel*0.16;}
 if(o.material==3u){color=mix(uniforms.themePrimary.rgb,uniforms.themeFourth.rgb,0.40)*plane;}
 if(o.material==0u){
  let position=o.world.xz/(uniforms.gridSize*uniforms.blockSize);
  let fracture=abs(sin(position.x*51.0+sin(position.y*33.0))*sin(position.y*47.0+position.x*14.0));
  let crack=1.0-smoothstep(0.018,0.055,fracture);
  let current=0.65+0.35*sin(length(position)*45.0-time*3.0);
  color=mix(uniforms.themePrimary.rgb,uniforms.themeThird.rgb,0.10)*plane+uniforms.themeFourth.rgb*crack*current*0.36;
 }
 return color;
}
`;
