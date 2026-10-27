export function initialModelScale(asset,halfExtents){
 if(Number.isFinite(asset.modelScale)&&asset.modelScale>0)return asset.modelScale;
 const largest=2*Math.max(halfExtents.x,halfExtents.y,halfExtents.z);
 if(asset.kind!=='room')return largest>20?1/largest:1;
 const height=halfExtents.y*2;
 // Keep metre-sized source geometry. For unlabelled cm/mm exports use a
 // power-of-ten unit estimate, never force every room to the same length.
 if(!Number.isFinite(height)||height<=0||height>=1.5&&height<=20)return 1;
 return 10**Math.max(-6,Math.min(6,Math.round(Math.log10(4/height))));
}
