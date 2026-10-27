import fs from 'node:fs';

const kallax={x:-1.1,y:.08,z:-4.25};
const shelf={x:.35,y:.08,z:-3.93};
const deck={x:kallax.x,y:kallax.y+.7635,z:kallax.z};
const props=[
  {id:'base-kallax',choice:'K1',name:'Kallax 77 × 147',file:'kallax-selected-ready',transform:kallax},
  {id:'base-industrial-shelf',choice:'K3',name:'Hout en metaal',file:'industrial-shelf-ready',transform:{...shelf,ry:90}},
  {id:'base-turntable',choice:'D2',name:'Pioneer PLX-1000',file:'dj-turntable',transform:deck},
  {id:'base-vinyl',name:'12-inch vinyl',file:'vinyl-record-ready',transform:{x:deck.x-.0454475,y:deck.y+.101675,z:deck.z-.0002205}},
  {id:'base-speaker-left',choice:'S3',name:'KRK Classic 5 links',file:'krk-classic5-ready',transform:{x:kallax.x-.50,y:deck.y,z:kallax.z,ry:10}},
  {id:'base-speaker-right',choice:'S3',name:'KRK Classic 5 rechts',file:'krk-classic5-ready',transform:{x:kallax.x+.50,y:deck.y,z:kallax.z,ry:-10}},
  {id:'base-workbench-one',choice:'W1',name:'Oude werkbank',file:'old-workbench-ready',transform:{x:-2.05,y:.055,z:-1.55,ry:90}},
  {id:'base-workbench-two',choice:'W2',name:'Garagewerkbank',file:'garage-desk-ready',transform:{x:-1.25,y:.04,z:2.8,ry:90}},
  {id:'base-motorcycle',choice:'B1',name:'Café racer',file:'cafe-racer',transform:{x:1.5,y:.56,z:-1.9,ry:-12,scale:.68}},
  {id:'base-puch',choice:'B3',name:'Puch 1978',file:'puch-moped-ready',transform:{x:1.65,y:.025,z:.7,ry:-12}},
  {id:'base-wood-crates',choice:'C2',name:'Houten melkkratten',file:'wood-milk-crates-ready',transform:{x:1.75,y:.09,z:-4.1,ry:-15}},
  {id:'base-plastic-crate',choice:'C3',name:'Kunststof krat',file:'plastic-crate-ready',transform:{x:-.45,y:.025,z:.4,ry:10}},
  {id:'base-wall-lamp',choice:'L2',name:'Industriële wandlamp',file:'wall-lamp-ready',transform:{x:.6,y:2.5,z:-4.65}},
  {id:'base-pendant',choice:'L3',name:'Industriële lamp',file:'industrial-lamp-ready',transform:{x:0,y:3.20215,z:-2}}
];
const pending=props.filter(prop=>!fs.existsSync(`public/assets/models/${prop.file}.glb`));
const config={
  schemaVersion:1,
  environment:{url:'/assets/models/scanned-workshop.glb',type:'glb',transform:{scale:.05}},
  views:{
    overview:{position:[0,1.75,3.25],target:[-.1,1.15,-1.9]},
    records:{position:[-.8,1.48,-2.7],target:[-.75,.68,-4.15]},
    turntable:{position:[-1.05,1.42,-3.35],target:[-1.1,.91,-4.25]},
    recordAction:{position:[-1.15,1.62,-2.85],target:[-1.15,1.09,-4.05]},
    workbenches:{position:[-.15,1.7,-.6],target:[-2,1.2,-1.5]},
    vehicles:{position:[-.2,1.6,.8],target:[1.5,.7,-.9]},
    projects:{position:[-.15,1.7,-.6],target:[-2,1.2,-1.5]}
  },
  walkBounds:{min:[-2.2,-3.45],max:[2.15,4.2]},
  obstacles:[
    {min:[-2.47,-2.83],max:[-1.65,-.27]},
    {min:[.8,-3.04],max:[2.1,-.69]},
    {min:[1.14,-.28],max:[2.17,1.68]},
    {min:[-.19,-4.48],max:[.89,-3.38]},
    {min:[-1.86,-4.46],max:[-.34,-4.04]}
  ],
  lights:[
    {name:'Industriële hanglamp',position:[0,3.35,-2],intensity:.45,color:[1,.88,.70],range:7},
    {name:'Werkbankverlichting',position:[-1.8,1.7,-1.2],intensity:.18,color:[.95,.98,1],range:3}
  ],
  anchors:{records:[],sleeveAtDeck:{x:shelf.x,y:shelf.y+.9928+.1575,z:shelf.z-.10,ry:-12,scale:.315}},
  props:props.filter(prop=>!pending.includes(prop)).map(({file,...prop})=>({...prop,url:`/assets/models/${file}.glb`})),
  pendingAssets:pending.map(({choice,name})=>({choice,name}))
};
// Full-depth gatefold sleeves, leaning 2.5 degrees. Their lower edges rest on
// the measured shelf surfaces; the frontmost spine stays inside the cabinet.
const halfHeight=.1575*(Math.cos(2.5*Math.PI/180)+Math.sin(2.5*Math.PI/180));
for(const [row,baseY] of [.3898,.036].entries())for(const [column,x] of [-.525,-.175,.175,.525].entries()){
  const offsets=row===0&&column<2?[-.065,.065]:[0];
  for(const offset of offsets)config.anchors.records.push({x:kallax.x+x+offset,y:kallax.y+baseY+halfHeight+.0006,z:kallax.z+.006,ry:74,rz:-2.5,scale:.315});
}
fs.writeFileSync('public/assets/room.json',JSON.stringify(config,null,2)+'\n');
console.log(JSON.stringify({placed:config.props.map(prop=>prop.name),pending:config.pendingAssets},null,2));
