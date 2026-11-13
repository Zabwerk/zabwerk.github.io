(function(){
'use strict';
const translations={"dossier":["个人履历档案","個人履歴ファイル","Personal Dossier"],"folio":["PERSONAL DOSSIER / 个人资料卷","PERSONAL DOSSIER / 個人資料","PERSONAL DOSSIER"],"index":["档案索引 · ZABWERK / CV","ファイル索引 · ZABWERK / CV","File index · ZABWERK / CV"],"print":["打印 / PDF","印刷 / PDF","Print / PDF"],"back":["返回博客 ↗","ブログへ ↗","Back to blog ↗"],"email":["邮箱 / zabwerk@yeah.net","メール / zabwerk@yeah.net","Email / zabwerk@yeah.net"],"education":["教育背景","学歴","Education"],"experience":["工作经历","職歴","Experience"],"projects":["项目经历","プロジェクト","Projects"],"research":["研究经历","研究歴","Research"],"honors":["获奖情况","受賞歴","Honors"],"skills":["专业技能","専門スキル","Skills"],"certs":["证书与语言","資格・言語","Credentials"],"masters":["硕士研究生 · 杭州师范大学 · 气象专业","修士課程 · 杭州師範大学 · 気象学専攻","Master’s · Hangzhou Normal University · Meteorology"],"bachelors":["本科 · 杭州师范大学 · 地理信息科学专业","学士課程 · 杭州師範大学 · 地理情報科学専攻","Bachelor’s · Hangzhou Normal University · Geographic Information Science"],"status":["硕士在读","修士課程在学中","Master’s in progress"],"footer":["个人履历 · ZABWERK","個人履歴 · ZABWERK","Curriculum Vitae · ZABWERK"],"footerIndex":["档案索引 / CV","ファイル索引 / CV","File index / CV"],"skip":["跳到正文","本文へ移動","Skip to content"],"top":["回到页面顶部","ページ上部へ","Back to top"],"empty":["内容待填写","未記入","To be completed"],"emptySkills":["技能待填写","スキル未記入","Skills to be completed"],"rail":["技能与证书","スキルと資格","Skills and credentials"],"photo":["Zabwerk 头像","Zabwerk の写真","Zabwerk portrait"],"title":["Zabwerk · 个人简历","Zabwerk · 履歴書","Zabwerk · Curriculum Vitae"],"language":["切换语言","言語を切り替え","Change language"]};
const languages=['zh-CN','ja','en'];
const control=document.querySelector('.language-control'),trigger=document.getElementById('btn-language'),options=document.getElementById('language-options');
function close(){options.hidden=true;trigger.setAttribute('aria-expanded','false')}
function apply(lang){
 const i=languages.indexOf(lang);if(i<0)return;
 document.documentElement.lang=lang;
 document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=translations[el.dataset.i18n][i]});
 document.title=translations.title[i];
 const attrs=[['#btn-top','aria-label','top'],['#btn-print','aria-label','print'],['#btn-language','aria-label','language'],['.rail','aria-label','rail'],['.portrait img','alt','photo'],['.empty-record','aria-label','empty'],['.resume-skills .empty-record','aria-label','emptySkills']];
 attrs.forEach(([selector,attr,key])=>document.querySelectorAll(selector).forEach(el=>el.setAttribute(attr,translations[key][i])));
 const meta=document.querySelector('meta[name="description"]');if(meta)meta.content=translations.dossier[i];
 document.querySelectorAll('[data-language]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.language===lang)));
 try{localStorage.setItem('resume-language',lang)}catch(e){}
 close();
}
trigger.addEventListener('click',()=>{const open=options.hidden;options.hidden=!open;trigger.setAttribute('aria-expanded',String(open));if(open)options.querySelector('button').focus()});
options.addEventListener('click',e=>{const b=e.target.closest('[data-language]');if(b){apply(b.dataset.language);trigger.focus()}});
document.addEventListener('click',e=>{if(!control.contains(e.target))close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!options.hidden){close();trigger.focus()}});
let saved='zh-CN';try{saved=localStorage.getItem('resume-language')||saved}catch(e){}
apply(languages.includes(saved)?saved:'zh-CN');
})();