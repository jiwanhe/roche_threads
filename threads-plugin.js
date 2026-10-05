/**
 * Threads — Roche Plugin v1
 * 偷看 TA 的 Threads
 * - 首頁 = NPC 串文動態（char 會刷到的）
 * - 我的 = char 自己發的串文
 * - 收藏 = char 會按讚收藏的串文
 * - 評論區 = AI 生成回覆串
 * - 全走 roche.ai.chat()
 */
(function(){
'use strict';
const app={
  id:'threads-home',name:'Threads',icon:'forum',iconImage:'',

  async mount(container,roche){
    const BK='#000',BG='#fff',T1='#000',T2='#555',T3='#999',BD='#e0e0e0',BLUE='#0095f6',BLUEL='#e8f4fd';
    const GRADS=['linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)','linear-gradient(135deg,#4facfe,#00f2fe)','linear-gradient(135deg,#667eea,#764ba2)','linear-gradient(135deg,#f093fb,#f5576c)','linear-gradient(135deg,#43e97b,#38f9d7)','linear-gradient(135deg,#fa709a,#fee140)','linear-gradient(135deg,#a18cd1,#fbc2eb)','linear-gradient(135deg,#e0c3fc,#8ec5fc)'];
    const rg=()=>GRADS[Math.floor(Math.random()*GRADS.length)];
    const rl=()=>Math.floor(Math.random()*800)+5;
    const rc=()=>Math.floor(Math.random()*60);
    const rr=()=>Math.floor(Math.random()*40);
    const rNpcG=()=>GRADS[Math.floor(Math.random()*GRADS.length)];
    const timeAgo=()=>['剛剛','1分鐘','3分鐘','12分鐘','28分鐘','1小時','2小時','3小時','5小時','8小時','12小時','16小時','昨天','2天','3天','5天','1週'][Math.floor(Math.random()*17)];

    // ── State ──
    const S={
      view:'home',detail:null,showSettings:false,generating:false,generatingComments:false,
      feedPosts:[],myPosts:[],savedPosts:[],liked:{},
      cfg:{charId:'',charName:'',userId:'',userName:'',genCount:5,selectedConvIds:[]},
      charList:[],userList:[],
      imported:null,importMsg:'',importErr:false,
      lastError:'',profileTab:'threads',autoFetching:false,
    };

    // ── Storage ──
    const load=async k=>{try{const s=await roche.storage.get(k);return s?JSON.parse(s):null}catch(_){return null}};
    const sv=async(k,v)=>{try{await roche.storage.set(k,JSON.stringify(v))}catch(_){}};
    Object.assign(S.cfg,(await load('th_cfg'))||{});
    S.feedPosts=(await load('th_feed'))||[];
    S.myPosts=(await load('th_mine'))||[];
    S.savedPosts=(await load('th_saved'))||[];
    S.imported=(await load('th_imported'))||null;
    const saveCfg=()=>sv('th_cfg',S.cfg);
    const saveFeed=()=>sv('th_feed',S.feedPosts);
    const saveMine=()=>sv('th_mine',S.myPosts);
    const saveSaved=()=>sv('th_saved',S.savedPosts);
    const saveImported=()=>sv('th_imported',S.imported);
    const cn=()=>S.cfg.charName||S.imported?.name||'角色';

    try{S.charList=await roche.character.list()||[]}catch(_){}
    try{S.userList=await roche.persona.getUserPersonas()||[]}catch(_){}
    if(!S.cfg.charId&&S.charList.length){S.cfg.charId=S.charList[0].id;S.cfg.charName=S.charList[0].name}
    if(!S.cfg.userId&&S.userList.length){S.cfg.userId=S.userList[0].id;S.cfg.userName=S.userList[0].name}

    // ── Style ──
    const style=document.createElement('style');
    style.textContent=`
      .th{width:100%;height:100%;position:relative;overflow:hidden;font-family:-apple-system,"SF Pro Text","Helvetica Neue",sans-serif;background:${BG};display:flex;flex-direction:column;color:${T1}}
      .th *{box-sizing:border-box}
      .th-hdr{height:50px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid ${BD};flex-shrink:0;background:${BG};z-index:20}
      .th-hdr-btn{width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:none;border:none;border-radius:50%;cursor:pointer;color:${T1}}
      .th-hdr-title{font-weight:800;font-size:20px;color:${BK};letter-spacing:-.5px}
      .th-body{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
      .th-nav{display:flex;align-items:center;justify-content:space-around;padding:8px 0 max(env(safe-area-inset-bottom),8px);border-top:1px solid ${BD};flex-shrink:0;background:${BG};z-index:20}
      .th-nav-btn{display:flex;flex-direction:column;align-items:center;background:none;border:none;cursor:pointer;padding:4px 12px}

      /* Post card */
      .th-post{padding:14px 16px;border-bottom:1px solid ${BD}}
      .th-post-hdr{display:flex;gap:10px}
      .th-post-av{width:40px;height:40px;border-radius:50%;flex-shrink:0}
      .th-post-info{flex:1;min-width:0}
      .th-post-top{display:flex;align-items:center;justify-content:space-between}
      .th-post-name{font-weight:700;font-size:14px;color:${T1}}
      .th-post-handle{font-size:13px;color:${T3};margin-left:4px;font-weight:400}
      .th-post-time{font-size:12px;color:${T3}}
      .th-post-text{font-size:15px;line-height:1.55;color:${T1};margin-top:8px;white-space:pre-wrap;word-break:break-word}
      .th-post-acts{display:flex;gap:20px;margin-top:10px;padding-top:4px}
      .th-act{display:flex;align-items:center;gap:5px;background:none;border:none;cursor:pointer;color:${T3};font-size:13px}
      .th-post-thread-line{width:2px;background:${BD};margin:6px 19px 0}

      /* Profile */
      .th-phdr{padding:20px 16px 0}
      .th-prow{display:flex;justify-content:space-between;align-items:flex-start}
      .th-pav{width:72px;height:72px;border-radius:50%;border:2px solid ${BD}}
      .th-pname{font-weight:800;font-size:22px;margin-top:12px}
      .th-phandle{font-size:14px;color:${T3}}
      .th-pbio{font-size:14px;color:${T1};margin-top:8px;line-height:1.5;white-space:pre-wrap}
      .th-pstats{display:flex;gap:16px;margin-top:12px;font-size:13px;color:${T3}}
      .th-pstats strong{color:${T1};font-weight:700}
      .th-tabs{display:flex;border-bottom:1px solid ${BD};margin-top:14px}
      .th-tab{flex:1;text-align:center;padding:14px 0;font-size:14px;font-weight:600;cursor:pointer;color:${T3};position:relative}
      .th-tab.on{color:${T1}}
      .th-tab.on::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:${BK}}

      /* Detail */
      .th-dt{position:absolute;inset:0;z-index:100;background:${BG};overflow-y:auto;display:flex;flex-direction:column}

      /* Comments */
      .th-cm{padding:0 16px 14px;border-bottom:1px solid ${BD}}
      .th-cm-hdr{display:flex;gap:10px;padding-top:12px}
      .th-cm-av{width:32px;height:32px;border-radius:50%;flex-shrink:0}
      .th-cm-body{flex:1}
      .th-cm-name{font-weight:600;font-size:13px}
      .th-cm-text{font-size:14px;line-height:1.45;margin-top:2px;color:${T1}}
      .th-cm-meta{display:flex;gap:14px;margin-top:4px;font-size:12px;color:${T3}}
      .th-cm-reply{margin-left:42px;padding-top:8px}

      /* Common */
      .th-empty{text-align:center;padding:70px 20px;color:${T3}}
      .th-empty .icon{font-size:44px;margin-bottom:12px}
      .th-empty p{font-size:14px;margin:0 0 16px}
      .th-btn{padding:10px 26px;border-radius:24px;background:${BK};color:#fff;border:none;font-weight:700;font-size:14px;cursor:pointer}
      .th-btn:disabled{opacity:.4}
      .th-btn-o{padding:8px 22px;border-radius:20px;background:${BG};color:${BK};border:1.5px solid ${BD};font-weight:600;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
      .th-mask{position:absolute;inset:0;z-index:200;background:rgba(0,0,0,.45);display:flex;align-items:flex-end}
      .th-set{width:100%;background:#fff;border-radius:16px 16px 0 0;padding:18px;max-height:80%;overflow-y:auto}
      .th-sl{display:block;font-size:12px;font-weight:600;color:${T2};margin:10px 0 4px}
      .th-si{width:100%;padding:9px 12px;border-radius:10px;border:1px solid ${BD};font-size:13px;outline:none;background:#FAFAFA;font-family:inherit}
      .th-sbtn{width:100%;padding:11px 0;border-radius:24px;background:${BK};color:#fff;border:none;font-weight:700;font-size:14px;margin-top:14px;cursor:pointer}
      .th-toast{position:absolute;top:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:8px 18px;border-radius:20px;font-size:13px;z-index:300;pointer-events:none;animation:tf .3s}
      .th-genbtn{width:100%;padding:12px;border-radius:12px;background:#f5f5f5;border:1px solid ${BD};color:${T2};font-size:13px;font-weight:600;cursor:pointer;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:6px}
      @keyframes tf{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    `;
    container.appendChild(style);

    // ── Icons ──
    const I={
      back:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>`,
      gear:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${T2}" stroke-width="1.5"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`,
      refresh:`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
      heart:(f,s=18)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${f?'#FF3040':'none'}" stroke="${f?'#FF3040':T3}" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
      comment:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${T3}" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
      repost:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${T3}" stroke-width="1.8"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
      share:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${T3}" stroke-width="1.8"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`,
      home:(a)=>`<svg width="24" height="24" viewBox="0 0 24 24" fill="${a?BK:'none'}" stroke="${a?BK:T3}" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
      search:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${T3}" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
      write:`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${T3}" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
      user:(a)=>`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${a?BK:T3}" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      verified:`<svg width="14" height="14" viewBox="0 0 24 24" fill="${BLUE}" stroke="#fff" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    };
    function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
    function toast(m){const t=document.createElement('div');t.className='th-toast';t.textContent=m;root.appendChild(t);setTimeout(()=>t.remove(),2500)}



    // ── Context ──
    function ctxLite(){const im=S.imported;if(!im)return '';let c='';if(im.persona)c+=`\n【角色個性】\n${im.persona.slice(0,600)}\n`;if(im.coreSummary)c+=`\n【近況】\n${im.coreSummary.slice(0,400)}\n`;if(im.factMemories?.length)c+=`\n【最近的事】\n${im.factMemories.slice(0,4).map((f,i)=>`${i+1}. ${f.slice(0,120)}`).join('\n')}\n`;return c;}
    function ctxFull(){const im=S.imported;if(!im)return '';let c='';if(im.persona)c+=`\n【角色人設】\n${im.persona}\n`;if(im.coreSummary)c+=`\n【近況】\n${im.coreSummary}\n`;if(im.factMemories?.length)c+=`\n【近期事件】\n${im.factMemories.map((f,i)=>`${i+1}. ${f}`).join('\n')}\n`;if(im.recentMessages?.length)c+=`\n【說話語氣】\n${im.recentMessages.slice(-10).map(t=>'- '+t).join('\n')}\n`;return c;}

    // ── API ──
    async function callAI(p,sys){const msgs=[];if(sys)msgs.push({role:'system',content:sys});msgs.push({role:'user',content:p});const r=await roche.ai.chat({messages:msgs,max_tokens:8000});if(!r)throw new Error('AI 回應為空');return r.text||r.choices?.[0]?.message?.content||'';}
    function parseJSON(raw){const c=raw.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();try{return JSON.parse(c)}catch(_){}const m=c.match(/\[[\s\S]*\]/);if(m)try{return JSON.parse(m[0])}catch(_){}const m2=c.match(/\{[\s\S]*\}/);if(m2)try{return JSON.parse(m2[0])}catch(_){}return null;}

    // ── 自動抓取 ──
    async function fetchChar(){
      S.autoFetching=true;render();
      try{
        const im={importedAt:Date.now(),persona:'',bio:'',coreSummary:'',factMemories:[],recentMessages:[],name:'',handle:''};
        const cid=S.cfg.charId;
        if(cid){try{const f=await roche.character.get(cid);if(f){im.name=f.name||f.handle||'';im.handle=f.handle||'';im.persona=f.persona||'';im.bio=f.bio||'';}}catch(_){}}
        if(!im.name){const ch=S.charList.find(c=>c.id===cid);if(ch)im.name=ch.name||ch.handle||'';}
        // getLongTerm 已含所有對話的 core + facts
        try{const ltm=await roche.memory.getLongTerm();if(ltm?.core?.length)im.coreSummary=ltm.core.map(c=>c.summary||'').filter(Boolean).join('\n\n');if(ltm?.facts?.length)im.factMemories=ltm.facts.slice(0,10).map(f=>(f.action||'').slice(0,200)).filter(Boolean);}catch(_){}
        const allMsgs=[];
        const selIds=S.cfg.selectedConvIds||[];
        const targetConvIds=selIds.length ? selIds : S.convList.filter(c=>{const convId=c.conversationId||c.id||'';const ci=c.contactId||'';const ps=c.participants||[];const n=c.name||'';return ci===cid||ps.includes(cid)||n===S.cfg.charName||convId.startsWith('group_');}).map(c=>c.conversationId||c.id);
        if(targetConvIds.length){
          for(const convId of targetConvIds){
            try{const stm=await roche.memory.getShortTerm({conversationId:convId});if(Array.isArray(stm))allMsgs.push(...stm.filter(m=>!m.isMe&&m.text));}
            catch(_){if(!allMsgs.length){try{const stm=await roche.memory.getShortTerm();if(Array.isArray(stm))allMsgs.push(...stm.filter(m=>!m.isMe&&m.text));}catch(_2){}}break;}
          }
        }else{try{const stm=await roche.memory.getShortTerm();if(Array.isArray(stm))allMsgs.push(...stm.filter(m=>!m.isMe&&m.text));}catch(_){}}
        allMsgs.sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
        const seen=new Set();
        im.recentMessages=allMsgs.filter(m=>{const k=m.text.slice(0,50);if(seen.has(k))return false;seen.add(k);return true;}).slice(-30).map(m=>m.text);
        const convCount=targetConvIds.length||1;
        if(im.name||im.persona||im.coreSummary){S.imported=im;await saveImported();if(!S.cfg.charName)S.cfg.charName=im.name;toast('✨ 已抓取 '+im.name);S.importMsg=`人設${im.persona?'✓':'✕'} 摘要${im.coreSummary?'✓':'✕'} 記憶${im.factMemories.length}筆 語氣${im.recentMessages.length}則（${convCount}個對話）`;S.importErr=false;}
        else{S.importMsg='沒有抓到資料';S.importErr=true;}
      }catch(e){S.importMsg='失敗：'+e.message;S.importErr=true;}
      S.autoFetching=false;render();
    }

    // ═══ 生成：首頁 NPC 串文 ═══
    const SYS_FEED=`你是 Threads 貼文模擬器。生成像真實 Threads/Twitter 用戶發的串文。
重要比例規則：
- 每批串文中，最多只有 1-2 則跟角色興趣相關，其餘全是隨機話題——模擬真實演算法推薦的多樣性
- 每則必須是不同領域、不同情境、不同情緒
- 禁止連續出現同類話題
- 每次生成的話題要新鮮，不要重複之前可能出現過的

語氣規則：
- Threads 風格：文字為主、短小精悍、觀點犀利、段子感強
- 語氣混搭：嘴毒但好笑、溫暖治癒、陰陽怪氣、純搞笑、冷知識、深夜感悟、一本正經胡說八道
- 像真人碎碎念：「我發現了一個規律」「有人跟我一樣嗎」「在座各位有沒有」「說一個殘忍的事實」「這條發出來我要被打」
- 長度差異大：有些一句話（10-30字），有些小段落（80-200字）
- 帶推特/噗浪/Threads 梗
- 暱稱像真人帳號（@xxx + 中文名混搭）

話題池（每次隨機抽，盡量不重複）：
職場毒雞湯、感情觀點、社會觀察、科技吐槽、深夜哲學、美食評論、健身日常、養寵心得、租房血淚、追劇感想、遊戲心得、省錢技巧、通勤故事、天氣抱怨、網購翻車、相親故事、星座玄學、冷知識科普、教育觀點、環保議題、AI話題、音樂推薦、閱讀心得、運動賽事、城市生活、鄰里故事、節日吐槽、時尚觀點、攝影分享、搞笑段子、職業秘密、世代差異、語言梗

只回 JSON 陣列。
格式：[{"handle":"@xxx","author":"名稱","text":"內容","likes":123,"comments":12,"reposts":5,"time":"3小時"}]`;

    async function genFeed(){
      if(S.generating)return;S.generating=true;S.lastError='';render();
      const n=cn(),cnt=parseInt(S.cfg.genCount)||5,ctx=ctxLite();
      const p=`生成 ${cnt} 則 Threads 串文。大部分是隨機熱門話題，只有 1-2 則跟角色有關。隨機種子：${Date.now()}\n${ctx?`\n刷的人是「${n}」的資料（僅供 1-2 則參考）：\n${ctx}`:''}`;
      try{
        const raw=await callAI(p,SYS_FEED);let arr=parseJSON(raw);
        if(!arr||!Array.isArray(arr))throw new Error('JSON 解析失敗：'+raw.slice(0,120));
        const news=arr.map((p,i)=>({...p,id:'f'+Date.now()+'_'+i,avatarGrad:rNpcG(),time:p.time||timeAgo(),likes:p.likes||rl(),comments:p.comments||rc(),reposts:p.reposts||rr()}));
        S.feedPosts=[...news,...S.feedPosts];saveFeed();toast('✨ '+news.length+' 則新串文');
      }catch(e){S.lastError=e.message;toast('⚠ 失敗');}
      S.generating=false;render();
    }

    // ═══ 生成：char 自己的串文 ═══
    async function genMine(){
      if(S.generating)return;S.generating=true;S.lastError='';render();
      const n=cn(),cnt=Math.min(parseInt(S.cfg.genCount)||3,5),ctx=ctxFull();
      const p=`你是「${n}」。\n${ctx}\n以「${n}」的身份生成 ${cnt} 則TA自己會在 Threads 上發的串文。完全貼合角色個性和語氣。Threads 風格——文字為主、短小精悍、像是隨手記下的想法或碎念。\n每則要有 text、likes、comments、reposts、time\n只回 JSON 陣列。`;
      try{
        const raw=await callAI(p);let arr=parseJSON(raw);
        if(!arr||!Array.isArray(arr))throw new Error('JSON 解析失敗：'+raw.slice(0,120));
        const news=arr.map((p,i)=>({...p,id:'m'+Date.now()+'_'+i,author:n,handle:'@'+n.toLowerCase().replace(/\s/g,''),avatarGrad:'linear-gradient(135deg,#667eea,#764ba2)',time:p.time||timeAgo(),likes:p.likes||rl(),comments:p.comments||rc(),reposts:p.reposts||rr()}));
        S.myPosts=[...news,...S.myPosts];saveMine();toast('✨ '+news.length+' 則串文');
      }catch(e){S.lastError=e.message;toast('⚠ 失敗');}
      S.generating=false;render();
    }

    // ═══ 生成：char 會收藏的串文 ═══
    async function genSaved(){
      if(S.generating)return;S.generating=true;S.lastError='';render();
      const n=cn(),cnt=Math.min(parseInt(S.cfg.genCount)||3,5),ctx=ctxLite();
      const p=`生成 ${cnt} 則「${n}」會按讚收藏的 Threads 串文。路人發的，但精準命中TA的興趣審美。${ctx?`\nTA的資料：\n${ctx}`:''}`;
      try{
        const raw=await callAI(p,SYS_FEED);let arr=parseJSON(raw);
        if(!arr||!Array.isArray(arr))throw new Error('JSON 解析失敗：'+raw.slice(0,120));
        const news=arr.map((p,i)=>({...p,id:'s'+Date.now()+'_'+i,avatarGrad:rNpcG(),time:p.time||timeAgo(),likes:p.likes||rl(),comments:p.comments||rc(),reposts:p.reposts||rr()}));
        S.savedPosts=[...news,...S.savedPosts];saveSaved();toast('⭐ '+news.length+' 則收藏');
      }catch(e){S.lastError=e.message;toast('⚠ 失敗');}
      S.generating=false;render();
    }

    // ═══ 生成：回覆串 ═══
    async function genReplies(post){
      if(S.generatingComments)return;S.generatingComments=true;render();
      const isMine=S.myPosts.includes(post),n=cn();
      const sys=`你是 Threads 回覆串模擬器。針對一則串文生成真實的回覆。
回覆要像真實 Threads：短小、犀利、有的附和有的抬槓有的純搞笑。長度差異大（有些就一兩個字「笑死」「真的」，有些是一小段）。
部分回覆可以有 1 則 reply（樓中樓）。
只回 JSON 陣列。格式：[{"author":"名稱","handle":"@xxx","text":"內容","likes":5,"reply":{"author":"xxx","handle":"@xxx","text":"回覆","likes":2}}]
reply 欄位可省略。`;
      const p=`原文：「${post.text}」\n${isMine?`這是「${n}」自己發的。1-2則回覆要有「${n}」本人的回覆（handle: @${n.toLowerCase().replace(/\s/g,'')}），語氣要符合TA。`:''}\n生成 6-10 則回覆。`;
      try{
        const raw=await callAI(p,sys);let arr=parseJSON(raw);
        if(!arr||!Array.isArray(arr))throw new Error('回覆解析失敗');
        arr.forEach(c=>{c.avatarGrad=rNpcG();if(c.reply)c.reply.avatarGrad=rNpcG()});
        post.replies=arr;post.comments=arr.reduce((s,c)=>s+1+(c.reply?1:0),0);
        if(S.feedPosts.includes(post))saveFeed();else if(S.myPosts.includes(post))saveMine();else saveSaved();
        toast('💬 '+arr.length+' 則回覆');
      }catch(e){toast('⚠ 回覆失敗：'+e.message)}
      S.generatingComments=false;render();
    }

    // ── Render ──
    const root=document.createElement('div');root.className='th';container.appendChild(root);
    function render(){
      let h='';
      h+=`<div class="th-hdr"><button class="th-hdr-btn" data-a="exit">${I.back}</button><span class="th-hdr-title">${S.view==='home'?'Threads':cn()}</span><button class="th-hdr-btn" data-a="settings">${I.gear}</button></div>`;
      h+=`<div class="th-body">${S.view==='home'?vHome():vProfile()}</div>`;
      h+=`<div class="th-nav"><button class="th-nav-btn" data-a="go-home">${I.home(S.view==='home')}</button><button class="th-nav-btn">${I.search}</button><button class="th-nav-btn" data-a="gen-feed">${I.write}</button><button class="th-nav-btn" data-a="go-profile">${I.user(S.view==='profile')}</button></div>`;
      if(S.detail)h+=vDetail(S.detail);
      if(S.showSettings)h+=vSettings();
      root.innerHTML=h;
    }

    function postHTML(p,idx,src){
      const k=src[0]+idx,liked=S.liked[k];
      return `<div class="th-post" data-a="open" data-s="${src}" data-i="${idx}" style="cursor:pointer"><div class="th-post-hdr"><div class="th-post-av" style="background:${p.avatarGrad||'#ddd'}"></div><div class="th-post-info"><div class="th-post-top"><div><span class="th-post-name">${esc(p.author)}</span><span class="th-post-handle">${esc(p.handle||'')}</span></div><span class="th-post-time">${esc(p.time||'')}</span></div><div class="th-post-text">${esc(p.text)}</div><div class="th-post-acts"><button class="th-act" data-a="like" data-k="${k}" onclick="event.stopPropagation()">${I.heart(liked,18)}<span style="color:${liked?'#FF3040':T3}">${liked?p.likes+1:p.likes}</span></button><button class="th-act">${I.comment}<span>${p.comments||0}</span></button><button class="th-act">${I.repost}<span>${p.reposts||0}</span></button><button class="th-act">${I.share}</button></div></div></div></div>`;
    }

    function vHome(){
      let h='';
      if(S.lastError)h+=`<div style="margin:8px 14px;padding:10px;border-radius:10px;background:#FFF5F5;border:1px solid #FFDDDD;font-size:12px;color:#CC3333">⚠ ${esc(S.lastError)}</div>`;
      if(!S.imported&&!S.feedPosts.length)h+=`<div style="margin:0 14px 8px;padding:8px 12px;border-radius:8px;background:#FFF8E8;border:1px solid #F0E0B0;font-size:11px;color:#996600">💡 先到設定選擇角色並抓取資料</div>`;
      if(!S.feedPosts.length){
        h+=`<div class="th-empty"><div class="icon">📱</div><p>TA 還沒刷 Threads</p><button class="th-btn" data-a="gen-feed" ${S.generating?'disabled':''}>${S.generating?'⏳':'✨ 刷一刷'}</button></div>`;
      }else{
        h+=S.feedPosts.map((p,i)=>postHTML(p,i,'feed')).join('');
        h+=`<div style="text-align:center;padding:16px"><button class="th-btn-o" data-a="gen-feed" ${S.generating?'disabled':''}>${I.refresh} ${S.generating?'載入中...':'載入更多'}</button></div>`;
      }
      return h;
    }

    function vProfile(){
      const n=cn(),bio=S.imported?.bio||S.imported?.coreSummary||'';
      let h=`<div class="th-phdr"><div class="th-prow"><div><div class="th-pname">${esc(n)}</div><div class="th-phandle">@${esc(n.toLowerCase().replace(/\s/g,''))} ${I.verified}</div></div><div class="th-pav" style="background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700">${n[0]||'?'}</div></div>${bio?`<div class="th-pbio">${esc(bio.slice(0,120))}</div>`:''}<div class="th-pstats"><span><strong>42</strong> 追蹤中</span><span><strong>1,205</strong> 粉絲</span></div></div>`;
      h+=`<div class="th-tabs"><div class="th-tab ${S.profileTab==='threads'?'on':''}" data-a="ptab" data-t="threads">串文</div><div class="th-tab ${S.profileTab==='saved'?'on':''}" data-a="ptab" data-t="saved">已按讚</div></div>`;
      const list=S.profileTab==='threads'?S.myPosts:S.savedPosts;
      const src=S.profileTab==='threads'?'mine':'saved';
      const genAct=S.profileTab==='threads'?'gen-mine':'gen-saved';
      const label=S.profileTab==='threads'?'串文':'按讚收藏';
      if(!list.length){
        h+=`<div class="th-empty"><div class="icon">${S.profileTab==='threads'?'📝':'⭐'}</div><p>還沒有${label}</p><button class="th-btn" data-a="${genAct}" ${S.generating?'disabled':''}>${S.generating?'生成中...':'✨ 生成'+label}</button></div>`;
      }else{
        h+=list.map((p,i)=>postHTML(p,i,src)).join('');
        h+=`<div style="text-align:center;padding:16px"><button class="th-btn-o" data-a="${genAct}" ${S.generating?'disabled':''}>${I.refresh} 生成更多</button></div>`;
      }
      return h;
    }

    function vDetail(p){
      const src=S.feedPosts.includes(p)?'feed':S.myPosts.includes(p)?'mine':'saved';
      const idx=src==='feed'?S.feedPosts.indexOf(p):src==='mine'?S.myPosts.indexOf(p):S.savedPosts.indexOf(p);
      const k=src[0]+idx,liked=S.liked[k];
      let h=`<div class="th-dt"><div class="th-hdr" style="border-bottom:1px solid ${BD}"><button class="th-hdr-btn" data-a="close-dt">${I.back}</button><span style="font-weight:700;font-size:16px">串文</span><div style="width:34px"></div></div><div style="flex:1;overflow-y:auto">`;
      // 原文
      h+=`<div class="th-post" style="border-bottom:none"><div class="th-post-hdr"><div class="th-post-av" style="background:${p.avatarGrad||'#ddd'}"></div><div class="th-post-info"><div class="th-post-top"><div><span class="th-post-name">${esc(p.author)} ${I.verified}</span><span class="th-post-handle">${esc(p.handle||'')}</span></div><span class="th-post-time">${esc(p.time||'')}</span></div><div class="th-post-text" style="font-size:16px">${esc(p.text)}</div><div style="display:flex;gap:20px;margin-top:12px;padding-top:10px;border-top:1px solid ${BD};font-size:13px;color:${T3}"><span><strong style="color:${T1}">${p.reposts||0}</strong> 轉發</span><span><strong style="color:${T1}">${p.likes||0}</strong> 按讚</span></div><div class="th-post-acts" style="border-top:1px solid ${BD};padding-top:10px;margin-top:10px"><button class="th-act" data-a="like" data-k="${k}">${I.heart(liked,20)}</button><button class="th-act">${I.comment}</button><button class="th-act">${I.repost}</button><button class="th-act">${I.share}</button></div></div></div></div>`;
      // 回覆區
      h+=`<div style="border-top:1px solid ${BD}">`;
      if(p.replies&&p.replies.length){
        p.replies.forEach(c=>{
          h+=`<div class="th-cm"><div class="th-cm-hdr"><div class="th-cm-av" style="background:${c.avatarGrad||'#ddd'}"></div><div class="th-cm-body"><div style="display:flex;justify-content:space-between"><span class="th-cm-name">${esc(c.author)} <span style="color:${T3};font-weight:400">${esc(c.handle||'')}</span></span></div><div class="th-cm-text">${esc(c.text)}</div><div class="th-cm-meta"><span>${I.heart(false,14)} ${c.likes||0}</span><span>${I.comment} 回覆</span></div></div></div>`;
          if(c.reply){
            h+=`<div class="th-cm-reply"><div class="th-cm-hdr"><div class="th-cm-av" style="width:26px;height:26px;background:${c.reply.avatarGrad||'#ddd'}"></div><div class="th-cm-body"><span class="th-cm-name">${esc(c.reply.author)} <span style="color:${T3};font-weight:400">${esc(c.reply.handle||'')}</span></span><div class="th-cm-text" style="font-size:13px">${esc(c.reply.text)}</div><div class="th-cm-meta"><span>${I.heart(false,13)} ${c.reply.likes||0}</span></div></div></div></div>`;
          }
          h+=`</div>`;
        });
        h+=`<div style="padding:12px 16px"><button class="th-genbtn" data-a="gen-replies" data-s="${src}" data-i="${idx}" ${S.generatingComments?'disabled':''}>${S.generatingComments?'⏳ 生成中...':I.refresh+' 重新生成回覆'}</button></div>`;
      }else{
        h+=`<div style="padding:16px"><button class="th-genbtn" data-a="gen-replies" data-s="${src}" data-i="${idx}" ${S.generatingComments?'disabled':''}>${S.generatingComments?'⏳ 生成中...':'💬 生成回覆串'}</button></div>`;
      }
      h+=`</div></div></div>`;
      return h;
    }

    function vSettings(){
      const c=S.cfg;
      let h=`<div class="th-mask"><div class="th-set"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><span style="font-weight:700;font-size:15px">設定</span><button data-a="close-set" style="background:none;border:none;font-size:18px;color:${T3};cursor:pointer">✕</button></div>`;
      h+=`<label class="th-sl">👀 偷看誰的 Threads？</label><select class="th-si" data-f="charId">${S.charList.map(ch=>`<option value="${esc(ch.id)}" ${ch.id===c.charId?'selected':''}>${esc(ch.name||ch.handle)}</option>`).join('')}</select>`;
      h+=`<label class="th-sl">🙋 你是誰？</label><select class="th-si" data-f="userId">${S.userList.map(u=>`<option value="${esc(u.id)}" ${u.id===c.userId?'selected':''}>${esc(u.name||u.handle)}</option>`).join('')}</select>`;
      h+=`<label class="th-sl">每次生成幾則</label><input class="th-si" data-f="genCount" type="number" min="1" max="10" value="${c.genCount||5}" style="width:80px">`;
      const selConvs=c.selectedConvIds||[];
      h+=`<label class="th-sl" style="margin-top:12px;padding-top:10px;border-top:1px solid ${BD}">📂 抓取哪些對話的記憶？</label>`;
      h+=`<div style="max-height:160px;overflow-y:auto;background:#f5f5f5;border:1px solid ${BD};border-radius:10px;padding:6px">${S.convList.map(cv=>{const cid=cv.conversationId||cv.id;const nm=cv.name||cv.handle||cid;const isG=cid.startsWith('group_');const chk=selConvs.includes(cid);return`<label style="display:flex;align-items:center;gap:8px;padding:5px 8px;cursor:pointer;border-radius:6px;font-size:12px${chk?';background:#e8e8e8':''}"><input type="checkbox" data-conv-id="${esc(cid)}" ${chk?'checked':''}><span>${isG?'👥':'💬'} ${esc(nm)}</span></label>`;}).join('')}</div>`;
      h+=`<div style="display:flex;gap:6px;margin-top:4px"><button data-a="conv-all" style="padding:3px 10px;border-radius:8px;border:1px solid ${BD};background:#fff;color:${T2};font-size:11px;cursor:pointer">全選</button><button data-a="conv-none" style="padding:3px 10px;border-radius:8px;border:1px solid ${BD};background:#fff;color:${T2};font-size:11px;cursor:pointer">全不選</button></div>`;
      h+=`<button data-a="fetch-char" class="th-sbtn" style="background:#333;margin-top:10px" ${S.autoFetching?'disabled':''}>${S.autoFetching?'⏳ 抓取中...':'🚀 自動抓取角色資料'}</button>`;
      if(S.imported)h+=`<div style="font-size:11px;color:${T2};background:#f5f5f5;border-radius:8px;padding:8px;margin-top:8px">已抓取：<strong>${esc(S.imported.name)}</strong>　${S.importMsg||''}</div>`;
      h+=`<button data-a="save-set" class="th-sbtn">儲存設定</button>`;
      h+=`<button data-a="clear-all" class="th-sbtn" style="background:#fff;color:#FF3040;border:1px solid #FF3040;margin-top:8px">🗑️ 清除所有內容</button>`;
      h+=`</div></div>`;
      return h;
    }

    // ── Events ──
    function onClick(e){
      const b=e.target.closest('[data-a]');if(!b)return;
      const a=b.dataset.a;
      if(a==='settings'){S.showSettings=true;render();}
      else if(a==='close-set'){S.showSettings=false;render();}
      else if(a==='exit'){roche.ui?.closeApp?.();}
      else if(a==='gen-feed'){genFeed();}
      else if(a==='gen-mine'){genMine();}
      else if(a==='gen-saved'){genSaved();}
      else if(a==='go-home'){S.view='home';render();}
      else if(a==='go-profile'){S.view='profile';render();}
      else if(a==='ptab'){S.profileTab=b.dataset.t;render();}
      else if(a==='open'){const s=b.dataset.s,i=parseInt(b.dataset.i);const list=s==='feed'?S.feedPosts:s==='mine'?S.myPosts:S.savedPosts;if(!isNaN(i)&&list[i]){S.detail=list[i];render();}}
      else if(a==='close-dt'){S.detail=null;render();}
      else if(a==='like'){const k=b.dataset.k;S.liked[k]=!S.liked[k];render();}
      else if(a==='gen-replies'){const s=b.dataset.s,i=parseInt(b.dataset.i);const list=s==='feed'?S.feedPosts:s==='mine'?S.myPosts:S.savedPosts;if(!isNaN(i)&&list[i])genReplies(list[i]);}
      else if(a==='conv-all'){root.querySelectorAll('[data-conv-id]').forEach(el=>{el.checked=true});}
      else if(a==='conv-none'){root.querySelectorAll('[data-conv-id]').forEach(el=>{el.checked=false});}
      else if(a==='fetch-char'){
        root.querySelectorAll('[data-f]').forEach(el=>{S.cfg[el.dataset.f]=el.value;});
        S.cfg.selectedConvIds=[];root.querySelectorAll('[data-conv-id]:checked').forEach(el=>{S.cfg.selectedConvIds.push(el.dataset.convId);});
        const ch=S.charList.find(c=>c.id===S.cfg.charId);if(ch)S.cfg.charName=ch.name||ch.handle||'';
        saveCfg();fetchChar();
      }
      else if(a==='save-set'){
        root.querySelectorAll('[data-f]').forEach(el=>{S.cfg[el.dataset.f]=el.value;});
        S.cfg.selectedConvIds=[];root.querySelectorAll('[data-conv-id]:checked').forEach(el=>{S.cfg.selectedConvIds.push(el.dataset.convId);});
        const ch=S.charList.find(c=>c.id===S.cfg.charId);if(ch)S.cfg.charName=ch.name||ch.handle||'';
        saveCfg();S.showSettings=false;toast('已儲存');render();
      }
      else if(a==='clear-all'){S.feedPosts=[];S.myPosts=[];S.savedPosts=[];S.liked={};saveFeed();saveMine();saveSaved();S.showSettings=false;toast('已清除');render();}
    }
    root.addEventListener('click',onClick);
    render();
    this._el=root;this._st=style;this._fn=onClick;
  },

  async unmount(container){
    if(this._el){this._el.removeEventListener('click',this._fn);this._el.remove();}
    if(this._st)this._st.remove();
    container.replaceChildren();
  }
};
window.RochePlugin.register({id:'roche-threads',name:'Threads',version:'2.0.0',description:'偷看 TA 的 Threads',author:'予佟',apps:[app]});
})();
