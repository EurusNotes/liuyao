/* ============================================================
   六爻铜钱占卜 · 核心逻辑
   起卦法：三枚铜钱摇六次，自下而上成卦
   约定：背（花面/无字）为阳，记 3 ；字（有字面）为阴，记 2
        三背 = 9 老阳（动·变阴）
        两背一字 = 8 少阴（静）
        一背两字 = 7 少阳（静）
        三字 = 6 老阴（动·变阳）
   ============================================================ */

/* ---------- 八卦（自下而上三爻，1=阳 0=阴） ---------- */
const TRIGRAMS = {
  "111":"乾","110":"兑","101":"离","100":"震",
  "011":"巽","010":"坎","001":"艮","000":"坤"
};
const TRI_SYMBOL = {乾:"☰",兑:"☱",离:"☲",震:"☳",巽:"☴",坎:"☵",艮:"☶",坤:"☷"};
const TRI_NATURE = {乾:"天",兑:"泽",离:"火",震:"雷",巽:"风",坎:"水",艮:"山",坤:"地"};

/* ---------- 六十四卦（键：上卦+下卦） ---------- */
const HEX = {
  乾乾:{n:1,name:"乾为天"},乾兑:{n:10,name:"天泽履"},乾离:{n:13,name:"天火同人"},乾震:{n:25,name:"天雷无妄"},
  乾巽:{n:44,name:"天风姤"},乾坎:{n:6,name:"天水讼"},乾艮:{n:33,name:"天山遁"},乾坤:{n:12,name:"天地否"},
  兑乾:{n:43,name:"泽天夬"},兑兑:{n:58,name:"兑为泽"},兑离:{n:49,name:"泽火革"},兑震:{n:17,name:"泽雷随"},
  兑巽:{n:28,name:"泽风大过"},兑坎:{n:47,name:"泽水困"},兑艮:{n:31,name:"泽山咸"},兑坤:{n:45,name:"泽地萃"},
  离乾:{n:14,name:"火天大有"},离兑:{n:38,name:"火泽睽"},离离:{n:30,name:"离为火"},离震:{n:21,name:"火雷噬嗑"},
  离巽:{n:50,name:"火风鼎"},离坎:{n:64,name:"火水未济"},离艮:{n:56,name:"火山旅"},离坤:{n:35,name:"火地晋"},
  震乾:{n:34,name:"雷天大壮"},震兑:{n:54,name:"雷泽归妹"},震离:{n:55,name:"雷火丰"},震震:{n:51,name:"震为雷"},
  震巽:{n:32,name:"雷风恒"},震坎:{n:40,name:"雷水解"},震艮:{n:62,name:"雷山小过"},震坤:{n:16,name:"雷地豫"},
  巽乾:{n:9,name:"风天小畜"},巽兑:{n:61,name:"风泽中孚"},巽离:{n:37,name:"风火家人"},巽震:{n:42,name:"风雷益"},
  巽巽:{n:57,name:"巽为风"},巽坎:{n:59,name:"风水涣"},巽艮:{n:53,name:"风山渐"},巽坤:{n:20,name:"风地观"},
  坎乾:{n:5,name:"水天需"},坎兑:{n:60,name:"水泽节"},坎离:{n:63,name:"水火既济"},坎震:{n:3,name:"水雷屯"},
  坎巽:{n:48,name:"水风井"},坎坎:{n:29,name:"坎为水"},坎艮:{n:39,name:"水山蹇"},坎坤:{n:8,name:"水地比"},
  艮乾:{n:26,name:"山天大畜"},艮兑:{n:41,name:"山泽损"},艮离:{n:22,name:"山火贲"},艮震:{n:27,name:"山雷颐"},
  艮巽:{n:18,name:"山风蛊"},艮坎:{n:4,name:"山水蒙"},艮艮:{n:52,name:"艮为山"},艮坤:{n:23,name:"山地剥"},
  坤乾:{n:11,name:"地天泰"},坤兑:{n:19,name:"地泽临"},坤离:{n:36,name:"地火明夷"},坤震:{n:24,name:"地雷复"},
  坤巽:{n:46,name:"地风升"},坤坎:{n:7,name:"地水师"},坤艮:{n:15,name:"地山谦"},坤坤:{n:2,name:"坤为地"}
};

const YAO_NAMES = ["初","二","三","四","五","上"]; // 索引0=最下爻

/* ---------- 状态 ---------- */
let yaos = [];          // 每爻数值 6/7/8/9，索引0为初爻（最下）
let current = 0;        // 当前第几爻
let soundOn = true;
let lastResult = null;  // 供复制

/* ---------- DOM ---------- */
const $ = s => document.querySelector(s);
const askPanel=$("#askPanel"), castPanel=$("#castPanel"), resultPanel=$("#resultPanel");
const tossBtn=$("#tossBtn"), castStatus=$("#castStatus"), hexBuild=$("#hexBuild");
const coinsEl=$("#coins"), coins=[...document.querySelectorAll(".coin")];

/* ---------- 背景：八卦环 ---------- */
(function drawBagua(){
  const order=["乾","兑","离","震","巽","坎","艮","坤"];
  const g=document.getElementById("baguaGroup");
  let svg=`<circle cx="300" cy="300" r="250"/><circle cx="300" cy="300" r="210"/>`;
  order.forEach((t,i)=>{
    const a=(i/8)*2*Math.PI - Math.PI/2;
    const x=300+230*Math.cos(a), y=300+230*Math.sin(a)+16;
    svg+=`<text x="${x}" y="${y}" text-anchor="middle">${TRI_SYMBOL[t]}</text>`;
  });
  g.innerHTML=svg;
})();

/* ---------- 音效（Web Audio，无外部文件） ---------- */
let actx=null;
function beep(freq=520,dur=.12,type="triangle",vol=.18){
  if(!soundOn) return;
  try{
    actx=actx||new (window.AudioContext||window.webkitAudioContext)();
    const o=actx.createOscillator(),g=actx.createGain();
    o.type=type;o.frequency.value=freq;
    o.connect(g);g.connect(actx.destination);
    const t=actx.currentTime;
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol,t+.01);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.start(t);o.stop(t+dur);
  }catch(e){}
}
function coinChime(){ beep(880,.10,"triangle",.14); setTimeout(()=>beep(1320,.14,"sine",.10),60); }

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- 起卦 ---------- */
$("#startBtn").addEventListener("click",()=>{
  const q=$("#question").value.trim();
  if(!q){ $("#question").focus(); $("#question").style.borderColor="#ff7ba6";
    setTimeout(()=>$("#question").style.borderColor="",1200); return; }
  askPanel.classList.add("hidden");
  castPanel.classList.remove("hidden");
  resetCast();
});

function resetCast(){
  yaos=[];current=0;
  [...hexBuild.children].forEach(c=>{c.className="yao-row placeholder";c.innerHTML="";});
  updateStatus();
}

function updateStatus(){
  if(current<6){
    castStatus.textContent=`第 ${YAO_NAMES[current]} 爻 · 凝神一掷`;
    tossBtn.querySelector("span").textContent=`掷 · 第 ${YAO_NAMES[current]} 爻`;
    tossBtn.disabled=false;
  }
}

/* ---------- 掷币 ---------- */
tossBtn.addEventListener("click",castOne);

async function castOne(){
  tossBtn.disabled=true;
  castStatus.textContent="铜钱旋转中……";

  // 抛起旋转
  coins.forEach(c=>{c.classList.add("spinning");c.classList.remove("landed");});
  beep(300,.18,"sawtooth",.10);

  // 决定每枚铜钱：true=背(阳)
  const faces=[Math.random()<.5,Math.random()<.5,Math.random()<.5];

  await sleep(900);

  // 逐枚落定
  for(let i=0;i<3;i++){
    const isBack=faces[i];
    const spins=3+Math.floor(Math.random()*2);     // 整圈数
    const deg=spins*360+(isBack?180:0);
    const c=coins[i];
    c.classList.remove("spinning");
    c.querySelector(".coin-3d").style.transition="transform .9s cubic-bezier(.2,.8,.25,1)";
    c.querySelector(".coin-3d").style.transform=`rotateY(${deg}deg)`;
    c.classList.add("landed");
    beep(700+i*80,.09,"triangle",.12);
    await sleep(230);
  }
  await sleep(450);

  // 计算爻值
  const backs=faces.filter(Boolean).length;     // 背(阳)的个数
  const val=[6,7,8,9][backs];                    // 0背=6,1背=7,2背=8,3背=9
  yaos[current]=val;
  renderYao(current,val);
  coinChime();
  current++;

  if(current<6){
    // 复位铜钱朝向，准备下一爻
    await sleep(300);
    coins.forEach(c=>{const d=c.querySelector(".coin-3d");d.style.transition="transform .4s ease";d.style.transform="rotateY(0deg)";});
    updateStatus();
  }else{
    castStatus.textContent="六爻已成 · 卦象既现";
    tossBtn.style.display="none";
    await sleep(700);
    showResult();
  }
}

/* ---------- 渲染单爻（成卦区） ---------- */
function renderYao(idx,val){
  const row=hexBuild.querySelector(`.yao-row[data-pos="${idx}"]`);
  row.className="yao-row";
  const isYang=(val===7||val===9);
  const moving=(val===6||val===9);
  const tag={6:"老阴",7:"少阳",8:"少阴",9:"老阳"}[val];
  const bar = isYang
    ? `<div class="yang"><div class="bar"></div></div>`
    : `<div class="yin"><div class="bar"></div><div class="bar"></div></div>`;
  row.innerHTML=`
    <div class="yao-line">
      <span class="yao-num">${YAO_NAMES[idx]}爻</span>
      ${bar}
      <span class="move-mark">${moving?(val===9?"○":"×"):""}</span>
    </div>`;
  row.title=tag;
}

/* ---------- 成卦计算 ---------- */
function buildHex(){
  // 本卦位
  const primBits=yaos.map(v=>(v===7||v===9)?1:0); // 索引0=初爻
  // 变卦位：老阳9→阴，老阴6→阳，余不变
  const chgBits=yaos.map(v=> v===9?0 : v===6?1 : ((v===7)?1:0));
  const moving=yaos.map((v,i)=>(v===6||v===9)?i:-1).filter(i=>i>=0);

  const lowP=TRIGRAMS[`${primBits[0]}${primBits[1]}${primBits[2]}`];
  const upP =TRIGRAMS[`${primBits[3]}${primBits[4]}${primBits[5]}`];
  const lowC=TRIGRAMS[`${chgBits[0]}${chgBits[1]}${chgBits[2]}`];
  const upC =TRIGRAMS[`${chgBits[3]}${chgBits[4]}${chgBits[5]}`];

  return{
    primary:{...HEX[upP+lowP],up:upP,low:lowP,bits:primBits},
    changed:{...HEX[upC+lowC],up:upC,low:lowC,bits:chgBits},
    moving
  };
}

/* ---------- 展示结果 ---------- */
function showResult(){
  const data=buildHex();
  castPanel.classList.add("hidden");
  resultPanel.classList.remove("hidden");

  const hasChange=data.moving.length>0;
  $("#hexTitle").textContent=data.primary.name;
  $("#hexSub").textContent = hasChange
    ? `${data.moving.length} 个动爻 · 之 ${data.changed.name}`
    : "六爻安静 · 静卦无变";

  // 本卦
  $("#primaryName").textContent=data.primary.name;
  $("#primaryTri").textContent=`${TRI_SYMBOL[data.primary.up]} ${data.primary.up}（上） / ${TRI_SYMBOL[data.primary.low]} ${data.primary.low}（下） · 第${data.primary.n}卦`;
  $("#primaryGlyph").innerHTML=glyphHTML(data.primary.bits,data.moving);

  // 变卦
  if(hasChange){
    $("#changedCard").style.display="";
    $("#changeArrow").style.display="";
    $("#changedName").textContent=data.changed.name;
    $("#changedTri").textContent=`${TRI_SYMBOL[data.changed.up]} ${data.changed.up}（上） / ${TRI_SYMBOL[data.changed.low]} ${data.changed.low}（下） · 第${data.changed.n}卦`;
    $("#changedGlyph").innerHTML=glyphHTML(data.changed.bits,[]);
  }else{
    $("#changedCard").style.display="none";
    $("#changeArrow").style.display="none";
  }

  // 详情
  const movingTxt = hasChange
    ? data.moving.map(i=>`${YAO_NAMES[i]}爻(${yaos[i]===9?"老阳○":"老阴×"})`).join("、")
    : "无";
  const yaoLines = [5,4,3,2,1,0].map(i=>{
    const v=yaos[i];const tag={6:"老阴 ×",7:"少阳",8:"少阴",9:"老阳 ○"}[v];
    const sym=(v===7||v===9)?"▅▅▅▅▅▅▅":"▅▅▅　　▅▅▅";
    return `<div><b>${YAO_NAMES[i]}爻</b>　${sym}　<span style="color:var(--muted)">${tag}（${v}）</span></div>`;
  }).join("");
  $("#detail").innerHTML=`
    ${yaoLines}
    <div style="margin-top:12px">动爻：<span class="moving-list">${movingTxt}</span></div>
  `;

  lastResult=buildCopyText(data);
}

function glyphHTML(bits,moving){
  // 从上爻到初爻显示（视觉自上而下）
  let h="";
  for(let i=5;i>=0;i--){
    const yang=bits[i]===1;
    const mv=moving.includes(i)?" moving":"";
    h += yang
      ? `<div class="g-yang${mv}"></div>`
      : `<div class="g-yin${mv}"><span></span><span></span></div>`;
  }
  return h;
}

/* ---------- 生成复制文本 ---------- */
function buildCopyText(data){
  const q=$("#question").value.trim();
  const now=new Date();
  const pad=n=>String(n).padStart(2,"0");
  const time=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const hasChange=data.moving.length>0;

  const lines=[5,4,3,2,1,0].map(i=>{
    const v=yaos[i];
    const sym=(v===7||v===9)?"▅▅▅▅▅▅▅　阳":"▅▅▅　▅▅▅　阴";
    const tag={6:"老阴(6,动→阳)",7:"少阳(7)",8:"少阴(8)",9:"老阳(9,动→阴)"}[v];
    return `  ${YAO_NAMES[i]}爻：${sym}　${tag}`;
  }).join("\n");

  const movingTxt=hasChange
    ? data.moving.map(i=>`${YAO_NAMES[i]}爻`).join("、")
    : "无（六爻安静）";

  return `【六爻铜钱占卜】

所问之事：${q}
起卦时间：${time}
起卦方式：三枚铜钱摇六次（背为阳记3，字为阴记2；三背为老阳9，三字为老阴6）

本卦：${data.primary.name}（上${data.primary.up}${TRI_SYMBOL[data.primary.up]} 下${data.primary.low}${TRI_SYMBOL[data.primary.low]}，第${data.primary.n}卦）
${hasChange?`变卦：${data.changed.name}（上${data.changed.up}${TRI_SYMBOL[data.changed.up]} 下${data.changed.low}${TRI_SYMBOL[data.changed.low]}，第${data.changed.n}卦）`:"变卦：无（静卦）"}

六爻自下而上：
${lines}

动爻：${movingTxt}

请你作为精通《易经》与六爻预测（含卦辞爻辞、五行生克、动爻取断）的老师，针对我所问之事，结合以上卦象给出详细解读：
1）总体吉凶趋势；2）本卦与变卦所揭示的事态发展；3）动爻的关键提示；4）给我的具体建议与注意事项。请说人话，条理清晰。`;
}

/* ---------- 复制 ---------- */
$("#copyBtn").addEventListener("click",async ()=>{
  if(!lastResult) return;
  const btn=$("#copyBtn");
  try{
    await navigator.clipboard.writeText(lastResult);
  }catch(e){
    const ta=document.createElement("textarea");
    ta.value=lastResult;document.body.appendChild(ta);ta.select();
    try{document.execCommand("copy");}catch(_){}
    document.body.removeChild(ta);
  }
  btn.classList.add("copied");
  btn.querySelector("span").textContent="✓ 已复制，去粘贴给 AI 吧";
  beep(990,.12,"sine",.14);
  setTimeout(()=>{btn.classList.remove("copied");btn.querySelector("span").textContent="📋 一键复制卦象，交给 AI 解读";},2400);
});

/* ---------- 再占 ---------- */
$("#againBtn").addEventListener("click",()=>{
  resultPanel.classList.add("hidden");
  askPanel.classList.remove("hidden");
  tossBtn.style.display="";
  $("#question").value="";
});

/* ---------- 音效开关 ---------- */
$("#soundToggle").addEventListener("click",function(){
  soundOn=!soundOn;
  this.textContent=soundOn?"🔔 音效：开":"🔕 音效：关";
  if(soundOn) beep(660,.1);
});
