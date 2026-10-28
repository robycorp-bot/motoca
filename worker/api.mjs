// Official public newsrooms are aggregated here; this is not a manufacturer-owned API.
export const CACHE_TTL_SECONDS = 900;
export const SOURCES = [
  {brand:'Honda',url:'https://cmssaladeimprensa.honda.com.br/api/releases?items_per_page=50',pageUrl:'https://saladeimprensa.honda.com.br/motocicletas',baseUrl:'https://saladeimprensa.honda.com.br',type:'honda-json',domains:['saladeimprensa.honda.com.br'],imageDomains:['cmssaladeimprensa.honda.com.br','saladeimprensa.honda.com.br']},
  {brand:'Yamaha',url:'https://www.yamaha-motor.com.br/api/blog',pageUrl:'https://www.yamaha-motor.com.br/noticias',type:'yamaha',method:'POST',body:{limit:24,offset:0,enabled:true},domains:['www.yamaha-motor.com.br','yamaha-motor.com.br'],imageDomains:['stgmkpprd.blob.core.windows.net','www.yamaha-motor.com.br']},
  {brand:'Shineray',url:'https://www.shineray.com.br/wp-json/wp/v2/posts?per_page=12&_embed',pageUrl:'https://www.shineray.com.br/noticias/',type:'wordpress',domains:['www.shineray.com.br','shineray.com.br'],imageDomains:['www.shineray.com.br','shineray.com.br']},
  {brand:'BMW',url:'https://www.press.bmwgroup.com/brazil/rss',pageUrl:'https://www.press.bmwgroup.com/brazil',type:'rss',domains:['www.press.bmwgroup.com'],imageDomains:['www.press.bmwgroup.com','mediapool.bmwgroup.com']}
];

export function plainText(input){
  return String(input??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const value=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return value>0&&value<=0x10ffff?String.fromCodePoint(value):'';}).replace(/&(?:amp|lt|gt|quot|apos|nbsp|ndash|mdash|hellip|aacute|atilde|acirc|eacute|ecirc|iacute|oacute|ocirc|otilde|uacute|ccedil);/gi,entity=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' ','&ndash;':'–','&mdash;':'—','&hellip;':'…','&aacute;':'á','&atilde;':'ã','&acirc;':'â','&eacute;':'é','&ecirc;':'ê','&iacute;':'í','&oacute;':'ó','&ocirc;':'ô','&otilde;':'õ','&uacute;':'ú','&ccedil;':'ç'}[entity.toLowerCase()]??entity)).replace(/\s+/g,' ').trim();
}
export function trustedUrl(input,base,domains){
  if(typeof input!=='string'||!input.trim())return null;
  try{const url=new URL(input.replace(/&amp;/g,'&'),base);if(url.protocol!=='https:'||url.username||url.password||!domains.includes(url.hostname.toLowerCase()))return null;url.hash='';return url.href;}catch{return null;}
}
function attribute(tag,name){return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`,'i'))?.[1]??'';}
function dateValue(input){
  const raw=plainText(input),br=raw.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if(br)return `${br[3]}-${br[2]}-${br[1]}`;
  const iso=raw.match(/^\d{4}-\d{2}-\d{2}/);if(iso)return iso[0];
  const timestamp=Date.parse(raw);return Number.isFinite(timestamp)?new Date(timestamp).toISOString().slice(0,10):null;
}
function normalizeItem(raw,source,now){
  const title=plainText(raw.title).slice(0,260),url=trustedUrl(raw.url,source.baseUrl??source.url,source.domains),date=dateValue(raw.date);
  const oldest=new Date(now.getTime()-366*86400000).toISOString().slice(0,10);
  if(!title||!url||!date||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>now.toISOString().slice(0,10)||date<oldest)return null;
  const image=trustedUrl(raw.image,source.url,source.imageDomains);
  return {id:`${source.brand.toLowerCase()}-${url.split('/').filter(Boolean).pop().split('?')[0]}`,title,brand:source.brand,date,url,...(image?{image}:{}),...(raw.market?{market:raw.market}:{}),summary:`Comunicado publicado pela ${source.brand}. Consulte os detalhes e a disponibilidade na fonte oficial.`};
}
export function isProductLaunch(title,brand){
  const text=plainText(title);
  if(/calend[aá]rio|rally|rali|corrida|patrocin|pilotos?|vendas|emplacament|recorde|resultados?|campe[aã]o|temporada|programa de test ride|comunicado importante|financiament|concession[aá]ri|opera[çc][aã]o|blustar|lubrificant|yamalube|document[aá]r|s[eé]rie documental|motogp|moto3|colecion[aá]v|festival\b(?!.*nova aventureira)/i.test(text))return false;
  if(brand==='BMW'&&!/\b(?:R|F|G|S|M)\s?\d{3,4}|\bCE\s?0[24]\b|motorrad.*(?:linha|modelos|cores)/i.test(text))return false;
  return /20\d{2}|lan[çc]a|novo modelo|nova gera[çc][aã]o|nova aventureira|novo scooter|novas cores|amplia portf[oó]lio|anuncia|apresenta|estreia|chega|renova|novo|nova/i.test(text);
}
export function parseHonda(html,source=SOURCES[0],now=new Date()){
  const records=[];const links=[...html.matchAll(/<a\b[^>]*\bclass=["'][^"']*\btitle\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi)];
  for(const match of links){
    const title=plainText(match[0]),url=attribute(match[0],'href');if(!isProductLaunch(title,source.brand))continue;
    // Honda newsroom cards place their image and publication date immediately before the title.
    const before=html.slice(Math.max(0,match.index-2200),match.index),dates=[...before.matchAll(/\bclass=["']date["'][^>]*>([\s\S]*?)<\/div>/gi)],images=[...before.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)];
    const image=images.map(m=>m[1]).reverse().find(src=>/cmssaladeimprensa\.honda\.com\.br/.test(src));
    const item=normalizeItem({title,url,date:dates.at(-1)?.[1],image},source,now);if(item)records.push(item);
  }return deduplicate(records);
}
export function parseHondaJson(payload,source=SOURCES[0],now=new Date()){
  if(!Array.isArray(payload?.rows))throw new Error('Invalid Honda response');
  return deduplicate(payload.rows.filter(row=>plainText(row.segment_title)==='Motocicletas'&&isProductLaunch(row.title,'Honda')).map(row=>normalizeItem({title:row.title,date:row.created_at,url:row.content_url,image:row.field_field_releases_embed?new URL(row.field_field_releases_embed,'https://cmssaladeimprensa.honda.com.br').href:null,market:'Brasil'},source,now)).filter(Boolean));
}
export function parseYamaha(payload,source=SOURCES[1],now=new Date()){
  if(!Array.isArray(payload?.result?.items))throw new Error('Invalid Yamaha response');
  return deduplicate(payload.result.items.filter(row=>row.enabled!==false&&isProductLaunch(row.title,'Yamaha')&&Number.isSafeInteger(Number(row.blogId))).map(row=>{
    const slug=plainText(row.title).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    return normalizeItem({title:row.title,date:row.displayDateStart,url:`https://www.yamaha-motor.com.br/noticia/${Number(row.blogId)}/${slug}`,image:row.images?.[0]?.imageDesktop,market:'Brasil'},source,now);
  }).filter(Boolean));
}
export function parseWordpress(posts,source=SOURCES[2],now=new Date()){
  if(!Array.isArray(posts))throw new Error('Invalid WordPress response');
  return deduplicate(posts.map(post=>{
    const title=plainText(post.title?.rendered);if(!isProductLaunch(title,source.brand))return null;
    const media=post._embedded?.['wp:featuredmedia']?.[0];
    return normalizeItem({title,url:post.link,date:post.date,image:media?.media_details?.sizes?.medium_large?.source_url??media?.source_url,market:'Brasil'},source,now);
  }).filter(Boolean));
}
export function parseRss(xml,source=SOURCES[3],now=new Date()){
  return deduplicate([...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(match=>{
    const tag=name=>match[1].match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1];
    const title=plainText(tag('title'));if(!isProductLaunch(title,source.brand))return null;
    const image=match[1].match(/<(?:media:content|enclosure)\b[^>]*\burl=["']([^"']+)["']/i)?.[1];
    const context=plainText(title+' '+(tag('description')??'')),market=/europe|europa|europeu/i.test(context)&&!/brasil|brasileir/i.test(context)?'Europa':undefined;
    return normalizeItem({title,url:plainText(tag('link')),date:tag('pubDate'),image,market},source,now);
  }).filter(Boolean));
}
function deduplicate(items){return [...new Map(items.map(item=>[item.url,item])).values()].sort((a,b)=>b.date.localeCompare(a.date));}
async function fetchSource(source,fetcher,now){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetcher(source.url,{method:source.method??'GET',...(source.body?{body:JSON.stringify(source.body)}:{}),headers:{'accept':['wordpress','honda-json','yamaha'].includes(source.type)?'application/json':'text/html, application/rss+xml, application/xml;q=0.9',...(source.body?{'content-type':'application/json'}:{})},signal:controller.signal,redirect:'follow'});
    if(!response.ok)throw new Error('Upstream unavailable');
    const body=await response.text();if(body.length>3000000)throw new Error('Response too large');
    const items=source.type==='wordpress'?parseWordpress(JSON.parse(body),source,now):source.type==='honda-json'?parseHondaJson(JSON.parse(body),source,now):source.type==='yamaha'?parseYamaha(JSON.parse(body),source,now):source.type==='honda'?parseHonda(body,source,now):parseRss(body,source,now);
    if(!items.length)throw new Error('No valid launches in this source');return items.slice(0,14);
  }finally{clearTimeout(timer);}
}
export function createLaunchService({snapshot={items:[],verifiedAt:null},fetcher=fetch,now=()=>new Date(),sources=SOURCES}={}){
  let memory=null,pending=null;
  async function refresh(){
    const checked=now(),checkedAt=checked.toISOString();
    const results=await Promise.allSettled(sources.map(source=>fetchSource(source,fetcher,checked)));
    const items=[],states=[];
    results.forEach((result,index)=>{
      const source=sources[index];let data,status;
      if(result.status==='fulfilled'){data=result.value;status='live';}
      else{data=(snapshot.items??[]).filter(item=>item.brand===source.brand).map(item=>normalizeItem(item,source,checked)).filter(Boolean);status=data.length?'fallback':'error';}
      items.push(...data);states.push({brand:source.brand,url:source.pageUrl??source.url,endpoint:source.url,status,checkedAt,itemCount:data.length,...(status==='fallback'?{verifiedAt:snapshot.verifiedAt??null}:{}),...(status==='error'?{message:'A fonte oficial não retornou lançamentos válidos nesta consulta.'}:{})});
    });
    const live=states.filter(s=>s.status==='live').length,status=live===sources.length?'live':live?'partial':'fallback';
    const payload={items:deduplicate(items).slice(0,36),fetchedAt:checkedAt,cacheTtlSeconds:CACHE_TTL_SECONDS,sources:states,status,notice:status==='live'?'Consulta concluída nas fontes oficiais. As datas exibidas são as datas dos comunicados.':status==='partial'?'Algumas fontes estão indisponíveis. Quando indicado, exibimos a última seleção verificada.':'As fontes estão indisponíveis nesta consulta. Exibimos somente a última seleção verificada, quando disponível.'};
    memory={payload,expires:checked.getTime()+CACHE_TTL_SECONDS*1000};return payload;
  }
  async function getPayload(request,ctx){
    if(memory&&memory.expires>now().getTime())return memory.payload;
    const cache=globalThis.caches?.default,cacheKey=new Request(new URL('/__launches-cache-v1',request.url));
    if(cache){try{const cached=await cache.match(cacheKey);if(cached){const payload=await cached.json();if(Date.parse(payload.fetchedAt)+CACHE_TTL_SECONDS*1000>now().getTime()){memory={payload,expires:Date.parse(payload.fetchedAt)+CACHE_TTL_SECONDS*1000};return payload;}}}catch{}}
    if(!pending)pending=refresh().finally(()=>{pending=null;});
    const payload=await pending;
    if(cache){const promise=cache.put(cacheKey,new Response(JSON.stringify(payload),{headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${CACHE_TTL_SECONDS}`}})).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(promise);else await promise;}
    return payload;
  }
  return {async fetch(request,env,ctx){
    if(!['GET','HEAD'].includes(request.method))return json({error:'Método não permitido.'},405,request.method,{'allow':'GET, HEAD'});
    const url=new URL(request.url),brand=url.searchParams.get('brand');
    const selected=brand?sources.find(source=>source.brand.toLowerCase()===brand.toLowerCase()):null;
    if(brand&&!selected)return json({error:'Marca inválida.',brands:sources.map(s=>s.brand)},400,request.method);
    const payload=await getPayload(request,ctx),result=selected?{...payload,items:payload.items.filter(item=>item.brand===selected.brand)}:payload;
    return json(result,result.items.length?200:503,request.method,{'cache-control':`private, max-age=60`});
  }};
}
function json(body,status,method,extra={}){return new Response(method==='HEAD'?null:JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff',...extra}});}
