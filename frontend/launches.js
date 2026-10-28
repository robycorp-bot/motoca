const el=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const https=value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}};
const formatDate=(value,time=false)=>{const raw=/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T12:00:00Z':value,date=new Date(raw);if(!Number.isFinite(date.getTime()))return 'Data não informada';return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:time?'2-digit':'short',year:'numeric',...(time?{hour:'2-digit',minute:'2-digit'}:{}),timeZone:'America/Sao_Paulo'}).format(date);};
export function initLaunchRadar(){
  let payload=null,brand='all',visible=6,busy=false,lastAttempt=0;
  const loadButton=el('#refresh-launches'),state=el('#api-state'),freshness=el('#api-freshness'),grid=el('#launch-grid');
  const more=document.createElement('div');more.className='launch-more';grid.after(more);
  const notice=document.createElement('p');notice.className='api-notice';el('.launch-toolbar').after(notice);
  function render(){
    const items=(payload?.items??[]).filter(item=>brand==='all'||item.brand===brand);
    grid.innerHTML=items.length?items.slice(0,visible).map(item=>{
      const source=payload.sources.find(source=>source.brand===item.brand),url=https(item.url),image=https(item.image),fallback=source?.status==='fallback';
      return `<a class="launch-card" href="${esc(url||'#')}" target="_blank" rel="noopener noreferrer" aria-label="${esc(item.title)} — fonte oficial, abre em nova aba"><div class="launch-art">${image?`<img src="${esc(image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:`<span>${esc(item.brand)}</span>`}</div><div class="launch-copy"><div class="launch-meta"><strong>${esc(item.brand==='BMW'?'BMW Motorrad':item.brand)}</strong><time datetime="${esc(item.date)}">${formatDate(item.date)}</time></div><h3>${esc(item.title)}</h3>${item.market?`<span class="market-badge">MERCADO: ${esc(item.market)}</span>`:''}${fallback?'<span class="source-fallback">REFERÊNCIA VERIFICADA · FONTE INDISPONÍVEL</span>':''}<div class="launch-end"><span>LEIA NO FABRICANTE</span><span>↗</span></div></div></a>`;
    }).join(''):'<div class="launch-placeholder">Nenhum comunicado de lançamento disponível para esta seleção.<br>Veja a situação das fontes abaixo ou escolha outra marca.</div>';
    grid.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{const fallback=document.createElement('span');fallback.textContent=img.closest('.launch-card').querySelector('.launch-meta strong').textContent;img.replaceWith(fallback);},{once:true}));
    more.innerHTML=items.length>visible?`<button class="secondary-button">Ver mais comunicados (${items.length-visible}) ↓</button>`:'';
    more.querySelector('button')?.addEventListener('click',()=>{visible+=6;render();});
  }
  async function load(){
    if(busy)return;busy=true;lastAttempt=Date.now();loadButton.disabled=true;state.textContent='CONSULTANDO FONTES';state.dataset.state='loading';
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch('/api/launches',{signal:controller.signal,headers:{accept:'application/json'},cache:'no-store'});
      if(!response.ok)throw new Error('API unavailable');
      const data=await response.json();
      if(!Array.isArray(data.items)||!Array.isArray(data.sources)||!data.fetchedAt)throw new Error('Invalid API data');
      payload=data;state.dataset.state=data.status;
      state.textContent=data.status==='live'?'FONTES CONSULTADAS':data.status==='partial'?'ATUALIZAÇÃO PARCIAL':'SELEÇÃO DE REFERÊNCIA';
      freshness.textContent=`Consulta: ${formatDate(data.fetchedAt,true)} · Horário de Brasília`;
      notice.textContent=data.status==='live'?'Datas de publicação preservadas. Consulte o mercado e a disponibilidade em cada comunicado.':data.notice||'Algumas fontes não responderam. Conteúdo de referência está identificado.';
      el('#source-status').innerHTML=data.sources.map(source=>`<div class="source-status-row" data-state="${esc(source.status)}"><a href="${esc(https(source.url)||'#')}" target="_blank" rel="noopener noreferrer">${esc(source.brand==='BMW'?'BMW Motorrad':source.brand)} ↗</a><span>${source.status==='live'?`${source.itemCount} comunicados consultados`:source.status==='fallback'?`Referência verificada em ${formatDate(source.verifiedAt||data.fetchedAt)}`:'Fonte indisponível nesta consulta'}</span></div>`).join('');
      render();
    }catch{
      state.textContent=payload?'ÚLTIMA CONSULTA SALVA':'RADAR INDISPONÍVEL';state.dataset.state='error';
      notice.textContent=payload?'Não foi possível renovar o radar. Os cartões permanecem na data da última consulta indicada.':'Não foi possível consultar os fabricantes agora. Use Atualizar radar para tentar novamente.';
      if(!payload){freshness.textContent='Nenhuma atualização confirmada nesta sessão.';grid.innerHTML='<div class="launch-placeholder">A conexão com o radar está temporariamente indisponível.<br>A vitrine de modelos e as fichas oficiais continuam disponíveis acima.</div>';el('#source-status').textContent='A situação das fontes aparecerá após uma consulta bem-sucedida.';}
    }finally{clearTimeout(timeout);busy=false;loadButton.disabled=false;}
  }
  loadButton.addEventListener('click',load);
  document.querySelectorAll('[data-launch-brand]').forEach(button=>button.addEventListener('click',()=>{brand=button.dataset.launchBrand;visible=6;document.querySelectorAll('[data-launch-brand]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);});if(payload)render();}));
  setInterval(()=>{if(!document.hidden)load();},15*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastAttempt>=15*60*1000)load();});
  load();
}
