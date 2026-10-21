(function(root){
const rules={back:[['后胸围（半片）','胸围 × 3/5 ÷ 2',(n,c,l,a,b)=>c*.3,'width'],['后领宽','颈围 ÷ 4',n=>n/4,'curve'],['后领深','颈围 ÷ 8',n=>n/8,'curve'],['后片长参考','实测背长－减短量',(n,c,l)=>l,'length']],front:[['前胸围（半片）','胸围 × 2/5 ÷ 2',(n,c)=>c*.2,'width'],['前胸长','背长 × 2/5 ＋ 加值',(n,c,l,a)=>l*.4+a,'length'],['前领宽','颈围 ÷ 5',n=>n/5,'curve'],['前领深','颈围 ÷ 20',n=>n/20,'curve'],['前胸宽','胸围 ÷ 10 － 减值',(n,c,l,a,b)=>c/10-b,'curve']]};
function calculate(v){const out={};for(const panel of Object.keys(rules)){out[panel]=rules[panel].map(([name,formula,fn,type])=>{const base=fn(v.neck,v.chest,v.back,v.frontAdd,v.frontSub),ease=fn(v.neck+v.neckEase,v.chest+v.chestEase,v.back-v.backShorten,v.frontAdd,v.frontSub);return{name,formula,type,base,ease,cut:type==='width'?ease+v.seam:type==='length'?ease+2*v.seam:null};});}return out;}
root.Kuki={calculate,rules};if(typeof module!=='undefined')module.exports=root.Kuki;
})(typeof window!=='undefined'?window:globalThis);
