export const GEAR_TOOTH_COUNTS = [12, 16, 20, 24] as const;
export const GEAR_MODULE = 0.014;
export type GearPair = {
  driverTeeth: number;
  followerTeeth: number;
  driverRadius: number;
  followerRadius: number;
  centerDistance: number;
  engagementPhase: number;
};
export type SliderLinkage = { radius: number; rodLength: number };

export function createGearPair(driverTeeth: number, followerTeeth: number): GearPair {
  if (
    ![driverTeeth, followerTeeth].every((n) =>
      GEAR_TOOTH_COUNTS.includes(n as (typeof GEAR_TOOTH_COUNTS)[number]),
    )
  )
    throw new RangeError("Unsupported gear tooth count");
  const driverRadius = (driverTeeth * GEAR_MODULE) / 2,
    followerRadius = (followerTeeth * GEAR_MODULE) / 2;
  // Driver tooth at the line of centers faces the middle of a follower gap.
  const engagementPhase = Math.PI - Math.PI / followerTeeth;
  return {
    driverTeeth,
    followerTeeth,
    driverRadius,
    followerRadius,
    centerDistance: driverRadius + followerRadius,
    engagementPhase,
  };
}
export function followerAngle(pair: GearPair, driverAngle: number): number {
  if (!Number.isFinite(driverAngle)) throw new RangeError("Invalid drive angle");
  return (-driverAngle * pair.driverTeeth) / pair.followerTeeth + pair.engagementPhase;
}
export function createSliderLinkage(radius: number, rodLength: number): SliderLinkage {
  if (!Number.isFinite(radius) || !Number.isFinite(rodLength) || radius <= 0 || rodLength <= radius)
    throw new RangeError("Connecting rod must be longer than the positive crank radius");
  return { radius, rodLength };
}
export function sliderPosition(linkage: SliderLinkage, angle: number): number {
  const { radius: r, rodLength: l } = createSliderLinkage(linkage.radius, linkage.rodLength);
  if (!Number.isFinite(angle)) throw new RangeError("Invalid crank angle");
  return r * Math.cos(angle) + Math.sqrt(l * l - r * r * Math.sin(angle) ** 2);
}

/** Same validated descriptors are packed by the model and consumed here by WGSL. */
export const MECHANICAL_MOTION_WGSL = /* wgsl */ `
fn rotateXY(p:vec3f,a:f32)->vec3f {return vec3f(p.x*cos(a)-p.y*sin(a),p.x*sin(a)+p.y*cos(a),p.z);}
fn movePart(p:vec3f,n:vec3f,instance:u32)->mat2x3f {
 let d=worldData[instance*3u];let pivot=worldData[instance*3u+1u];let link=worldData[instance*3u+2u];
 let angle=uniforms.time*0.48*pivot.w+d.w;
 if(d.z==1.0){return mat2x3f(pivot.xyz+rotateXY(p-pivot.xyz,angle),rotateXY(n,angle));}
 if(d.z==2.0||d.z==3.0){
  let crank=vec3f(link.x*cos(angle),link.x*sin(angle),0);
  let slide=link.x*cos(angle)+sqrt(link.y*link.y-link.x*link.x*sin(angle)*sin(angle));
  if(d.z==2.0){return mat2x3f(p+vec3f(slide-link.y,0,0),n);}
  let rodAngle=atan2(-crank.y,slide-crank.x);
  return mat2x3f(pivot.xyz+crank+rotateXY(p-pivot.xyz,rodAngle),rotateXY(n,rodAngle));
 }
 return mat2x3f(p,n);
}
`;
