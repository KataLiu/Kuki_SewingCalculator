/* Physical A4 PDF: text stays on the guide page and in tile margins. */
(function(root){
'use strict';
const MM=72/25.4,W=210,H=297,TW=180,TH=240,OVERLAP=10,LEFT=15,TOP=35;
const n=v=>Number(v.toFixed(4)).toString();
const esc=s=>String(s).replace(/[^\x20-\x7e]/g,'?').replace(/([\\()])/g,'\\$1');
function plan(model){
 const tiles=[];
 for(const key of ['back','front']){
  const p=model[key],b=p.bounds;
  const cols=Math.max(1,Math.ceil((b.w-OVERLAP)/(TW-OVERLAP)));
  const rows=Math.max(1,Math.ceil((b.h-OVERLAP)/(TH-OVERLAP)));
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
   const id=(key==='back'?'B':'F')+(r*cols+c+1);
   tiles.push({key,id,p,b,cols,rows,r,c,x:b.x+c*(TW-OVERLAP),y:b.y+r*(TH-OVERLAP)});
  }
 }
 if(tiles.length>64)throw Error('当前纸样超过 64 页，请缩小尺寸后再导出。');
 return tiles;
}
// Each duplicated mark has identical WORLD coordinates on both adjacent sheets.
function registrationMarks(t){
 const marks=[];
 for(let c=1;c<t.cols;c++){
  const x=t.b.x+c*(TW-OVERLAP)+OVERLAP/2;
  if(x<t.x+3||x>t.x+TW-3)continue;
  for(let y=t.b.y+30;y<t.b.y+t.rows*(TH-OVERLAP);y+=50)
   if(y>=t.y+3&&y<=t.y+TH-3)marks.push({x,y});
 }
 for(let r=1;r<t.rows;r++){
  const y=t.b.y+r*(TH-OVERLAP)+OVERLAP/2;
  if(y<t.y+3||y>t.y+TH-3)continue;
  for(let x=t.b.x+30;x<t.b.x+t.cols*(TW-OVERLAP);x+=50)
   if(x>=t.x+3&&x<=t.x+TW-3)marks.push({x,y});
 }
 return marks;
}
function canvas(){
 const a=[];
 return{
  line(x1,y1,x2,y2,color='.3 .25 .35',dash=''){
   a.push(`${color} RG 0.35 w [${dash}] 0 d ${n(x1*MM)} ${n((H-y1)*MM)} m ${n(x2*MM)} ${n((H-y2)*MM)} l S`);
  },
  text(x,y,text,size=9){a.push(`BT /F1 ${size} Tf .22 .18 .27 rg 1 0 0 1 ${n(x*MM)} ${n((H-y)*MM)} Tm (${esc(text)}) Tj ET`);},
  rect(x,y,w,h){a.push(`.55 .5 .6 RG 0.4 w [] 0 d ${n(x*MM)} ${n((H-y-h)*MM)} ${n(w*MM)} ${n(h*MM)} re S`);},
  path(points,tx,ty,color='.1 .1 .1',dash='',closed=true){
   a.push(`${color} RG 0.6 w [${dash}] 0 d `+points.map((p,i)=>`${n((p.x+tx)*MM)} ${n((H-p.y-ty)*MM)} ${i?'l':'m'}`).join(' ')+(closed?' h':'')+' S');
  },
  raw(s){a.push(s);},end(){return a.join('\n');}
 };
}
function build(model,v,options={}){
 const includeNet=options.net!==false,includeAux=options.aux===true,full=model.mode==='full';
 const tiles=plan(model),streams=[];
 let c=canvas();
 c.text(15,20,'KUKI / PRINT & ASSEMBLE',18);
 c.text(15,29,(full?'FULL PIECES / SINGLE LAYER':'HALF PIECES / FOLDED FABRIC')+' - TEST DRAFT: make a toile first.',9);
 c.text(15,43,'1. A4 portrait. Print at 100% / ACTUAL SIZE, not Fit to page.',10);
 c.text(15,51,'2. Measure the square below first. Then print the pattern sheets.',10);
 c.text(15,59,'3. Use this map to assemble the BACK (B) and FRONT (F) separately.',10);
 c.rect(15,70,50,50);c.text(24,97,'50 x 50 mm',11);
 c.text(77,78,'CHECK BOTH DIRECTIONS',10);
 c.text(77,87,'This square must be exactly 5 x 5 cm.',9);
 c.text(77,99,'For sheets with a neighbour above or left:',9);
 c.text(77,106,'trim the TOP / LEFT outside margin at the frame.',8.5);
 c.text(77,113,'Overlap the next sheet by 10 mm; match crosses',8.5);
 c.text(77,120,'and pattern lines, then tape. Grey guides are for assembly.',8.1);
 c.text(15,134,'ASSEMBLY MAP / tile IDs appear outside the pattern area',10);
 for(const [index,key] of ['back','front'].entries()){
  const group=tiles.filter(t=>t.key===key),first=group[0],x=15+index*96,y=148,gridW=84,gridH=42;
  c.text(x,143,(key==='back'?'BACK':'FRONT')+(full?' / cut 1 on single layer':' / cut 1 on folded fabric'),9);
  const cellW=gridW/first.cols,cellH=gridH/first.rows;
  for(const t of group){const xx=x+t.c*cellW,yy=y+t.r*cellH;c.rect(xx,yy,cellW,cellH);c.text(xx+Math.max(1,cellW/2-3),yy+cellH/2+1.5,t.id,Math.max(5,Math.min(10,cellW*1.2,cellH*1.7)));}
 }
 c.text(15,203,'LINE KEY / only lines are printed inside the pattern sheets',10);
 c.line(15,211,30,211,'.08 .08 .08');c.text(35,212,'Solid black: CUTTING edge. Seam / hem allowance is already included.',8.5);
 if(includeNet){c.line(15,219,30,219,'.42 .32 .52','4 2');c.text(35,220,'Purple dashed: NET / SEWING line, only where separate from the cut edge.',8.5);}
 else c.text(35,220,'Net / sewing outline is not included in this export.',8.5);
 if(full){
  c.line(15,227,30,227,'.25 .25 .25');
  c.line(15,227,18,225.5,'.25 .25 .25');c.line(15,227,18,228.5,'.25 .25 .25');
  c.line(30,227,27,225.5,'.25 .25 .25');c.line(30,227,27,228.5,'.25 .25 .25');
  c.text(35,228,'Arrow: GRAIN ONLY. Do not cut the center. Cut on a single fabric layer.',8.5);
 }else{c.line(15,227,30,227,'.25 .25 .25','7 2 1 2');c.text(35,228,'Dash-dot: FOLD + GRAIN. This edge is not drawn again as a cut line.',8.5);}
 c.line(15,235,30,235,'.65 .6 .7','2 2');c.text(35,236,'Light grey: assembly guides'+(includeAux?' and drafting aids.':'. No drafting aids included.'),8.5);
 c.text(15,249,'YOUR DRAFT / centimetres',10);
 const settings=[
  `Body neck/chest/back: ${v.neck} / ${v.chest} / ${v.back}. Draft: ${n(model.N/10)} / ${n(model.C/10)} / ${n(model.L/10)}.`,
  `Ease neck/chest: +${v.neckEase} / +${v.chestEase}; back -${v.backShorten}. Shoulder ${v.shoulder}; angles ${v.backAngle} / ${v.frontAngle} from vertical.`,
  full?`Shoulder + side seam: ${v.seam}. No center seam. Neck / armhole extra: 0.`:`Shoulder + side seam: ${v.seam}. Fold, neck and armhole: 0. Binding strips are separate.`,
  `Hem: ${v.hemFinish==='fold'?'turned, total allowance '+v.hemAllowance:'edge binding, allowance 0'}. Front length +${v.frontAdd}; belly ${n(model.belly/10)}; arm curve ${v.armCurve}.`,
  `Waist ${v.waist===null?'unset':v.waist}; taper ${v.waistTake}; chest guide ${n(model.chestGuide/10)} (${v.frontMeasured===null?'estimated':'half of measured full gap'}).`,
  `Neck curve ${n(model.checks.neckCircumference/10)} vs target ${n(model.N/10)}. Curves and fit remain unvalidated.`
 ];settings.forEach((text,i)=>c.text(15,256+i*5.1,text,8.1));
 c.text(15,289,`Guide only - ${tiles.length} pattern sheets follow. Keep this page for reference.`,8);
 streams.push(c.end());
 for(let i=0;i<tiles.length;i++){
  const t=tiles[i],p=t.p;c=canvas();
  // All text is outside the physical pattern frame.
  c.text(LEFT,25,t.id,11);c.text(180,25,`${i+2} / ${tiles.length+1}`,8);
  c.raw(`q ${n(LEFT*MM)} ${n((H-TOP-TH)*MM)} ${n(TW*MM)} ${n(TH*MM)} re W n`);
  const tx=LEFT-t.x,ty=TOP-t.y;
  const painter=root.KukiPattern||(typeof require==='function'?require('./pattern.js'):null);
  if(includeAux)for(const run of painter.draftingAidRuns(p,model))c.path(run,tx,ty,'.7 .65 .75','2 2',false);
  const strokes=painter.strokeLayers(p,{cut:true,net:includeNet});
  for(const run of strokes.cut)c.path(run,tx,ty,'.1 .1 .1','',false);
  for(const run of strokes.net)c.path(run,tx,ty,'.42 .32 .52','4 2',false);
  if(strokes.fold.length)c.path(strokes.fold,tx,ty,'.25 .25 .25','7 2 1 2',false);
  for(const run of painter.grainStrokes(strokes.grain))c.path(run,tx,ty,'.25 .25 .25','',false);
  for(const mark of registrationMarks(t)){
   const x=mark.x+tx,y=mark.y+ty;
   c.line(x-1.8,y,x+1.8,y,'.6 .55 .65');c.line(x,y-1.8,x,y+1.8,'.6 .55 .65');
  }
  c.raw('Q');
  c.rect(LEFT,TOP,TW,TH);
  if(t.c<t.cols-1)c.line(LEFT+TW-OVERLAP,TOP,LEFT+TW-OVERLAP,TOP+TH,'.7 .65 .75','2 2');
  if(t.r<t.rows-1)c.line(LEFT,TOP+TH-OVERLAP,LEFT+TW,TOP+TH-OVERLAP,'.7 .65 .75','2 2');
  for(const [x,y] of [[LEFT,TOP],[LEFT+TW,TOP],[LEFT,TOP+TH],[LEFT+TW,TOP+TH]]){c.line(x-2,y,x+2,y,'.6 .55 .65');c.line(x,y-2,x,y+2,'.6 .55 .65');}
  streams.push(c.end());
 }
const objs=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];const pages=[];for(const stream of streams){let id=objs.length+1;pages.push(id);objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(W*MM)} ${n(H*MM)}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id+1} 0 R >>`);objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);}objs[1]=`<< /Type /Pages /Kids [${pages.map(id=>id+' 0 R').join(' ')}] /Count ${pages.length} >>`;let pdf='%PDF-1.4\n',offsets=[0];objs.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${obj}\nendobj\n`;});const xref=pdf.length;pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return new TextEncoder().encode(pdf);}
const api={build,plan,registrationMarks};root.KukiPDF=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
