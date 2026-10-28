const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
import {bikes,catalogCheckedAt} from './catalog.js';
import {initLaunchRadar} from './launches.js';
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=value=>{try{const u=new URL(value,location.origin);return u.protocol==='https:'||u.origin===location.origin?u.href:'#';}catch{return '#';}};
const categoryNames={naked:'Naked / Street',sport:'Esportiva',adventure:'Adventure',urban:'Urbana'};
const formatDate=(date,options={day:'2-digit',month:'short',year:'numeric'})=>{const d=new Date(date);return Number.isNaN(d.getTime())?'Data não informada':d.toLocaleDateString('pt-BR',{...options,timeZone:'America/Sao_Paulo'});};
let favorites=[];
try {favorites=JSON.parse(localStorage.getItem('velocity-favorites') || '[]'); if(!Array.isArray(favorites))favorites=[];}catch{}
let scene=null,ride=false,boosting=false,lastFocus=null,scrollBeforeRide=0,proposalBike=null,reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let toastTimer;
function toast(message){$('.toast').textContent=message;$('.toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('.toast').classList.remove('show'),3000);}
let currentCategory='all';
function renderBikes(){
  const brand=$('#brand-filter').value,search=$('#bike-search').value.trim().toLocaleLowerCase('pt-BR');
  const filtered=bikes.filter(b=>(currentCategory==='all'||b.category===currentCategory)&&(brand==='all'||b.brand===brand)&&`${b.name} ${b.brand} ${b.engine}`.toLocaleLowerCase('pt-BR').includes(search));
  $('#bike-grid').innerHTML=filtered.length?filtered.map((bike,i)=>`<article class="bike-card ${/^(honda-|royal-|triumph-)/.test(bike.id)?'lifestyle':''}" style="animation-delay:${Math.min(i,5)*.05}s"><div class="bike-image"><img src="${escapeHTML(bike.image)}" alt="${escapeHTML(bike.brand+' '+bike.name)} — foto do fabricante" loading="lazy" width="900" height="600"><span class="bike-category">${escapeHTML(bike.brand.toUpperCase())}</span><button class="favorite" aria-label="${favorites.includes(bike.id)?'Remover dos':'Adicionar aos'} favoritos: ${escapeHTML(bike.name)}" aria-pressed="${favorites.includes(bike.id)}" data-favorite="${bike.id}">${favorites.includes(bike.id)?'♥':'♡'}</button><span class="image-number">${String(bikes.indexOf(bike)+1).padStart(2,'0')}</span></div><div class="bike-info"><div class="bike-title-row"><h3>${escapeHTML(bike.name)}</h3><span>${escapeHTML(bike.modelYear)}</span></div><p class="bike-specs"><span>${escapeHTML(bike.engine)}</span><span>${categoryNames[bike.category]||'Moto'}</span></p><p class="bike-description">${escapeHTML(bike.description)}</p><div class="bike-price-row"><p class="model-label">CONHEÇA O MODELO</p><button class="card-explore" data-detail="${bike.id}" aria-label="Explorar ${escapeHTML(bike.name)}">↗</button></div></div></article>`).join(''):'<div class="empty-state"><h3>Nenhuma moto nessa rota.</h3><p>Tente outra marca, categoria ou nome.</p><button class="secondary-button" id="reset-catalog">Limpar filtros ↗</button></div>';
  $('.stock-count').textContent=`${String(filtered.length).padStart(2,'0')} ${filtered.length===1?'MODELO PARA EXPLORAR':'MODELOS PARA EXPLORAR'}`;
  $('#reset-catalog')?.addEventListener('click',()=>{currentCategory='all';$('#brand-filter').value='all';$('#bike-search').value='';$$('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter==='all');b.setAttribute('aria-pressed',b.dataset.filter==='all');});renderBikes();});
}
$('#total-bikes').textContent=String(bikes.length).padStart(2,'0');
$('#brand-filter').insertAdjacentHTML('beforeend',[...new Set(bikes.map(b=>b.brand))].sort().map(brand=>`<option>${escapeHTML(brand)}</option>`).join(''));
$('#catalog-note').textContent+=` Curadoria verificada em ${formatDate(catalogCheckedAt+'T12:00:00Z')}.`;
$('#brand-filter').addEventListener('change',renderBikes);$('#bike-search').addEventListener('input',renderBikes);
renderBikes();
$$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  $$('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',b===button);});currentCategory=button.dataset.filter;renderBikes();
}));
document.addEventListener('click',event=>{
  const favorite=event.target.closest('[data-favorite]');
  if(favorite){const id=favorite.dataset.favorite;favorites=favorites.includes(id)?favorites.filter(f=>f!==id):[...favorites,id];try{localStorage.setItem('velocity-favorites',JSON.stringify(favorites));}catch{}favorite.textContent=favorites.includes(id)?'♥':'♡';favorite.setAttribute('aria-pressed',favorites.includes(id));favorite.setAttribute('aria-label',`${favorites.includes(id)?'Remover dos':'Adicionar aos'} favoritos: ${bikes.find(b=>b.id===id).name}`);toast(favorites.includes(id)?'Moto salva nos seus favoritos.':'Moto removida dos favoritos.');}
  const detail=event.target.closest('[data-detail]');if(detail)openDetails(detail.dataset.detail);
  const open=event.target.closest('[data-open]');if(open){if(open.dataset.open==='credits')openCredits();else openLead(open.dataset.open);}
});
function showDialog(dialog){lastFocus=document.activeElement;dialog.showModal();document.body.style.overflow='hidden';}
function closeDialog(dialog){dialog.close();document.body.style.overflow='';lastFocus?.focus();}
$$('dialog').forEach(dialog=>{
  $('.dialog-close',dialog).addEventListener('click',()=>closeDialog(dialog));
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog);}});
  dialog.addEventListener('close',()=>{document.body.style.overflow='';});
});
function openDetails(id){
  const bike=bikes.find(b=>b.id===id);if(!bike)return;
  $('#details-dialog').setAttribute('aria-label',`Detalhes de ${bike.name}`);
  $('#details-content').innerHTML=`<div class="details-layout"><div class="details-image-wrap ${/^(honda-|royal-|triumph-)/.test(bike.id)?'lifestyle':''}"><img class="details-image" src="${escapeHTML(bike.image)}" alt="${escapeHTML(bike.name)} — foto do fabricante"></div><div class="details-copy"><p class="eyebrow">${escapeHTML(bike.brand.toUpperCase())} / ${categoryNames[bike.category]}</p><h2>${escapeHTML(bike.name)}</h2><p class="details-year">${escapeHTML(bike.modelYear)} · Modelo de referência</p><p class="detail-description">${escapeHTML(bike.description)}</p><div class="detail-spec-grid"><div><small>LINHA / ANO-MODELO</small>${escapeHTML(bike.modelYear)}</div><div><small>CILINDRADA</small>${escapeHTML(bike.engine)}</div><div><small>PERFIL</small>${categoryNames[bike.category]}</div><div><small>FONTE CONSULTADA</small>${formatDate(bike.checkedAt+'T12:00:00Z')}</div></div><a class="official-link" href="${escapeHTML(safeUrl(bike.officialUrl))}" target="_blank" rel="noopener noreferrer">Ficha completa no fabricante ↗</a><button class="button button-lime" id="make-proposal">Tenho interesse nesse modelo <span>↗</span></button><p class="demo-note">Vitrine informativa. Imagem e especificações do fabricante. Não representa unidade em estoque, preço ou oferta comercial. Versões e equipamentos podem variar.</p></div></div>`;
  showDialog($('#details-dialog'));
  $('#make-proposal').addEventListener('click',()=>{closeDialog($('#details-dialog'));proposalBike=bike;openLead('proposal');});
}
function openCredits(){
  $('#details-dialog').setAttribute('aria-label','Créditos do projeto');
  $('#details-content').innerHTML=`<div class="lead-inner"><p class="eyebrow">INFORMAÇÃO COM ORIGEM</p><h2>POR TRÁS<br>DA EXPERIÊNCIA.</h2><p>A vitrine utiliza fotos de divulgação e informações dos fabricantes. Cada modelo aponta para sua página oficial. O radar agrega comunicados públicos, preserva as datas de publicação e identifica a situação de cada fonte. Marcas e imagens pertencem aos respectivos titulares.</p><div class="credits-list"><p>FABRICANTES / FONTES DA VITRINE</p>${[...new Set(bikes.map(b=>b.brand))].map(brand=>{const b=bikes.find(b=>b.brand===brand);return `<a href="${escapeHTML(b.officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(brand)} ↗</a>`;}).join('')}<p>EXPERIÊNCIA TRIDIMENSIONAL</p><span>Modelagem procedural original · <a href="assets/three-license.txt" target="_blank" rel="noopener">Three.js / MIT</a></span><p>TIPOGRAFIA</p><span>Barlow & Barlow Condensed · <a href="assets/fonts-license.txt" target="_blank" rel="noopener">SIL Open Font License</a></span></div></div>`;
  showDialog($('#details-dialog'));
}
function openLead(type='contact'){
  const trade=type==='trade',proposal=type==='proposal';
  $('#lead-content').innerHTML=`<div class="lead-inner"><p class="eyebrow">${trade?'SUA PRÓXIMA MARCHA':proposal?'SEU PRÓXIMO CAPÍTULO':'VAMOS CRIAR NOVOS CAMINHOS'}</p><h2>${trade?'O QUE VEM<br>DEPOIS DA SUA?':proposal?`VAMOS DE<br>${proposalBike.name}?`:'QUAL É O SEU<br>PRÓXIMO DESTINO?'}</h2><p>${trade?'Conte um pouco sobre sua moto para montar seu resumo de venda ou troca.':proposal?'Personalize sua proposta e salve os detalhes para dar o próximo passo.':'Conte o que você procura. Vamos organizar sua intenção em um resumo para você salvar.'}</p><form class="lead-form"><label>SEU NOME<input name="name" autocomplete="given-name" placeholder="Como podemos chamar você?" required maxlength="70"></label><label>SEU INTERESSE<select name="interest"><option${trade?' selected':''}>Trocar minha moto</option><option${proposal?' selected':''}>Comprar uma moto</option><option>Vender minha moto</option><option${!trade&&!proposal?' selected':''}>Conhecer as possibilidades</option></select></label>${trade?'<label class="full-width">QUAL É A SUA MOTO?<input name="currentBike" placeholder="Marca, modelo e versão" required maxlength="100"></label><label>ANO<input name="year" type="number" min="1950" max="2027" placeholder="Ex.: 2022" required></label><label>QUILOMETRAGEM<input name="mileage" type="number" min="0" max="999999" placeholder="Ex.: 15000" required></label>':`<label class="full-width">MOTO QUE VOCÊ PROCURA<select name="desiredBike"><option value="Ainda estou explorando">Ainda estou explorando</option>${bikes.map(b=>`<option${proposal&&proposalBike.id===b.id?' selected':''}>${b.name}</option>`).join('')}</select></label>`}<label class="full-width">O QUE MAIS IMPORTA PARA VOCÊ?<textarea name="message" maxlength="600" placeholder="Estilo de pilotagem, planos, sua moto atual..."></textarea></label><button class="button button-lime full-width" type="submit">${trade?'Preparar minha avaliação':'Montar meu resumo'} <span>↗</span></button><p class="form-footnote full-width">Experiência demonstrativa. Os dados ficam apenas nesta página. Nenhuma mensagem será enviada e não há avaliação ou proposta comercial real.</p></form></div>`;
  showDialog($('#lead-dialog'));
  $('.lead-form').addEventListener('submit',event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));renderSummary(values,trade);});
}
function renderSummary(values,trade){
  const text=`VELOCITY / MEU PRÓXIMO CAPÍTULO\n\nNome: ${values.name.trim()}\nInteresse: ${values.interest}\n${trade?`Minha moto: ${values.currentBike}\nAno: ${values.year}\nQuilometragem: ${Number(values.mileage).toLocaleString('pt-BR')} km`:`Moto desejada: ${values.desiredBike}`}\n${values.message?`\nO que procuro: ${values.message}\n`:''}\nResumo demonstrativo criado no site conceito VELOCITY. Não constitui avaliação ou proposta comercial.`;
  $('#lead-content').innerHTML=`<div class="lead-inner"><div class="success-mark">↗</div><p class="eyebrow">PRÓXIMO PASSO PREPARADO</p><h2>SUA ROTA.<br>DO SEU JEITO.</h2><p>Seu resumo está pronto. Você pode copiar ou baixar para consultar depois. Nada foi enviado.</p><pre class="proposal-summary">${escapeHTML(text)}</pre><div class="success-actions"><button class="button button-lime" id="download-summary">Baixar resumo <span>↓</span></button><button class="secondary-button" id="copy-summary">Copiar resumo</button></div></div>`;
  $('#download-summary').addEventListener('click',()=>{const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='velocity-meu-proximo-capitulo.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Seu resumo foi baixado.');});
  $('#copy-summary').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(text);toast('Resumo copiado.');}catch{toast('Use Baixar resumo para salvar seu texto.');}});
}
$('.menu-toggle').addEventListener('click',()=>{const open=$('.mobile-nav').hidden;$('.mobile-nav').hidden=!open;$('.menu-toggle').setAttribute('aria-expanded',open);$('.menu-toggle').setAttribute('aria-label',open?'Fechar menu':'Abrir menu');});
$$('.mobile-nav a,.mobile-nav button').forEach(a=>a.addEventListener('click',()=>{$('.mobile-nav').hidden=true;$('.menu-toggle').setAttribute('aria-expanded','false');}));
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.1});
$$('.section-heading,.trade-layout,.final-cta h2,.stock-footer').forEach(el=>{el.classList.add('reveal');observer.observe(el);});
function updateMotion(){document.documentElement.classList.toggle('reduced-motion',reducedMotion);$('.motion-toggle').textContent=`Animações: ${reducedMotion?'pausadas':'ativadas'}`;$('.motion-toggle').setAttribute('aria-pressed',reducedMotion);scene?.setReducedMotion(reducedMotion);}
$('.motion-toggle').addEventListener('click',()=>{reducedMotion=!reducedMotion;updateMotion();});
updateMotion();
function setBoost(value){boosting=ride&&value;scene?.setBoost(boosting);document.body.classList.toggle('boosting',boosting);}
function enterRide(){if(!scene){toast('A estrada 3D ainda está carregando.');return;}lastFocus=document.activeElement;scrollBeforeRide=window.scrollY;ride=true;$('.ride-ui').hidden=false;document.body.classList.add('ride-mode');scene.setRide(true);$('.exit-ride').focus();$('.ride-intro').style.animation='none';requestAnimationFrame(()=>$('.ride-intro').style.animation='');}
function exitRide(){setBoost(false);ride=false;scene?.setRide(false);$('.ride-ui').hidden=true;document.body.classList.remove('ride-mode');window.scrollTo({top:scrollBeforeRide,behavior:'instant'});lastFocus?.focus();}
$$('.ride-trigger').forEach(button=>button.addEventListener('click',enterRide));
$('.exit-ride').addEventListener('click',exitRide);
$('.boost-button').addEventListener('pointerdown',e=>{e.currentTarget.setPointerCapture(e.pointerId);setBoost(true);});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>$('.boost-button').addEventListener(type,()=>setBoost(false)));
window.addEventListener('blur',()=>setBoost(false));
window.addEventListener('keydown',e=>{if(!ride)return;if(e.key==='Escape')exitRide();if(e.code==='Space'||e.key==='ArrowUp'){e.preventDefault();setBoost(true);}if(e.key==='ArrowLeft'){e.preventDefault();scene.setPointer(-.8,0);}if(e.key==='ArrowRight'){e.preventDefault();scene.setPointer(.8,0);}});
window.addEventListener('keyup',e=>{if(!ride)return;if(e.code==='Space'||e.key==='ArrowUp')setBoost(false);if(e.key==='ArrowLeft'||e.key==='ArrowRight')scene.setPointer(0,0);});
window.addEventListener('pointermove',e=>{scene?.setPointer((e.clientX/window.innerWidth)*2-1,(e.clientY/window.innerHeight)*2-1);},{passive:true});
window.addEventListener('touchmove',e=>{if(ride&&e.touches[0])scene?.setPointer(e.touches[0].clientX/window.innerWidth*2-1,0);},{passive:true});
$$('.swatch').forEach(button=>button.addEventListener('click',()=>{$$('.swatch').forEach(b=>{b.classList.toggle('active',button===b);b.setAttribute('aria-pressed',button===b);});scene?.setColor(button.dataset.color);}));
let scrollTick=false;
function updateJourney(){if(ride)return;scene?.setProgress(window.scrollY/(document.documentElement.scrollHeight-window.innerHeight));const road=$('#universo').getBoundingClientRect();const distance=Math.abs(road.top+road.height*.5-window.innerHeight*.5);scene?.setJourney(Math.max(0,1-distance/(road.height*.5+window.innerHeight*.35)));}
window.addEventListener('scroll',()=>{if(!scrollTick){requestAnimationFrame(()=>{updateJourney();scrollTick=false;});scrollTick=true;}},{passive:true});
async function startScene(){try{
  const {initScene}=await import('./scene.js');
  scene=initScene($('#scene'),{onReady:()=>document.body.classList.add('loaded'),onSpeed:speed=>{$('#speed').textContent=Math.round(speed);$('.gear>span').textContent=boosting?'5':'3';}});
  window.velocityScene=scene;
  updateMotion();updateJourney();document.body.classList.add('loaded');
}catch(error){console.error('3D scene:',error);document.body.classList.add('loaded');$('#scene').innerHTML='<div class="fallback-note">A experiência 3D precisa de WebGL. Você pode continuar explorando as motos e a jornada de troca abaixo.</div>';$$('.ride-trigger').forEach(b=>{b.disabled=true;b.title='A pilotagem precisa de suporte a WebGL.';});}}
startScene();
initLaunchRadar();
