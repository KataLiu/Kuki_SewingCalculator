/* Millimetre geometry. Tutorial coordinates plus explicit prototype curve assumptions. */
(function(root){
'use strict';
const pt=(x,y)=>({x,y}),add=(a,b)=>pt(a.x+b.x,a.y+b.y),sub=(a,b)=>pt(a.x-b.x,a.y-b.y),mul=(a,k)=>pt(a.x*k,a.y*k),cross=(a,b)=>a.x*b.y-a.y*b.x,len=a=>Math.hypot(a.x,a.y),dist=(a,b)=>len(sub(a,b));
function cubic(a,b,c,d,n=32){const out=[];for(let i=1;i<=n;i++){let t=i/n,u=1-t;out.push(pt(u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y));}return out;}
const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y;},0)/2;
function intersectLines(p,u,q,v){const c=cross(u,v);if(Math.abs(c)<1e-9)return null;return add(p,mul(u,cross(sub(q,p),v)/c));}
function offset(points,edges,allowances){const sign=area(points)>0?1:-1;const lines=points.map((p,i)=>{const v=sub(points[(i+1)%points.length],p),n=mul(pt(v.y,-v.x),sign/len(v));return{p:add(p,mul(n,allowances[edges[i]]||0)),v,n,d:allowances[edges[i]]||0};});const out=[];for(let i=0;i<points.length;i++){const prev=lines[(i+points.length-1)%points.length],next=lines[i],a=add(points[i],mul(prev.n,prev.d)),b=next.p,hit=intersectLines(a,prev.v,b,next.v);if(hit&&dist(hit,points[i])<=Math.max(prev.d,next.d,1)*4+1)out.push(hit);else{out.push(a);if(dist(a,b)>.001)out.push(b);}}return out;}
function selfIntersects(p){for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];for(let j=i+2;j<p.length;j++){if(i===0&&j===p.length-1)continue;const c=p[j],d=p[(j+1)%p.length],u=sub(b,a),v=sub(d,c),den=cross(u,v);if(Math.abs(den)<1e-9)continue;const t=cross(sub(c,a),v)/den,s=cross(sub(c,a),u)/den;if(t>1e-6&&t<1-1e-6&&s>1e-6&&s<1-1e-6)return true;}}return false;}
function path(points,closed=true){return points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(' ')+(closed?' Z':'');}
function bounds(points,pad=0){const xs=points.map(p=>p.x),ys=points.map(p=>p.y);const minX=Math.min(...xs)-pad,minY=Math.min(...ys)-pad;return{x:minX,y:minY,w:Math.max(...xs)+pad-minX,h:Math.max(...ys)+pad-minY};}
function measure(points){return points.slice(1).reduce((s,p,i)=>s+dist(points[i],p),0);}
function draft(v){
const N=(v.neck+v.neckEase)*10,C=(v.chest+v.chestEase)*10,L=(v.back-v.backShorten)*10,s=v.shoulder*10,seam=v.seam*10,taper=v.waistTake*10;
if(L<80)throw Error('调整后的背长至少需为 8 cm；请核对背长与减短量。');
const widthB=C*.3,widthF=C*.2,neckB=N/4,neckF=N/5,depthB=N/8,depthF=N/20,chestY=L/5,frontY=L*.4+v.frontAdd*10;
const waistB=v.waist?((v.waist+v.chestEase)*10*.3):widthB-taper,waistF=v.waist?((v.waist+v.chestEase)*10*.2):widthF-taper*2/3;
const bJ=pt(waistB,L*.6+10),bU=pt(widthB,chestY),sideLen=dist(bJ,bU);
if(waistB<20||waistF<15||bJ.y>L-15)throw Error('腰围或背长组合无法形成当前基础版，请减少收腰量或增加背长。');
if(sideLen<=Math.abs(waistF-widthF)+5)throw Error('腰线变化过大，前后片拼接边无法等长，请调整腰围。');
const fU=pt(widthF,frontY),fJ=pt(waistF,frontY+Math.sqrt(sideLen**2-(waistF-widthF)**2));
const belly=v.bellyLength===null?L*.35:v.bellyLength*10;
if(belly<20||belly>fJ.y-frontY+L*.3)throw Error('腹部长度超出当前基础版范围，请缩短腹部长度。');
const chestGuide=v.frontMeasured===null?C/10-v.frontSub*10:v.frontMeasured*5;
if(chestGuide<=0||chestGuide>=widthF-5)throw Error('前胸宽辅助线必须位于前片内。实测两腿间距按整宽输入，半片采用其一半。');
const make=(name,width,nw,nd,angle,U,J,F)=>{
const rad=angle*Math.PI/180,A=pt(0,0),H=pt(nw,-nd),S=add(H,pt(s*Math.sin(rad),s*Math.cos(rad)));
if(S.x>=width*1.35||S.y>=U.y-8)throw Error(`${name==='back'?'后片':'前片'}肩点超出袖笼可用范围，请减少肩宽、调整角度或增加前胸长／背长。`);
const neckC1=pt(nw*.4,0),neckC2=sub(H,mul(pt(Math.cos(rad),-Math.sin(rad)),Math.min(nw*.3,nd*.9)));
const armDepth=U.y-S.y,k=v.armCurve;
// Cubic armhole ends perpendicular to the side seam; endpoints remain fixed.
const sideV=sub(J,U),sideUnit=mul(sideV,1/len(sideV)),endT=pt(sideUnit.y,-sideUnit.x);
const guide=name==='front'?chestGuide:width/3;
const armC1=pt(guide+(S.x-guide)*(1-k*.65),S.y+armDepth*.35),armC2=sub(U,mul(endT,width*k*.8));
const hemC1=add(J,mul(sideUnit,Math.min(25,Math.abs(F.y-J.y)*.45))),hemC2=pt(Math.max(10,J.x*.48),F.y);
const points=[A],edges=[];const append=(arr,type)=>{for(const p of arr){if(dist(points.at(-1),p)>.0001){edges.push(type);points.push(p);}}};
append(cubic(A,neckC1,neckC2,H),'neck');append([S],'shoulder');append(cubic(S,armC1,armC2,U),'arm');append([J],'side');append(cubic(J,hemC1,hemC2,F),'hem');edges.push('fold');
const allowances={neck:0,arm:0,shoulder:seam,side:seam,hem:v.hemFinish==='fold'?v.hemAllowance*10:0,fold:0};
const cut=offset(points,edges,allowances);if(selfIntersects(points)||selfIntersects(cut))throw Error('当前参数使纸样轮廓交叉。请减少缝份、收腰或曲线调整，再检查纸样。');
return{name,points,edges,cut,allowances,bounds:bounds([...points,...cut],12),A,H,S,U,J,F,controls:{neckC1,neckC2,armC1,armC2,hemC1,hemC2},shoulder:dist(H,S),side:dist(U,J),armLength:measure([S,...cubic(S,armC1,armC2,U,120)]),neckLength:measure([A,...cubic(A,neckC1,neckC2,H,120)]),chestGuide};};
const back=make('back',widthB,neckB,depthB,v.backAngle,bU,bJ,pt(0,L));const front=make('front',widthF,neckF,depthF,v.frontAngle,fU,fJ,pt(0,frontY+belly));
const warnings=['领口、袖笼和下摆曲线采用程序补充的试样形状，尚未通过实物验证。','前后中心均按对折裁一片；拼接边指两侧的前后片连接边。'];
if(v.frontMeasured!==null)warnings.push('实测两前腿间距按整宽输入；映射为半片辅助宽度是本原型假设，需试样核对。');
if(v.waist)warnings.push('腰围已用于腰部拼接端点，并沿用胸围整圈松量；套头穿脱空间需另行检查。');
return{back,front,N,C,L,frontY,belly,chestGuide,warnings,checks:{shoulderDelta:Math.abs(back.shoulder-front.shoulder),sideDelta:Math.abs(back.side-front.side),neckCircumference:2*(back.neckLength+front.neckLength)}};
}


const mirror=p=>({x:-p.x,y:p.y});
function unfold(piece){
 if(piece.mode==='full')return piece;
 const reflectOutline=points=>[...points.map(p=>({...p})),...points.slice(1,-1).reverse().map(mirror)];
 const points=reflectOutline(piece.points),cut=reflectOutline(piece.cut),openEdges=piece.edges.slice(0,-1);
 return{...piece,mode:'full',sourceHalf:piece,points,cut,edges:[...openEdges,...openEdges.slice().reverse()],bounds:bounds([...points,...cut],12)};
}
function layout(model,mode='half'){
 if(!['half','full'].includes(mode))throw Error('请选择半片或整片纸样。');
 if(mode==='half')return{...model,mode:'half',back:model.back.sourceHalf||model.back,front:model.front.sourceHalf||model.front,warnings:model.warnings.map(s=>s.startsWith('前后片各单层裁一片')?'前后中心均按对折裁一片；拼接边指两侧的前后片连接边。':s)};
 const warnings=model.warnings.map(s=>s.startsWith('前后中心均按对折裁一片')?'前后片各单层裁一片；中心箭头仅表示布纹方向，不要沿中心裁开。':s);
 return{...model,mode:'full',back:unfold(model.back),front:unfold(model.front),warnings};
}
function grainStrokes(grain){
 if(!grain||grain.length<2)return[];
 const [a,b]=grain;
 return[[a,b],[{x:a.x-2,y:a.y+4},a,{x:a.x+2,y:a.y+4}],[{x:b.x-2,y:b.y-4},b,{x:b.x+2,y:b.y-4}]];
}
function draftingAidRuns(piece,model){
 const p=piece.sourceHalf||piece,c=p.controls,runs=[];
 if(p.name==='back')for(let i=0;i<=5;i++)runs.push([{x:0,y:model.L*i/5},{x:Math.max(p.U.x,p.J.x)+5,y:model.L*i/5}]);
 else runs.push([{x:0,y:p.U.y},{x:p.U.x+5,y:p.U.y}],[{x:p.chestGuide,y:0},{x:p.chestGuide,y:p.U.y}]);
 runs.push([{x:0,y:0},{x:p.H.x,y:0},p.H],[p.S,c.armC1],[c.armC2,p.U]);
 return piece.mode==='full'?[...runs,...runs.map(run=>run.map(mirror))]:runs;
}

// Give every physical edge one stroke. Fold > cutting > net on coincident edges.
function strokeLayers(piece,options={}){
 const showCut=options.cut!==false,showNet=options.net!==false,eps=1e-7;
 function runs(points,keep){
  const out=[];let active=null;
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length];
   if(keep(a,b,i)){
    if(!active){active=[a,b];out.push(active);}else active.push(b);
   }else active=null;
  }
  return out;
 }
 const onFold=p=>Math.abs(p.x-piece.A.x)<eps;
 const cut=showCut?(piece.mode==='full'?[[...piece.cut,piece.cut[0]]]:runs(piece.cut,(a,b)=>!(onFold(a)&&onFold(b)))):[];
 const net=showNet?runs(piece.points,(a,b,i)=>piece.edges[i]!=='fold'&&(!showCut||piece.allowances[piece.edges[i]]>eps)):[];
 const foldPoints=showCut?piece.cut.filter(onFold):[piece.A,piece.F];
 const fold=piece.mode==='full'?[]:[{x:piece.A.x,y:Math.min(...foldPoints.map(p=>p.y))},{x:piece.A.x,y:Math.max(...foldPoints.map(p=>p.y))}];
 const grain=piece.mode==='full'?[{x:0,y:piece.A.y+15},{x:0,y:piece.F.y-15}]:[];
 return{cut,net,fold,grain};
}

function svg(piece,model,options={}){
 const b=piece.bounds,aux=options.aux!==false,cut=options.cut!==false,net=options.net!==false,full=piece.mode==='full',f=n=>Number(n.toFixed(1));
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x} ${b.y} ${b.w} ${b.h}" width="${b.w}mm" height="${b.h}mm" role="img" aria-label="${piece.name==='back'?'后片':'前片'}${full?'整片':'半片'}试样纸样"><style>text{font-family:Arial,sans-serif;font-size:3.2px;fill:#62536e}.aux{stroke:#b8adbf;stroke-width:.25;stroke-dasharray:2 1;fill:none}.net{stroke:#78658f;stroke-width:.4;stroke-dasharray:2 1;fill:none}.piece-fill{fill:#ece6f3;fill-opacity:.4;stroke:none}.cut{stroke:#332d3b;stroke-width:.4;fill:none}</style>`;
 if(cut||net)s+=`<path class="piece-fill" d="${path(piece.points)}"/>`;
 if(aux){
  for(const run of draftingAidRuns(piece,model))s+=`<path class="aux" d="${path(run,false)}"/>`;
  if(piece.name==='back')for(let i=0;i<=5;i++)s+=`<text x="-6" y="${model.L*i/5+1}">${'ABCDEF'[i]}</text>`;
  for(const [label,p] of Object.entries({H:piece.H,S:piece.S,U:piece.U,J:piece.J}))s+=`<circle cx="${p.x}" cy="${p.y}" r=".7" fill="#78658f"/><text x="${p.x+1}" y="${p.y-1}">${label}</text>`;
 }
 const strokes=strokeLayers(piece,{cut,net});
 for(const run of strokes.cut)s+=`<path class="cut" d="${path(run,false)}"/>`;
 for(const run of strokes.net)s+=`<path class="net" d="${path(run,false)}"/>`;
 if(strokes.fold.length)s+=`<path class="fold" d="${path(strokes.fold,false)}" stroke="#625b69" stroke-width=".4" stroke-dasharray="4 1 1 1"/>`;
 for(const run of grainStrokes(strokes.grain))s+=`<path class="grain" d="${path(run,false)}" stroke="#625b69" stroke-width=".3" fill="none"/>`;
 s+=`<text x="3" y="${piece.F.y*.68}" transform="rotate(-90 3 ${piece.F.y*.68})">${full?'GRAIN ONLY - DO NOT CUT CENTER':'FOLD / GRAIN - CUT 1 ON FOLD'}</text><text x="${piece.U.x*.32}" y="${piece.U.y+18}">KUKI ${piece.name.toUpperCase()}</text><text x="${piece.U.x*.32}" y="${piece.U.y+24}">TEST TOILE - NOT FIT VALIDATED</text><text x="${piece.U.x*.32}" y="${piece.U.y+30}">Shoulder ${f(piece.shoulder/10)} / Side ${f(piece.side/10)} cm</text></svg>`;
 if(options.labels===false)s=s.replace(/<text\b[^>]*>[\s\S]*?<\/text>/g,'');
 return s;
}
const api={draft,svg,path,bounds,offset,selfIntersects,area,strokeLayers,unfold,layout,grainStrokes,draftingAidRuns};root.KukiPattern=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
