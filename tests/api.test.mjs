import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHonda,parseHondaJson,parseYamaha,parseRss,parseWordpress,createLaunchService,SOURCES,trustedUrl,plainText} from '../worker/api.mjs';
const now=new Date('2026-10-28T12:00:00Z');
test('Honda cards retain publication dates and only official launch URLs',()=>{
  const html=`<div><img src="https://cmssaladeimprensa.honda.com.br/bros.jpg"><div class="date">24/09/2026</div><a class="title" href="/releases/bros-2027">Honda Bros 2027: novas cores</a></div><div><div class="date">05/10/2026</div><a class="title" href="/releases/calendario">Honda apresenta novo calendário de experiências</a></div><div><div class="date">29/10/2026</div><a class="title" href="/releases/futuro">Honda CB 2027</a></div>`;
  const items=parseHonda(html,SOURCES[0],now);assert.equal(items.length,1);assert.equal(items[0].date,'2026-09-24');assert.equal(items[0].image,'https://cmssaladeimprensa.honda.com.br/bros.jpg');
});
test('BMW RSS excludes cars and events and parses CDATA safely',()=>{
  const xml=`<rss><item><title><![CDATA[Nova BMW R 1300 GS Adventure]]></title><link>https://www.press.bmwgroup.com/brazil/article/detail/T1</link><pubDate>Mon, 26 Oct 2026 10:00:00 +0000</pubDate></item><item><title>Novo BMW Série 3 2027</title><link>https://www.press.bmwgroup.com/brazil/article/detail/T2</link><pubDate>Mon, 26 Oct 2026 10:00:00 +0000</pubDate></item></rss>`;
  assert.equal(parseRss(xml,SOURCES[3],now).length,1);
});
test('WordPress strips markup and rejects untrusted links',()=>{
  const posts=[{title:{rendered:'Shineray anuncia <b>SBM 500T</b>'},link:'https://www.shineray.com.br/sbm-500t',date:'2026-08-26T15:07:28'},{title:{rendered:'Nova moto 2027'},link:'https://attacker.example/item',date:'2026-08-26'}];
  assert.equal(parseWordpress(posts,SOURCES[2],now).length,1);assert.equal(plainText('A &amp; B &#231;'),'A & B ç');assert.equal(trustedUrl('javascript:alert(1)',SOURCES[0].url,SOURCES[0].domains),null);assert.equal(trustedUrl(undefined,SOURCES[0].url,SOURCES[0].imageDomains),null);
});
test('actual Honda and Yamaha JSON schemas retain product news and skip unrelated announcements',()=>{
  const honda=parseHondaJson({rows:[{title:'Honda Bros 2027',segment_title:'Motocicletas',content_url:'/releases/bros',created_at:'24/09/2026\n',field_field_releases_embed:'/sites/default/files/bros.jpg'},{title:'Novo Civic 2027',segment_title:'Automóveis',content_url:'/releases/civic',created_at:'24/09/2026'}]},SOURCES[0],now);assert.equal(honda.length,1);assert.equal(honda[0].url,'https://saladeimprensa.honda.com.br/releases/bros');
  const yamaha=parseYamaha({result:{items:[{blogId:215,title:'NOVA YAMAHA R7 TEM PREÇO CONFIRMADO PARA O BRASIL',displayDateStart:'2026-10-08T00:00:00',enabled:true},{blogId:216,title:'Yamaha anuncia operação da Blustar em cinco cidades',displayDateStart:'2026-10-15T00:00:00'}]}},SOURCES[1],now);assert.equal(yamaha.length,1);assert.equal(yamaha[0].url,'https://www.yamaha-motor.com.br/noticia/215/nova-yamaha-r7-tem-preco-confirmado-para-o-brasil');
});
test('an unavailable source uses a clearly flagged snapshot and caches the result',async()=>{
  let calls=0;const service=createLaunchService({now:()=>now,sources:[SOURCES[0]],fetcher:async()=>{calls++;throw new Error('offline');},snapshot:{verifiedAt:'2026-10-28T10:00:00Z',items:[{title:'Honda Bros 2027',brand:'Honda',date:'2026-09-24',url:'https://saladeimprensa.honda.com.br/releasestest/bros'}]}});
  const request=new Request('https://site.example/api/launches');const first=await service.fetch(request,{},{});const result=await first.json();assert.equal(first.status,200);assert.equal(result.status,'fallback');assert.equal(result.sources[0].status,'fallback');await service.fetch(request,{},{});assert.equal(calls,1);
});
test('no records is a 503; unknown brands and writes are rejected without fetching',async()=>{
  let calls=0;const service=createLaunchService({now:()=>now,fetcher:async()=>{calls++;throw new Error('offline');}});
  assert.equal((await service.fetch(new Request('https://site.example/api/launches',{method:'POST'}))).status,405);
  assert.equal((await service.fetch(new Request('https://site.example/api/launches?brand=Invalid'))).status,400);assert.equal(calls,0);
  const response=await service.fetch(new Request('https://site.example/api/launches'));assert.equal(response.status,503);assert.equal((await response.json()).status,'fallback');
});
test('partial upstream failure keeps successful records and labels each source accurately',async()=>{
  const service=createLaunchService({now:()=>now,sources:[SOURCES[0],SOURCES[2]],fetcher:async url=>{if(url.includes('shineray'))throw new Error('offline');return new Response(JSON.stringify({rows:[{title:'Honda Bros 2027',segment_title:'Motocicletas',content_url:'/releases/bros',created_at:'24/09/2026'}]}),{headers:{'content-type':'application/json'}});},snapshot:{verifiedAt:'2026-10-28T10:00:00Z',items:[{title:'Shineray anuncia SBM 500T',brand:'Shineray',date:'2026-08-26',url:'https://www.shineray.com.br/sbm-500t'}]}});
  const response=await service.fetch(new Request('https://site.example/api/launches?brand=honda'));const payload=await response.json();assert.equal(payload.status,'partial');assert.equal(payload.items.length,1);assert.equal(payload.items[0].brand,'Honda');assert.deepEqual(payload.sources.map(s=>s.status),['live','fallback']);
  const head=await service.fetch(new Request('https://site.example/api/launches',{method:'HEAD'}));assert.equal(head.status,200);assert.equal(await head.text(),'');
});

test('Shineray can use its current official RSS when the WordPress API is unavailable',async()=>{
  const calls=[],source=SOURCES[2];
  const service=createLaunchService({now:()=>now,sources:[source],fetcher:async url=>{calls.push(url);if(url===source.url)return new Response('Unavailable',{status:403});return new Response('<rss><channel><item><title>Shineray apresenta nova SBM 500T</title><link>https://www.shineray.com.br/sbm-500t/</link><pubDate>Wed, 26 Aug 2026 12:00:00 +0000</pubDate></item></channel></rss>');}});
  const response=await service.fetch(new Request('https://site.example/api/launches'));const payload=await response.json();
  assert.equal(payload.status,'live');assert.equal(payload.sources[0].status,'live');assert.equal(payload.sources[0].endpoint,source.fallbackUrl);assert.equal(payload.items[0].brand,'Shineray');assert.deepEqual(calls,[source.url,source.fallbackUrl]);
});
