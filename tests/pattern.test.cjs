const assert=require('node:assert/strict');
const {draft,area,selfIntersects}=require('../pattern.js');const pdf=require('../pattern-pdf.js');const calc=require('../calculator.js');
const sample={neck:23,chest:38,back:27,neckEase:2,chestEase:2,backShorten:2,frontAdd:1,frontSub:1,shoulder:3.5,backAngle:40,frontAngle:60,waist:null,waistTake:.5,bellyLength:null,frontMeasured:null,armCurve:.65,hemFinish:'bind',hemAllowance:1,seam:1};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);let tests=0;
function check(name,fn){fn();tests++;console.log('PASS',name);}
check('tutorial example uses adjusted 25 / 40 / 25 cm, front length 11 cm',()=>{const m=draft(sample);close(m.N,250);close(m.C,400);close(m.L,250);close(m.frontY,110);const c=calc.calculate(sample);close(c.back[0].ease,12);close(c.back[1].ease,6.25);close(c.back[2].ease,3.125);close(c.front[3].ease,1.25);close(c.front[4].ease,3);});
check('shoulder angles measured from vertical and matching seam lengths',()=>{const m=draft(sample);for(const [key,angle] of [['back',40],['front',60]]){const p=m[key];close(Math.atan2(p.S.x-p.H.x,p.S.y-p.H.y)*180/Math.PI,angle);close(p.shoulder,35);}close(m.checks.shoulderDelta,0);close(m.checks.sideDelta,0);});
check('seam allowances do not modify net geometry or fold position',()=>{const a=draft(sample),b=draft({...sample,seam:0});for(const key of ['back','front']){assert.deepEqual(a[key].points,b[key].points);assert.ok(area(a[key].cut)>area(b[key].cut));close(Math.min(...a[key].cut.map(p=>p.x)),0);assert.equal(a[key].allowances.neck,0);assert.equal(a[key].allowances.arm,0);assert.equal(a[key].allowances.fold,0);}});
check('turned hem adds only hem allowance; binding adds zero',()=>{const a=draft(sample),b=draft({...sample,hemFinish:'fold',hemAllowance:1});for(const key of ['back','front']){assert.deepEqual(a[key].points,b[key].points);assert.equal(a[key].allowances.hem,0);assert.equal(b[key].allowances.hem,10);assert.ok(area(b[key].cut)>area(a[key].cut));}});
check('front measurement affects only front armhole, and uses half of full gap',()=>{const a=draft(sample),b=draft({...sample,frontMeasured:8});close(b.chestGuide,40);assert.deepEqual(a.back.points,b.back.points);assert.notDeepEqual(a.front.points,b.front.points);close(b.front.side,b.back.side);});
check('belly length independent of the matching side seams',()=>{const a=draft(sample),b=draft({...sample,bellyLength:7});assert.deepEqual(a.back.points,b.back.points);close(b.front.F.y-b.front.U.y,70);close(a.front.side,b.front.side);close(b.front.side,b.back.side);});
check('neck starts horizontally, armhole ends at right angle to side',()=>{const m=draft(sample);for(const key of ['back','front']){const p=m[key],c=p.controls;close(c.neckC1.y,0);const ax=p.U.x-c.armC2.x,ay=p.U.y-c.armC2.y,sx=p.J.x-p.U.x,sy=p.J.y-p.U.y;close(ax*sx+ay*sy,0);close(c.hemC2.y,p.F.y);}});
check('waist size overrides taper and conserves waist circumference',()=>{const a=draft({...sample,waist:34,waistTake:0}),b=draft({...sample,waist:34,waistTake:2});assert.deepEqual(a.back.points,b.back.points);close(2*(a.back.J.x+a.front.J.x),360);close(a.front.side,a.back.side);});
check('invalid sizes and excessive measured gap reject exportable geometry',()=>{assert.throws(()=>draft({...sample,backShorten:24}));assert.throws(()=>draft({...sample,shoulder:10}));assert.throws(()=>draft({...sample,frontMeasured:30}));});
check('multiple sizes, angles and edge finishes retain simple contours and matched seams',()=>{for(const v of [{}, {neck:28,chest:42,back:30,frontAdd:1.5}, {neck:40,chest:70,back:55,shoulder:4.5}, {neck:55,chest:95,back:70,shoulder:6}, {frontAngle:55,backAngle:45,hemFinish:'fold',waist:35}, {seam:0,armCurve:.3}, {seam:2,armCurve:1}]){const m=draft({...sample,...v});close(m.checks.sideDelta,0);for(const key of ['back','front']){assert.ok(!selfIntersects(m[key].points));assert.ok(!selfIntersects(m[key].cut));assert.ok(m[key].cut.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));}}});
check('PDF tiles cover full bounds with exactly 10 mm overlap',()=>{const m=draft({...sample,neck:55,chest:95,back:70,shoulder:6});const tiles=pdf.plan(m);for(const key of ['back','front']){const t=tiles.filter(t=>t.key===key),b=m[key].bounds;assert.ok(t.at(-1).x+180>=b.x+b.w);assert.ok(t.at(-1).y+240>=b.y+b.h);for(const x of t){const right=t.find(y=>y.r===x.r&&y.c===x.c+1);if(right)close(x.x+180-right.x,10);const down=t.find(y=>y.c===x.c&&y.r===x.r+1);if(down)close(x.y+240-down.y,10);}}});
check('vector PDF A4 page size, deterministic contents, ASCII-safe PDF stream',()=>{const m=draft(sample),bytes=pdf.build(m,sample),s=new TextDecoder().decode(bytes);assert.ok(s.startsWith('%PDF-1.4'));assert.ok(s.includes('/MediaBox [0 0 595.2756 841.8898]'));assert.ok(s.includes('50 x 50 mm'));assert.ok(s.includes('TEST DRAFT'));assert.equal((s.match(/\/Type \/Page\b/g)||[]).length,pdf.plan(m).length+1);assert.deepEqual(bytes,pdf.build(m,sample));});

check('matching crosses use identical world coordinates in adjacent tile overlaps',()=>{const m=draft({...sample,neck:55,chest:95,back:70,shoulder:6});const tiles=pdf.plan(m);for(const t of tiles){for(const adjacent of tiles.filter(x=>x.key===t.key&&((x.r===t.r&&x.c===t.c+1)||(x.c===t.c&&x.r===t.r+1)))){const marks=pdf.registrationMarks(t),others=pdf.registrationMarks(adjacent);const shared=marks.filter(a=>others.some(b=>Math.abs(a.x-b.x)<1e-7&&Math.abs(a.y-b.y)<1e-7));assert.ok(shared.length>=2,'neighbouring sheets need at least two shared alignment marks');}}});
check('PDF labels are stable IDs and drafting aids are opt-in',()=>{const m=draft(sample),tiles=pdf.plan(m);assert.deepEqual(tiles.map(t=>t.id),['B1','B2','F1','F2']);const normal=new TextDecoder().decode(pdf.build(m,sample)),aux=new TextDecoder().decode(pdf.build(m,sample,{aux:true,net:false}));assert.ok(normal.includes('No drafting aids included'));assert.ok(aux.includes('and drafting aids'));assert.ok(aux.includes('Net / sewing outline is not included'));for(const bad of ['CUT 1 ON FOLD','FOLD / GRAIN','KUKI BACK','KUKI FRONT','LEFT B'])assert.ok(!normal.includes(bad));});
check('clean preview can remove all internal SVG text without changing the paths',()=>{const p=require('../pattern.js');const m=draft(sample),normal=p.svg(m.back,m),clean=p.svg(m.back,m,{labels:false});assert.ok(normal.includes('<text'));assert.ok(!clean.includes('<text'));assert.equal((normal.match(/<path/g)||[]).length,(clean.match(/<path/g)||[]).length);});



check('fold has one dedicated stroke and is excluded from both outline layers',()=>{
 const p=require('../pattern.js');
 for(const v of [sample,{...sample,hemFinish:'fold'},{...sample,seam:0}]){
  const m=p.draft(v);
  for(const key of ['back','front']){
   const piece=m[key],lines=p.strokeLayers(piece);
   for(const run of [...lines.cut,...lines.net])for(let i=1;i<run.length;i++)assert.ok(!(Math.abs(run[i-1].x)<1e-7&&Math.abs(run[i].x)<1e-7),'fold must not be overpainted');
   close(lines.fold[0].x,0);close(lines.fold[1].x,0);
   const foldEnds=piece.cut.filter(q=>Math.abs(q.x)<1e-7).map(q=>q.y);
   close(lines.fold[0].y,Math.min(...foldEnds));close(lines.fold[1].y,Math.max(...foldEnds));
  }
 }
});
check('net lines appear only on separated seams; zero allowance has no duplicate layer',()=>{
 const p=require('../pattern.js'),m=p.draft(sample);
 for(const key of ['back','front']){
  const piece=m[key],lines=p.strokeLayers(piece);
  assert.equal(lines.net.length,2);assert.deepEqual(lines.net[0],[piece.H,piece.S]);assert.deepEqual(lines.net[1],[piece.U,piece.J]);
  assert.equal(p.strokeLayers(p.draft({...sample,seam:0})[key]).net.length,0);
  const netOnly=p.strokeLayers(piece,{cut:false});assert.equal(netOnly.cut.length,0);assert.equal(netOnly.net.length,1);assert.equal(netOnly.net[0].length,piece.points.length);
 }
});


check('full pieces are exact reflections, with double area and no new center allowance',()=>{
 const p=require('../pattern.js');
 for(const v of [sample,{...sample,hemFinish:'fold',hemAllowance:1},{...sample,seam:0},{...sample,neck:40,chest:70,back:55,shoulder:4.5}]){
  const half=p.draft(v),full=p.layout(half,'full');
  for(const key of ['back','front']){
   const a=half[key],b=full[key];close(p.area(b.points),2*p.area(a.points));close(p.area(b.cut),2*p.area(a.cut));
   close(b.bounds.w-24,2*(a.bounds.w-24));close(b.bounds.h,a.bounds.h);
   assert.equal(b.edges.length,b.points.length);assert.ok(!b.edges.includes('fold'));
   for(const point of b.cut)assert.ok(b.cut.some(q=>Math.abs(q.x+point.x)<1e-7&&Math.abs(q.y-point.y)<1e-7));
   assert.ok(!p.selfIntersects(b.points));assert.ok(!p.selfIntersects(b.cut));
   close(b.shoulder,a.shoulder);close(b.side,a.side);assert.equal(b.allowances.fold,0);
  }
 }
});
check('full mode has closed outer contour and grain arrows, without a cut or fold through center',()=>{
 const p=require('../pattern.js'),full=p.layout(p.draft(sample),'full');
 for(const key of ['back','front']){
  const piece=full[key],strokes=p.strokeLayers(piece);assert.equal(strokes.fold.length,0);assert.equal(strokes.grain.length,2);
  assert.deepEqual(strokes.cut[0][0],strokes.cut[0].at(-1));
  for(const run of [...strokes.cut,...strokes.net])for(let i=1;i<run.length;i++)assert.ok(!(Math.abs(run[i-1].x)<1e-7&&Math.abs(run[i].x)<1e-7));
  const svg=p.svg(piece,full,{labels:false});assert.ok(svg.includes('class="grain"'));assert.ok(!svg.includes('class="fold"'));assert.ok(!svg.includes('<text'));
 }
});
check('half mode remains original geometry and can be restored after unfolding',()=>{
 const p=require('../pattern.js'),m=p.draft(sample),full=p.layout(m,'full'),restored=p.layout(full,'half');
 assert.deepEqual(restored.back,m.back);assert.deepEqual(restored.front,m.front);assert.deepEqual(restored.warnings,m.warnings);
 assert.deepEqual(p.layout(m,'half').checks,full.checks);assert.throws(()=>p.layout(m,'invalid'));
});
check('PDF layout expands sheets at true scale and changes all cutting instructions',()=>{
 const p=require('../pattern.js'),base=p.draft(sample),half=p.layout(base,'half'),full=p.layout(base,'full');
 assert.equal(pdf.plan(half).length+1,5);assert.equal(pdf.plan(full).length+1,9);
 const fullPDF=new TextDecoder().decode(pdf.build(full,sample)),halfPDF=new TextDecoder().decode(pdf.build(half,sample));
 assert.ok(fullPDF.includes('FULL PIECES / SINGLE LAYER'));assert.ok(fullPDF.includes('No center seam'));assert.ok(fullPDF.includes('GRAIN ONLY'));
 assert.ok(!fullPDF.includes('on folded fabric'));assert.ok(halfPDF.includes('HALF PIECES / FOLDED FABRIC'));assert.ok(halfPDF.includes('on folded fabric'));
 assert.equal((fullPDF.match(/\/Type \/Page\b/g)||[]).length,9);
});
console.log(`${tests} tests passed.`);
