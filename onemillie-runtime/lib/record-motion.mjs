// World-space poses shared by the renderer and motion checks. All dimensions are metres.
export const RECORD_DURATION = 6.4;
const pose = t => ({x:t.x,y:t.y,z:t.z,rx:t.rx||0,ry:t.ry||0,rz:t.rz||0,scale:t.scale??1});
export function recordTimeline({shelf,sleeveAtDeck,platter,waypoints={}}) {
  const home=pose(shelf),rest=pose(sleeveAtDeck),deck=pose(platter);
  // Measured rooms supply complete route poses. Existing scenes retain their path.
  // Canonical home/deck endpoints remain authoritative even with custom waypoints.
  const pulled=pose({...home,z:home.z+.43,...waypoints.pulled});
  const held=pose({...home,x:deck.x-.12,y:deck.y+.36,z:deck.z+.43,rx:0,ry:0,rz:0,...waypoints.held});
  const inside=pose({...deck,x:held.x,y:held.y,z:held.z,rx:90,...waypoints.inside});
  const extracted=pose({...inside,x:inside.x+.325,...waypoints.extracted});
  const above=pose({...deck,y:deck.y+.22,...waypoints.above});
  return [
    {time:0,sleeve:home,vinyl:inside,visible:false,phase:'Naar de platenkast'},
    {time:.8,sleeve:home,vinyl:inside,visible:false,phase:'Hoes pakken'},
    ...(waypoints.lifted?[{time:1.25,sleeve:pose(waypoints.lifted),vinyl:inside,visible:false,phase:'Hoes uit de bak tillen'}]:[]),
    {time:1.9,sleeve:pulled,vinyl:inside,visible:false,phase:'Hoes pakken'},
    {time:2.4,sleeve:held,vinyl:inside,visible:true,phase:'LP uit de hoes halen'},
    {time:3.7,sleeve:held,vinyl:extracted,visible:true,phase:'LP naar de draaitafel'},
    {time:4.8,sleeve:rest,vinyl:above,visible:true,phase:'LP op de draaitafel leggen'},
    {time:5.7,sleeve:rest,vinyl:deck,visible:true,phase:'LP op de draaitafel leggen'},
    {time:RECORD_DURATION,sleeve:rest,vinyl:deck,visible:true,phase:'Klaar'}
  ];
}
export function sampleRecordTimeline(frames,elapsed,returning=false) {
  const end=frames.at(-1).time,t=Math.max(0,Math.min(end,returning?end-elapsed:elapsed));
  let i=0;while(i<frames.length-2&&t>=frames[i+1].time)i++;
  const a=frames[i],b=frames[i+1],u=(t-a.time)/(b.time-a.time),s=u*u*(3-2*u);
  const lerp=(first,last)=>Object.fromEntries(Object.keys(first).map(k=>[k,first[k]+(last[k]-first[k])*s]));
  return {sleeve:lerp(a.sleeve,b.sleeve),vinyl:lerp(a.vinyl,b.vinyl),visible:t>=2.4,phase:returning?(t>3.7?'LP van de draaitafel halen':t>2.4?'LP terug in de hoes':'Hoes terug in de kast'):a.phase};
}
