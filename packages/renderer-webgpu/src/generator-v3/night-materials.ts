import type { SeedForm } from "../seed-model.js";

/** Current-world lighting overrides; archived shader bundles remain intact. */
export function lightVersionThreeMaterials(source: string, form: SeedForm): string {
  let shader = source.replace(
    "var color=sample.rgb*mix(1.0,0.82,smoothstep(0.08,0.3,brightness));",
    // Lift shaded material without lifting the black canvas or bleaching hue.
    "var color=mix(sample.rgb,pow(max(sample.rgb,vec3f(0)),vec3f(0.86)),smoothstep(0.06,0.22,brightness));",
  );
  if (form === "terrain") {
    shader = shader.replace(
      /fn terrainGrassColor\(\)->vec3f \{[\s\S]*?\n\}/,
      `fn terrainGrassColor()->vec3f {
 return mix(uniforms.themeThird.rgb,uniforms.themeFourth.rgb,0.14);
}`,
    );
  }
  if (form === "reef") {
    shader = shader.replace(
      "fn acesToneMap(color: vec3f) -> vec3f {",
      `fn acesToneMap(color: vec3f) -> vec3f {
  if(uniforms.appearance.x>0.5){
    // Compress brightness as one value so luminous coral keeps its hue.
    let positive=max(color,vec3f(0));
    let peak=max(max(positive.r,positive.g),max(positive.b,0.001));
    return positive/(peak+0.35);
  }`,
    );
  }
  if (form === "city") {
    shader = shader
      .replace(
        "color = mix(color, color * vec3f(0.42, 0.46, 0.58), night * 0.7);",
        "color *= mix(1.0,0.88,night);",
      )
      .replace(
        "var windowColor = mix(vec3f(0.12, 0.14, 0.18), vec3f(1.0, 0.86, 0.6), night);",
        "var windowColor = mix(vec3f(0.12,0.14,0.18),mix(uniforms.themeSecondary.rgb,uniforms.themeFourth.rgb,step(0.5,input.seed)),night);",
      );
  }
  if (shader.includes("const MATERIAL_KIND:")) {
    shader = shader.replace(
      /  if\(uniforms\.appearance\.x>0\.5\)\{[\s\S]*?\n  \}\n  return vec4f\(clamp\(color/,
      `${SCULPTURE_NIGHT_LIGHTING}\n  return vec4f(clamp(color`,
    );
  }
  return shader;
}

const SCULPTURE_NIGHT_LIGHTING = /* wgsl */ `
  if(uniforms.appearance.x>0.5){
    let peak=max(max(material.r,material.g),max(material.b,0.001));
    let luminous=mix(material/peak,vec3f(1),0.10);
    let rim=pow(1.0-abs(dot(n,treeViewDirection())),3.0);
    if(MATERIAL_KIND==0u){
      // Readable mineral layers and colored resources inside the burrow.
      color=lit*0.90+material*0.20+luminous*(rim*0.10+o.emission*0.30);
    }else if(MATERIAL_KIND==1u){
      // Colored stone under a soft fill, with palette-colored torch pools.
      let torch=pow(max(0.0,sin(coord.x*0.49)*cos(coord.z*0.49)),8.0);
      color=lit*0.90+material*0.16+luminous*rim*0.12;
      color+=uniforms.themeSecondary.rgb*torch*max(n.y,0.0)*0.18;
      color=mix(color,luminous*1.05,smoothstep(0.3,0.85,o.emission));
    }else if(MATERIAL_KIND==2u){
      let raised=smoothstep(0.3,2.0,coord.y);
      color=lit*0.72+luminous*(raised*0.25+rim*raised*0.26);
      color+=uniforms.themeSecondary.rgb*smoothstep(0.2,0.32,o.emission)*0.18;
    }else if(MATERIAL_KIND==3u){
      let pane=smoothstep(0.10,0.22,o.emission)*mix(0.18,1.0,smoothstep(0.2,1.0,coord.y));
      color=lit*0.62+luminous*pane*(0.40+rim*0.18);
    }else if(MATERIAL_KIND==4u){
      color=lit*0.85+material*0.15+luminous*(o.emission*0.45+rim*0.12);
    }else if(MATERIAL_KIND==5u){
      color=lit*0.65+luminous*(0.10+pow(o.emission,2.0)*0.75+rim*0.22);
      if(o.part==9u){color=vec3f(0.018,0.022,0.035);}
    }else if(MATERIAL_KIND==6u){
      // Light the brick bodies and the ground tiles, not just raised studs.
      let stud=select(0.0,0.18,o.part==1u || o.part==2u);
      color=lit*0.85+material*0.18+luminous*(stud+rim*0.18);
    }
    if(o.part==9u && MATERIAL_KIND!=5u){
      color=mix(material*(0.52+0.20*abs(n.y)),color,0.60);
    }
  }`;
