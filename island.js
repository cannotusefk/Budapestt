/* Original isometric illustrations. No map engine or build step is required. */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const colors={stone:'#f2e5c5',light:'#fff2d6',shade:'#cdbd99',roof:'#b9654b',roofDark:'#904c3d',green:'#5f8875',greenDark:'#456e60'};
const positions={1:[730,300],2:[300,300],3:[350,565],4:[460,345],5:[610,555],6:[950,500],7:[1155,400],8:[1010,225],9:[920,715],10:[790,510]};
const shortNames={1:'國會大廈',2:'漁人堡',3:'布達城堡',4:'馬加什教堂',5:'塞切尼鏈橋',6:'聖伊什特萬聖殿',7:'塞切尼溫泉',8:'英雄廣場',9:'菸草街猶太會堂',10:'河岸之鞋'};
const regions={1:'pest',2:'buda',3:'buda',4:'buda',5:'buda',6:'pest',7:'park',8:'park',9:'pest',10:'pest'};
let selected=null, filter='all', route='castle', routeOn=false, scale=1, panX=0, panY=0, lastFocus=null;
let visited=new Set();
try{const saved=JSON.parse(localStorage.getItem('budapest-explored')||'[]');if(Array.isArray(saved))visited=new Set(saved.filter(id=>sights.some(s=>s.id===id)));}catch{}
const p=(x,y,z=0)=>[(x-y)*.86,(x+y)*.43-z];
const pts=points=>points.map(v=>v.map(n=>Math.round(n*100)/100).join(',')).join(' ');
const poly=(points,fill,extra='')=>`<polygon points="${pts(points)}" fill="${fill}" ${extra}/>`;
const line=(points,color,width=1,extra='')=>`<polyline points="${pts(points)}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`;
function box(x,y,z,w,d,h,top=colors.stone,left=colors.shade,right=colors.stone){
  return poly([p(x,y+d,z),p(x+w,y+d,z),p(x+w,y+d,z+h),p(x,y+d,z+h)],left)+poly([p(x+w,y,z),p(x+w,y+d,z),p(x+w,y+d,z+h),p(x+w,y,z+h)],right)+poly([p(x,y,z+h),p(x+w,y,z+h),p(x+w,y+d,z+h),p(x,y+d,z+h)],top);
}
function roof(x,y,z,w,d,h,color=colors.roof){return poly([p(x,y,z),p(x+w,y,z),p(x+w,y+d/2,z+h),p(x,y+d/2,z+h)],color)+poly([p(x,y+d/2,z+h),p(x+w,y+d/2,z+h),p(x+w,y+d,z),p(x,y+d,z)],colors.roofDark)+poly([p(x+w,y,z),p(x+w,y+d,z),p(x+w,y+d/2,z+h)],'#c57d57');}
function windowAt(x,y,z,w=5,h=10,side='front'){
 const points=side==='front'?[p(x,y,z),p(x+w,y,z),p(x+w,y,z+h),p(x,y,z+h)]:[p(x,y,z),p(x,y+w,z),p(x,y+w,z+h),p(x,y,z+h)];return poly(points,'#526d68','class="window" opacity=".8"');
}
function house(x,y,w=25,d=22,h=26,color=colors.stone){let s=box(x,y,0,w,d,h,'#fff2d7','#cbbb96',color)+roof(x,y,h,w,d,12);for(let a=5;a<w-3;a+=9)s+=windowAt(x+a,y+d,h*.35,4,7);for(let a=5;a<d-3;a+=9)s+=windowAt(x+w,y+a,h*.35,4,7,'side');return s;}
function cylinder(x,y,z,r,h,color=colors.stone){let s='';const n=12;for(let i=0;i<n;i++){const a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n;s+=poly([p(x+Math.cos(a)*r,y+Math.sin(a)*r,z),p(x+Math.cos(b)*r,y+Math.sin(b)*r,z),p(x+Math.cos(b)*r,y+Math.sin(b)*r,z+h),p(x+Math.cos(a)*r,y+Math.sin(a)*r,z+h)],i<6?color:'#c8b996');}const c=p(x,y,z+h);return s+`<ellipse cx="${c[0]}" cy="${c[1]}" rx="${r*1.216}" ry="${r*.608}" fill="${colors.light}"/>`;}
function cone(x,y,z,r,h,color=colors.roof){let s='';for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;s+=poly([p(x+Math.cos(a)*r,y+Math.sin(a)*r,z),p(x+Math.cos(b)*r,y+Math.sin(b)*r,z),p(x,y,z+h)],i<6?color:colors.roofDark);}return s;}
function dome(x,y,z,r,h,color=colors.green){const c=p(x,y,z),rx=r*1.216,ry=r*.608;return `<path d="M${c[0]-rx},${c[1]} C${c[0]-rx},${c[1]-h} ${c[0]+rx},${c[1]-h} ${c[0]+rx},${c[1]} Q${c[0]},${c[1]+ry} ${c[0]-rx},${c[1]}" fill="${color}"/><path d="M${c[0]},${c[1]-h*.75} Q${c[0]+rx*.45},${c[1]-h*.4} ${c[0]+rx*.36},${c[1]+ry*.8}" fill="none" stroke="#a6c0a3" stroke-width="1" opacity=".6"/>`+line([p(x,y,z+h*.8),p(x,y,z+h+7)],'#736f50',2);}
function tree(x,y,r=13){const c=p(x,y,0);return `<ellipse cx="${c[0]+8}" cy="${c[1]+5}" rx="${r*1.1}" ry="${r*.4}" fill="#667b4b" opacity=".17"/>`+box(x-1,y-1,0,3,3,15,'#8a805e','#8a805e','#a3916d')+`<ellipse cx="${c[0]}" cy="${c[1]-25}" rx="${r}" ry="${r*1.12}" fill="#6f9365"/><ellipse cx="${c[0]-r*.2}" cy="${c[1]-29}" rx="${r*.78}" ry="${r*.8}" fill="#9caf78"/><ellipse cx="${c[0]-r*.37}" cy="${c[1]-33}" rx="${r*.44}" ry="${r*.45}" fill="#bdc88e"/>`;}
function pine(x,y,h=44){let s=box(x-1,y-1,0,2,2,12,'#897957','#897957','#897957');for(let j=0;j<3;j++){let z=8+j*10,r=15-j*3;s+=cone(x,y,z,r,h-z,'#64846a');}return s;}
function lamp(x,y){const c=p(x,y,0);return line([c,p(x,y,28)],'#657568',1.8)+`<circle class="window" cx="${c[0]}" cy="${c[1]-30}" r="3.5" fill="#efddb2"/>`;}
function paving(x,y,w,d){return box(x,y,.3,w,d,1,'#dfd6b8','#c4b799','#d5c7a6');}
function tower(x,y,r=9,h=52){return cylinder(x,y,0,r,h)+cylinder(x,y,h,r+2,5)+cone(x,y,h+5,r+4,26,colors.stone);}
function palace(){let s=paving(-77,-60,155,117);s+=box(-68,-22,2,136,40,43)+roof(-68,-22,45,136,40,13,colors.green);for(let a=-60;a<65;a+=11){s+=windowAt(a,18,13,5,13)+windowAt(a,18,31,5,9);}s+=box(-22,-26,2,44,48,60)+cylinder(0,0,62,20,13)+dome(0,0,75,25,48);s+=house(-72,14,28,31,31)+house(46,14,28,31,31);return s;}
function parliament(){let s=paving(-92,-47,184,94);s+=box(-85,-19,2,170,38,41)+roof(-85,-19,43,170,38,16);for(let a=-77;a<80;a+=11){s+=windowAt(a,19,13,4,18);s+=cone(a,-19,55,3.5,14,colors.stone);}for(let a of [-68,-42,42,68])s+=box(a-5,-26,0,10,48,52)+cone(a,-2,54,8,29,colors.stone);s+=box(-23,-23,0,46,46,54)+cylinder(0,0,54,22,19)+dome(0,0,73,27,57,colors.roofDark);for(let a=-18;a<=18;a+=9)s+=windowAt(a,-23,12,4,22);return s;}
function bastion(){let s=paving(-76,-45,150,91);s+=box(-70,4,0,140,18,22);for(let a=-60;a<65;a+=18)s+=windowAt(a,4,2,8,14);s+=tower(-65,10,12,46)+tower(-22,10,10,37)+tower(22,10,10,37)+tower(65,10,12,46);s+=box(-32,-37,0,64,17,10)+tower(-30,-29,8,28)+tower(30,-29,8,28);return s;}
function church(){let s=paving(-60,-53,121,111);s+=box(-31,-35,0,64,62,48)+roof(-31,-35,48,64,62,33);for(let a=-25;a<28;a+=10)s+=windowAt(a,27,13,4,24);s+=box(24,6,0,19,22,83)+cone(33,17,83,14,51,colors.stone);s+=box(-35,6,0,19,22,56)+cone(-26,17,56,14,25,colors.green);for(let i=0;i<8;i++)s+=line([p(-29+i*8,-35,49),p(-29+i*8,-4,81)],i%2?'#d6b267':'#618b80',2);return s;}
function basilica(){let s=paving(-66,-58,135,115);s+=box(-40,-27,0,83,54,46)+roof(-40,-27,46,83,54,9,colors.green);s+=cylinder(0,0,47,24,19)+dome(0,0,66,28,42);for(let x of [-41,40])s+=box(x-10,16,0,20,20,67)+dome(x,26,67,13,24);for(let a=-24;a<26;a+=10)s+=box(a,27,0,4,4,31);s+=poly([p(-34,29,33),p(34,29,33),p(0,29,50)],colors.light);return s;}
function synagogue(){let s=paving(-69,-50,138,105);s+=box(-49,-29,0,98,57,47)+roof(-49,-29,47,98,57,17);for(let a=-39;a<45;a+=12)s+=windowAt(a,28,16,5,20);for(let x of [-43,43])s+=cylinder(x,28,0,11,65,'#e1c99f')+cylinder(x,28,65,13,5)+dome(x,28,70,14,30,'#8c6951');s+=poly([p(-34,28,46),p(34,28,46),p(0,28,66)],'#e8d2a5');for(let z=8;z<45;z+=8)s+=line([p(-38,28,z),p(36,28,z)],'#b38b65',1.8);return s;}
function baths(){let s=paving(-83,-60,165,121);s+=house(-80,-53,158,25,32,'#e8c67b')+house(-80,-28,23,85,28,'#eacb84')+house(55,-28,23,85,28,'#eacb84');s+=box(-42,-12,1,84,50,3,'#efe1b8','#cfbe94','#e3d0a5')+box(-37,-7,4,74,40,1,'#6ab5bc','#4e9ca5','#6ab5bc');for(let i=-25;i<25;i+=12)s+=line([p(i,-1,6),p(i+30,12,6)],'#c1e3d5',1.6);s+=cylinder(0,-43,30,17,7)+dome(0,-43,37,20,26,'#a98854');for(let x of [-48,45])s+=box(x,-2,3,3,4,12,'#e7dab4','#cdbb91','#e8dcb9');return s;}
function heroes(){let s=paving(-75,-57,150,115);for(let a=-65;a<65;a+=17)s+=box(a,-37,0,5,5,36);s+=box(-69,-41,36,141,12,7);s+=box(-14,-1,0,28,28,12)+box(-7,6,12,14,14,66);s+=cylinder(0,13,78,10,5)+box(-2,11,83,4,4,14,'#658070','#435e55','#658070');s+=line([p(-16,13,93),p(0,13,87),p(16,13,93)],'#658070',4);for(let x of [-39,39])s+=box(x-7,17,0,14,14,10)+box(x-3,21,10,6,6,12,'#678473','#4c6a5d','#678473');return s;}
function shoes(){let s=paving(-74,-45,150,95);s+=box(-70,-27,0,140,10,7,'#e9dfbf','#cabb9b','#d1c2a0');for(let i=0;i<8;i++){let x=-53+i*14,y=8+(i%3)*9;s+=box(x,y,1,6,13,4,'#6c7467','#505b51','#747d6e')+box(x,y+10,4,6,3,5,'#6c7467','#505b51','#747d6e');}return s;}
function bridge(){let s=paving(-88,-40,176,80);s+=box(-85,-9,4,170,20,5,'#cbbfa1','#a99e80','#c7bb9c');for(let x of [-53,53]){s+=box(x-12,-15,0,24,9,55)+box(x-12,12,0,24,9,55)+box(x-15,-17,53,30,40,8);s+=poly([p(x-11,-17,61),p(x+11,-17,61),p(x,-17,70)],'#dfd3b1');}for(let y of [-13,14]){const a=p(-80,y,13),b=p(-53,y,52),c=p(53,y,52),d=p(80,y,13),m=p(0,y,13);s+=`<path d="M${a} Q${p(-64,y,27)} ${b} Q${m} ${c} Q${p(66,y,26)} ${d}" fill="none" stroke="#637b70" stroke-width="2.5"/>`;for(let x=-72;x<80;x+=13){const z=Math.abs(x)<53?16+36*(x*x)/(53*53):24;s+=line([p(x,y,12),p(x,y,z)],'#667b6b',1.1);}}return s;}
const art={1:parliament,2:bastion,3:palace,4:church,5:bridge,6:basilica,7:baths,8:heroes,9:synagogue,10:shoes};
function island(s){
 const [cx,cy]=positions[s.id],r=s.id===1?119:108;
 const coords=Array.from({length:6},(_,i)=>{let a=(i*60+30)*Math.PI/180;return [Math.cos(a)*r,Math.sin(a)*r];});
 const top=coords.map(([x,y])=>p(x,y,0)),base=coords.map(([x,y])=>p(x,y,-19));
 let land=`<ellipse cx="12" cy="38" rx="${r*1.16}" ry="${r*.59}" fill="#4b796f" opacity=".18" filter="url(#soft-shadow)"/>`;
 for(let i=0;i<6;i++){const j=(i+1)%6;land+=poly([top[i],top[j],base[j],base[i]],i<3?'#c7bc96':'#b4af8d');}
 land+=poly(top,'url(#land)','class="land-top" stroke="#e9e5ca" stroke-width="4"');
 land+=poly(top.map(([x,y])=>[x*1.045,y*1.045]),'none','class="selection-ring"');
 let details='';
 const trees=[[-77,-24,11],[70,-20,13],[-68,49,12],[24,74,10],[70,38,12]];
 trees.forEach(([x,y,r],i)=>{if(s.id===5&&i<2)return;details+=tree(x,y,r);});
 details+=lamp(-52,57)+lamp(53,47);
 if([1,3,8,9].includes(s.id))details+=pine(-25,-79,38)+pine(7,-79,32);
 if([2,3,6,9].includes(s.id))details+=house(-83,-65,23,18,18,'#e4cfac');
 const w=shortNames[s.id].length*12+44;
 return `<g class="island" id="island-${s.id}" data-id="${s.id}" transform="translate(${cx} ${cy})" role="button" tabindex="0" aria-label="探索${s.name}">${land}<g class="building">${art[s.id]()}</g>${details}<g class="pin-label" transform="translate(${-w/2} 72)"><rect width="${w}" height="30" rx="15"/><text class="pin-number" x="13" y="20">${String(s.id).padStart(2,'0')}</text><text x="36" y="20">${shortNames[s.id]}</text></g></g>`;
}
$('#islands').innerHTML=[...sights].sort((a,b)=>positions[a.id][1]-positions[b.id][1]).map(island).join('');
// Small outlying islands give the city a river landscape, rather than a flat diagram.
function miniIsland(cx,cy,r,kind){const points=Array.from({length:7},(_,i)=>[cx+Math.cos(i*Math.PI*2/7)*r,cy+Math.sin(i*Math.PI*2/7)*r*.48]);let s=poly(points.map(([x,y])=>[x,y+12]),'#b7b696')+poly(points,'#d7dbb9','stroke="#eae6cb" stroke-width="3"');s+=`<g transform="translate(${cx} ${cy})">`;s+=kind==='pine'?pine(-8,-2,40)+pine(16,9,28):tree(0,0,r*.35)+tree(-20,12,r*.23);return s+'</g>';}
$('#scenery').innerHTML=miniIsland(150,640,54,'pine')+miniIsland(1210,690,69,'tree')+miniIsland(590,140,45,'pine')+miniIsland(130,365,36,'tree')+miniIsland(1170,125,43,'pine')+`<text x="300" y="170" text-anchor="middle" fill="#7c927b" font-family="Georgia,serif" font-size="17" letter-spacing="7">BUDA</text><text x="1000" y="100" text-anchor="middle" fill="#7c927b" font-family="Georgia,serif" font-size="17" letter-spacing="7">PEST</text>`;
function footbridge(a,b){return line([a,b],'#abb49a',17)+line([a,b],'#e5d9ba',13)+line([a,b],'#f3e9cc',1.5);}
$('#connections').innerHTML=footbridge([300,355],[350,510])+footbridge([370,320],[420,335])+footbridge([440,570],[520,555])+footbridge([700,555],[735,530])+footbridge([775,355],[790,455])+footbridge([870,510],[895,500])+footbridge([950,550],[920,660])+footbridge([1050,280],[1110,350]);
function boat(x,y,k=1){return `<g transform="translate(${x} ${y}) scale(${k})"><g class="sailboat"><ellipse cy="11" rx="28" ry="6" fill="#649b94" opacity=".18"/><path d="M-24 4 L22 4 L14 13 L-15 12Z" fill="#b97653"/><path d="M-24 4 L22 4 L5 -3Z" fill="#fff6da"/><path d="M0 2 L0 -42 L-22 0Z" fill="#fcf5dc"/><path d="M3 0 L3 -33 L18 -1Z" fill="#e0cda4"/><path d="M0 -44V5" stroke="#8b8c6d" stroke-width="1.5"/></g></g>`;}
$('#boats').innerHTML=boat(560,320,.65)+boat(665,730,.8)+boat(1090,600,.7)+boat(200,500,.55)+boat(1235,520,.55);
function updateProgress(){ $('#visited-count').textContent=String(visited.size).padStart(2,'0');$$('.sight-item').forEach(el=>el.classList.toggle('visited',visited.has(Number(el.dataset.id)))); }
function renderList(){const q=$('#search').value.trim().toLowerCase();let visible=[];$('#sight-list').innerHTML=sights.filter(s=>{const ok=(filter==='all'||regions[s.id]===filter)&&[s.name,s.en,s.area,s.desc,s.title].join(' ').toLowerCase().includes(q);if(ok)visible.push(s.id);return ok;}).map(s=>`<button class="sight-item" data-id="${s.id}" aria-label="查看${s.name}"><span class="item-number">${String(s.id).padStart(2,'0')}</span><span class="item-text"><strong>${s.name}</strong><small>${s.area} · ${s.duration}</small></span><span class="item-arrow">↗</span></button>`).join('');$('#empty-state').hidden=visible.length>0;$$('.island').forEach(el=>el.classList.toggle('dimmed',!visible.includes(Number(el.dataset.id))));updateProgress();}
renderList();
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
function smallScreen(){return matchMedia('(max-width:800px)').matches;}
function sidebar(open){if(smallScreen())document.body.classList.toggle('sidebar-hidden',!open);else document.body.classList.toggle('no-sidebar',!open);$('#list-toggle').setAttribute('aria-expanded',String(open));$('#sidebar').inert=!open;syncScrim();}
function syncScrim(){$('#panel-scrim').hidden=!smallScreen()||($('#detail').hidden&&document.body.classList.contains('sidebar-hidden'));}
function select(id){
 const s=sights.find(s=>s.id===id);if(!s)return;if($('#detail').hidden)lastFocus=document.activeElement;selected=id;visited.add(id);try{localStorage.setItem('budapest-explored',JSON.stringify([...visited]));}catch{}
 $$('.island').forEach(el=>el.classList.toggle('selected',Number(el.dataset.id)===id));updateProgress();
 $('#detail').innerHTML=`<div class="detail-image"><div class="photo-fallback">${s.name}<br>正在載入實景照片…</div><img src="${s.image}" alt="${s.name}實景照片"><button class="detail-close" aria-label="關閉景點介紹">×</button><a class="detail-credit" href="${s.credit}" target="_blank" rel="noopener">照片來源與授權 ↗</a></div><div class="detail-content"><div class="detail-kicker"><span>ISLAND ${String(id).padStart(2,'0')} / 10</span><span>${s.area}</span></div><h2 id="detail-name">${s.name}</h2><div class="detail-en">${s.en}</div><h3>${s.title}</h3><p class="detail-description">${s.desc}</p><div class="detail-meta"><span>◷</span><div><small>建議停留</small><strong>${s.duration}</strong></div></div><div class="detail-tip"><b>旅行筆記 / TRAVEL NOTE</b>${s.tip}</div><a class="primary" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.en+' Budapest')}" target="_blank" rel="noopener">在 Google 地圖查看 ↗</a><p class="detail-note">停留時間不含交通與排隊。開放時間、票價與預約規則請以景點官方公告為準。</p><div class="detail-nav"><button data-next="${id===1?10:id-1}">← 上一座島</button><button data-next="${id===10?1:id+1}">下一座島 →</button></div></div>`;
 const img=$('#detail img');img.addEventListener('load',()=>$('#detail .photo-fallback').hidden=true);img.addEventListener('error',()=>{img.hidden=true;$('#detail .photo-fallback').innerHTML=s.name+'<br>照片暫時無法載入，請點照片來源查看。';});
 $('#detail').hidden=false;$('#detail').scrollTop=0;document.body.classList.add('detail-open');$('#sidebar').inert=true;$('#detail .detail-close').focus({preventScroll:true});syncScrim();
}
function closeDetail(){if($('#detail').hidden)return;$('#detail').hidden=true;document.body.classList.remove('detail-open');$('#sidebar').inert=smallScreen()?document.body.classList.contains('sidebar-hidden'):document.body.classList.contains('no-sidebar');syncScrim();if(lastFocus?.isConnected&&!lastFocus.closest('#detail'))lastFocus.focus({preventScroll:true});}
$('#islands').addEventListener('click',e=>{if(dragged)return;const el=e.target.closest('.island');if(el)select(Number(el.dataset.id));});
$('#islands').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(Number(e.target.closest('.island').dataset.id));}});
$('#sight-list').addEventListener('click',e=>{const el=e.target.closest('[data-id]');if(el)select(Number(el.dataset.id));});
$('#detail').addEventListener('click',e=>{if(e.target.closest('.detail-close'))closeDetail();const next=e.target.closest('[data-next]');if(next)select(Number(next.dataset.next));});
$('#search').addEventListener('input',renderList);
$$('[data-area]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.area;$$('[data-area]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));renderList();}));
function showTab(name){const isSights=name==='sights';$('#sights-panel').hidden=!isSights;$('#routes-panel').hidden=isSights;$('#tab-sights').setAttribute('aria-selected',String(isSights));$('#tab-routes').setAttribute('aria-selected',String(!isSights));}
$('#tab-sights').onclick=()=>showTab('sights');$('#tab-routes').onclick=()=>showTab('routes');
$$('[role=tab]').forEach(el=>el.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const target=el.id==='tab-sights'?$('#tab-routes'):$('#tab-sights');target.click();target.focus();}}));
const routes={castle:[2,4,3,5],city:[1,10,6,9],park:[8,7]};
function drawRoute(){const ids=routes[route];const points=ids.map(id=>{const [x,y]=positions[id];return[x,y+42];});$('#route-layer').innerHTML=`<polyline points="${pts(points)}" class="route-path"/>`+points.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="12" fill="#ad6347" stroke="#fff4d9" stroke-width="2"/><text x="${x}" y="${y+4}" text-anchor="middle" fill="white" font-family="Georgia" font-size="12">${i+1}</text>`).join('');$('#route-layer').toggleAttribute('hidden',!routeOn);$('#route-toggle').setAttribute('aria-pressed',String(routeOn));$$('[data-route]').forEach(el=>el.classList.toggle('active',routeOn&&el.dataset.route===route));}
$$('[data-route]').forEach(el=>el.onclick=()=>{route=el.dataset.route;routeOn=true;drawRoute();if(smallScreen())sidebar(false);toast('已顯示順遊路線，依數字順序探索。');});
$('#route-toggle').onclick=()=>{routeOn=!routeOn;drawRoute();if(routeOn){showTab('routes');if(!smallScreen())sidebar(true);toast('點選「順遊提案」，切換不同路線。');}};
$$('[data-time]').forEach(b=>b.onclick=()=>{document.body.classList.remove('night','sunset');if(b.dataset.time!=='day')document.body.classList.add(b.dataset.time);$$('[data-time]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
$('#labels-toggle').onclick=()=>{const off=document.body.classList.toggle('labels-off');$('#labels-toggle').setAttribute('aria-pressed',String(!off));};
$('#motion-toggle').onclick=()=>{const paused=document.body.classList.toggle('paused');$('#motion-toggle').setAttribute('aria-pressed',String(paused));$('#motion-toggle').setAttribute('aria-label',paused?'播放船隻動畫':'暫停船隻動畫');$('#motion-toggle').textContent=paused?'▷':'Ⅱ';};
function transform(){$('#scene').setAttribute('transform',`translate(${panX} ${panY}) translate(700 480) scale(${scale}) translate(-700 -480)`);$('#zoom-value').textContent=Math.round(scale*100)+'%';}
function zoom(delta){scale=Math.max(.65,Math.min(2.2,scale+delta));transform();}
$('#zoom-in').onclick=()=>zoom(.15);$('#zoom-out').onclick=()=>zoom(-.15);$('#home').onclick=()=>{scale=1;panX=panY=0;transform();toast('回到多瑙河全景。');};
let drag=null,dragged=false;const viewport=$('#map-viewport');
viewport.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,px:panX,py:panY,id:e.pointerId};dragged=false;});
viewport.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5){dragged=true;viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');const factor=1400/$('#island-map').getBoundingClientRect().width;panX=Math.max(-750,Math.min(750,drag.px+dx*factor));panY=Math.max(-550,Math.min(550,drag.py+dy*factor));transform();}});
function endDrag(){drag=null;viewport.classList.remove('dragging');setTimeout(()=>dragged=false,0);}
viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
viewport.addEventListener('keydown',e=>{if(e.target!==viewport)return;const dir={ArrowLeft:[35,0],ArrowRight:[-35,0],ArrowUp:[0,35],ArrowDown:[0,-35]}[e.key];if(dir){e.preventDefault();panX+=dir[0];panY+=dir[1];transform();}if(e.key==='+'||e.key==='=')zoom(.15);if(e.key==='-')zoom(-.15);});
$('#list-toggle').onclick=()=>{closeDetail();const open=smallScreen()?document.body.classList.contains('sidebar-hidden'):document.body.classList.contains('no-sidebar');sidebar(open);};
$('#sidebar-close').onclick=()=>sidebar(false);$('#panel-scrim').onclick=()=>{closeDetail();sidebar(false);};
$('#help').onclick=()=>$('#help-dialog').showModal();$('#credits').onclick=()=>$('#credits-dialog').showModal();
$('#credits-list').innerHTML=sights.map(s=>`<a href="${s.credit}" target="_blank" rel="noopener">${String(s.id).padStart(2,'0')}　${s.name} ↗</a>`).join('');
$$('.dialog-close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetail();if(e.key==='Tab'&&!$('#detail').hidden){const focusables=[...$('#detail').querySelectorAll('button,a[href]')];const first=focusables[0],last=focusables.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
if(smallScreen())sidebar(false);else sidebar(true);
matchMedia('(max-width:800px)').addEventListener('change',()=>{sidebar(!smallScreen());if(!$('#detail').hidden)$('#sidebar').inert=true;});
drawRoute();
