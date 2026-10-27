// Image and markers share one world transform. Offscreen markers stay anchored.
const views={overview:{x:.5,y:.5,zoom:1,title:'De werkplaats'},records:{x:.15,y:.51,zoom:3.8,title:'De platenkast',label:'Door de LP’s bladeren ↗',href:'player.html#browse'},turntable:{x:.425,y:.62,zoom:4.2,title:'De draaitafel',label:'LP op de draaitafel leggen ↗',href:'player.html'},workbench:{x:.89,y:.59,zoom:3.8,title:'De werkbank',label:'Werkbank van dichtbij ↗',href:'assets/workbench.png?v=stone-room-1'}};
const stage=document.getElementById('stage'),world=document.getElementById('room-world'),back=document.getElementById('back'),action=document.getElementById('topic-action'),link=document.getElementById('topic-link');
const buttons=[...document.querySelectorAll('[data-view]')];let current='overview';
function show(key){const v=views[key];if(!v)return;current=key;
const x=Math.max(.5/v.zoom,Math.min(1-.5/v.zoom,v.x)),y=Math.max(.5/v.zoom,Math.min(1-.5/v.zoom,v.y));
world.style.transform=`translate(${(0.5-v.zoom*x)*100}%,${(0.5-v.zoom*y)*100}%) scale(${v.zoom})`;
world.style.setProperty('--inverse-zoom',String(1/v.zoom));stage.dataset.view=key;
document.getElementById('view-title').textContent=v.title;back.hidden=key==='overview';action.hidden=key==='overview';if(v.href){link.href=v.href;link.textContent=v.label;}
for(const b of buttons){b.setAttribute('aria-pressed',String(b.dataset.view===key));b.tabIndex=key==='overview'||b.dataset.view===key?0:-1;}}
for(const b of buttons)b.addEventListener('click',()=>show(b.dataset.view));
back.addEventListener('click',()=>{const previous=current;show('overview');buttons.find(b=>b.dataset.view===previous)?.focus({preventScroll:true});});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&current!=='overview'){e.preventDefault();back.click();}});show('overview');
