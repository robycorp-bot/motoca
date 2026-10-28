import * as THREE from './assets/three.module.js';

// A self-contained, procedural showroom and first-person riding scene.
export function initScene(container, callbacks = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b1014');
  scene.fog = new THREE.FogExp2('#0b1014', 0.015);
  const camera = new THREE.PerspectiveCamera(37, 1, 0.08, 420);
  scene.add(camera);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Moto esportiva tridimensional em uma estrada futurista');
  renderer.domElement.setAttribute('role', 'img');
  container.appendChild(renderer.domElement);

  const mats = {
    lime: new THREE.MeshPhysicalMaterial({color: '#ffd400', metalness: .32, roughness: .27, clearcoat: 1, clearcoatRoughness: .16}),
    limeDark: new THREE.MeshStandardMaterial({color: '#ad8500', metalness: .4, roughness: .3}),
    body: new THREE.MeshPhysicalMaterial({color: '#141a20', metalness: .66, roughness: .26, clearcoat: .8}),
    black: new THREE.MeshStandardMaterial({color: '#090d11', metalness: .22, roughness: .42}),
    tire: new THREE.MeshStandardMaterial({color: '#080a0c', roughness: .9, metalness: .01}),
    rubber: new THREE.MeshStandardMaterial({color: '#161b1e', roughness: .82}),
    metal: new THREE.MeshStandardMaterial({color: '#61717b', metalness: .94, roughness: .22}),
    darkMetal: new THREE.MeshStandardMaterial({color: '#29333b', metalness: .9, roughness: .32}),
    gold: new THREE.MeshStandardMaterial({color: '#b2a26f', metalness: .8, roughness: .24}),
    red: new THREE.MeshStandardMaterial({color: '#fe3a27', emissive: '#e52111', emissiveIntensity: 2, roughness: .3}),
    white: new THREE.MeshStandardMaterial({color: '#e7fbff', emissive: '#c7f8ff', emissiveIntensity: 3}),
    glow: new THREE.MeshBasicMaterial({color: '#ffd400'}),
    dimGlow: new THREE.MeshBasicMaterial({color: '#8f7525'}),
    glass: new THREE.MeshPhysicalMaterial({color: '#243c44', metalness: .3, roughness: .08, transparent: true, opacity: .75, side: THREE.DoubleSide}),
  };
  const colorMaterials = [mats.lime, mats.limeDark];
  const wheelGroups = [];
  const mesh = (geo, mat, parent, x=0,y=0,z=0) => {
    const obj = new THREE.Mesh(geo, mat);
    obj.position.set(x,y,z);
    obj.castShadow = true;
    obj.receiveShadow = true;
    parent.add(obj);
    return obj;
  };
  const box = (w,h,d,mat,parent,x=0,y=0,z=0) => mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z);
  const sphere = (w,h,d,mat,parent,x=0,y=0,z=0) => {
    const obj=mesh(new THREE.SphereGeometry(1,24,16),mat,parent,x,y,z);
    obj.scale.set(w,h,d); return obj;
  };
  const rod = (a,b,r,mat,parent,r2=r) => {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
    const delta = to.clone().sub(from);
    const obj=mesh(new THREE.CylinderGeometry(r2,r,delta.length(),10),mat,parent);
    obj.position.copy(from).add(to).multiplyScalar(.5);
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    return obj;
  };
  const tube = (points,r,mat,parent) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,r,8,false),mat,parent);
  const plate = (points,depth,mat,parent,z=0,bevel=.045) => {
    const shape=new THREE.Shape();
    points.forEach((p,i)=>i ? shape.lineTo(p[0],p[1]) : shape.moveTo(p[0],p[1]));
    shape.closePath();
    return mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled: bevel>0,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel}),mat,parent,0,0,z-depth/2);
  };

  // Lighting is deliberately sculptural: cool softbox, bright white rim, lime asphalt bounce.
  scene.add(new THREE.HemisphereLight('#c4e0ef','#39432a',.85));
  const key = new THREE.DirectionalLight('#effbff',2.8);
  key.position.set(-3,7,6); key.castShadow=true;
  key.shadow.mapSize.set(1024,1024); key.shadow.camera.left=-6; key.shadow.camera.right=6;
  key.shadow.camera.top=6; key.shadow.camera.bottom=-6; key.shadow.bias=-.0006;
  scene.add(key);
  const rim=new THREE.DirectionalLight('#b8dfec',2.3); rim.position.set(4,3,-5); scene.add(rim);
  const greenLight=new THREE.PointLight('#ffd400',12,12,2); greenLight.position.set(-2,.8,1.8); scene.add(greenLight);
  const softFill=new THREE.PointLight('#e8effb',20,15,2); softFill.position.set(3,3,4); scene.add(softFill);

  // Motorcycle: longitudinal X axis, separate rotating wheel assemblies.
  const bike = new THREE.Group(); scene.add(bike);
  const model=new THREE.Group(); bike.add(model);
  function wheel(x, radius, width, front) {
    const g = new THREE.Group(); g.position.set(x,radius+.03,0); model.add(g); wheelGroups.push(g);
    mesh(new THREE.TorusGeometry(radius-.115,.145,16,64),mats.tire,g).scale.z=width/.29;
    mesh(new THREE.TorusGeometry(radius-.115,.105,12,64),mats.rubber,g).scale.z=width/.21;
    mesh(new THREE.TorusGeometry(radius-.23,.043,10,64),mats.darkMetal,g);
    mesh(new THREE.TorusGeometry(radius-.205,.012,6,64),mats.limeDark,g);
    const hub=mesh(new THREE.CylinderGeometry(.11,.11,width+.1,20),mats.darkMetal,g); hub.rotation.x=Math.PI/2;
    for(let i=0;i<7;i++){
      const a=i*Math.PI*2/7;
      for(const s of [-1,1]) rod([Math.cos(a)*.09,Math.sin(a)*.09,s*width*.28],[Math.cos(a+.23)*(radius-.23),Math.sin(a+.23)*(radius-.23),s*width*.35],.026,mats.metal,g);
    }
    const sides=front?[-1,1]:[1];
    for(const s of sides){
      const z=s*(width*.5+.025);
      const disc=mesh(new THREE.CylinderGeometry(radius*.62,radius*.62,.016,48),mats.metal,g,0,0,z); disc.rotation.x=Math.PI/2;
      const center=mesh(new THREE.CylinderGeometry(radius*.29,radius*.29,.022,20),mats.darkMetal,g,0,0,z+s*.015); center.rotation.x=Math.PI/2;
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;
        const hole=mesh(new THREE.CircleGeometry(.018,6),mats.black,g,Math.cos(a)*radius*.48,Math.sin(a)*radius*.48,z+s*.014); if(s<0)hole.rotation.y=Math.PI;
      }
      box(.15,.26,.1,mats.gold,model,x+.19,radius+.03+.12,z+s*.06).rotation.z=-.3;
    }
    // Fine rubber grooves along the visible sidewalls.
    for(const s of [-1,1]) mesh(new THREE.TorusGeometry(radius-.08,.005,4,64),mats.darkMetal,g,0,0,s*width*.49);
    return g;
  }
  const rear=wheel(-1.2,.64,.34,false),front=wheel(1.35,.62,.25,true);
  // Rear single-sided swingarm, chain and sprocket.
  rod([-.35,.92,.3],[-1.2,.67,.3],.095,mats.darkMetal,model);
  rod([-.3,.78,-.27],[-1.2,.67,-.27],.075,mats.darkMetal,model);
  const sprocket=mesh(new THREE.CylinderGeometry(.24,.24,.028,32),mats.darkMetal,model,-1.2,.67,-.24); sprocket.rotation.x=Math.PI/2;
  tube([[-1.2,.92,-.28],[-.39,.91,-.28],[-.27,.79,-.28],[-1.2,.43,-.28]],.018,mats.metal,model);
  rod([-.68,1.14,0],[-.35,.77,0],.075,mats.gold,model);
  // Spring has actual helical geometry.
  const coil=[]; for(let i=0;i<=100;i++){const q=i/100;coil.push([-.68+q*.33+Math.cos(q*Math.PI*16)*.09,1.14-q*.37,Math.sin(q*Math.PI*16)*.09]);}
  tube(coil,.016,mats.limeDark,model);
  // Trellis frame and engine.
  for(const s of [-1,1]){
    rod([-.7,1.14,s*.25],[.39,1.49,s*.22],.045,mats.darkMetal,model);
    rod([-.7,1.14,s*.25],[-.23,.7,s*.27],.044,mats.darkMetal,model);
    rod([-.23,.7,s*.27],[.39,1.49,s*.22],.035,mats.darkMetal,model);
    rod([-.64,1.15,s*.27],[.1,1.12,s*.29],.035,mats.darkMetal,model);
    rod([-.85,1.34,s*.2],[-1.45,1.65,s*.17],.028,mats.metal,model);
  }
  sphere(.52,.43,.3,mats.darkMetal,model,-.15,.92,0);
  for(let i=0;i<8;i++) box(.65,.025,.62,mats.metal,model,-.02,.85+i*.047,0);
  for(const s of [-1,1]){
    const e=mesh(new THREE.CylinderGeometry(.245,.245,.1,32),mats.body,model,-.25,.83,s*.33);e.rotation.x=Math.PI/2;
    const c=mesh(new THREE.CylinderGeometry(.08,.08,.11,20),mats.metal,model,-.25,.83,s*.35);c.rotation.x=Math.PI/2;
    for(let i=0;i<6;i++){const a=i*Math.PI/3;sphere(.017,.017,.018,mats.metal,model,-.25+Math.cos(a)*.2,.83+Math.sin(a)*.2,s*.39);}
  }
  tube([[.25,1,.18],[.55,.66,.22],[.39,.36,.21],[-.38,.35,.2],[-.9,.55,.22]],.045,mats.gold,model);
  tube([[.3,1,-.13],[.6,.66,-.16],[.46,.4,-.12],[-.4,.4,-.12]],.045,mats.gold,model);
  const muffler=rod([-.65,.46,.4],[-1.35,.88,.43],.13,mats.body,model,.095);
  rod([-1.35,.88,.43],[-1.43,.93,.44],.08,mats.metal,model);
  // Sculpted fuel tank, deep seat and elevated tail.
  const tank=plate([[-.68,1.4],[-.58,1.7],[-.24,1.87],[.25,1.82],[.59,1.52],[.36,1.32],[-.22,1.29]],.61,mats.lime,model,0,.1);
  sphere(.29,.095,.33,mats.lime,model,-.07,1.79,0);
  const cap=mesh(new THREE.CylinderGeometry(.1,.1,.014,24),mats.darkMetal,model,-.1,1.89,0);cap.rotation.z=.08;
  plate([[-1.4,1.54],[-1.1,1.64],[-.6,1.45],[-.42,1.4],[-.51,1.31],[-1.14,1.39]],.49,mats.black,model,0,.065);
  plate([[-1.74,1.73],[-1.34,1.8],[-.97,1.62],[-.78,1.47],[-1.27,1.5],[-1.65,1.57]],.44,mats.lime,model,0,.04);
  plate([[-1.7,1.62],[-1.39,1.65],[-1.26,1.56],[-1.64,1.54]],.4,mats.body,model,0,.012);
  box(.07,.035,.31,mats.red,model,-1.72,1.64,0).rotation.z=-.2;
  // Layered sport fairings, winglets, intake, real front fork.
  for(const s of [-1,1]){
    rod([.91,1.63,s*.17],[1.35,.65,s*.17],.044,mats.gold,model);
    rod([1.12,1.15,s*.17],[1.35,.65,s*.17],.065,mats.metal,model);
    plate([[.13,1.4],[.61,1.72],[1.31,1.71],[1.67,1.38],[1.2,1.22],[.9,.68],[.12,.48],[-.2,.63]],.11,mats.lime,model,s*.34,.035);
    plate([[.26,1.19],[.69,1.52],[1.19,1.52],[.96,1.25],[.58,.98],[.13,.65]],.025,mats.body,model,s*.416,.012);
    plate([[-.2,.64],[.25,.59],[.87,.76],[.68,.47],[.06,.37],[-.38,.48]],.08,mats.body,model,s*.31,.018);
    plate([[.82,1.64],[1.3,1.72],[1.64,1.4],[1.4,1.41],[1.17,1.55]],.15,mats.lime,model,s*.23,.025);
    plate([[1.01,1.37],[1.45,1.43],[1.62,1.35],[1.31,1.3]],.03,mats.white,model,s*.3,.005);
    // Black gills and lime blade below side intake.
    for(let i=0;i<3;i++) box(.23,.025,.023,mats.black,model,.52+i*.12,1.09+i*.07,s*.478).rotation.z=.53;
    plate([[.42,1.18],[.91,1.33],[.81,1.21],[.4,1.11]],.015,mats.limeDark,model,s*.49,.005);
    const wing=plate([[1.1,1.18],[1.47,1.22],[1.2,1.11],[.93,1.09]],.31,mats.body,model,s*.5,.008);wing.rotation.x=s*.1;
    rod([.8,1.76,s*.18],[.63,1.92,s*.53],.018,mats.darkMetal,model);
    sphere(.11,.055,.06,mats.body,model,.61,1.94,s*.56);
    // Foot pegs and small bright machined fasteners.
    rod([-.62,.84,s*.29],[-.62,.84,s*.48],.025,mats.metal,model);
    box(.18,.035,.06,mats.rubber,model,-.64,.84,s*.48);
    for(const p of [[.22,1.4],[1.23,1.59],[.38,.64],[-1.32,1.66]]) sphere(.017,.017,.014,mats.metal,model,p[0],p[1],s*.42);
  }
  // Curved windscreen, handlebar, front fender and logo strokes.
  const windshield=plate([[.64,1.75],[.63,2.03],[.87,2.08],[1.18,1.81]],.35,mats.glass,model,0,.025);
  rod([.68,1.73,-.37],[.68,1.73,.37],.025,mats.darkMetal,model);
  for(const s of [-1,1])rod([.68,1.73,s*.29],[.53,1.75,s*.48],.038,mats.rubber,model);
  const fender=mesh(new THREE.TorusGeometry(.67,.055,8,32,Math.PI*.7),mats.lime,model,1.35,.65,0);fender.rotation.z=Math.PI*.15; fender.scale.z=2.9;
  for(const s of [-1,1]){
    const decal=box(.29,.019,.007,mats.black,model,.05,1.61,s*.412);decal.rotation.z=.42;
    const decal2=box(.21,.019,.007,mats.black,model,-.06,1.57,s*.414);decal2.rotation.z=.42;
  }

  // Only silhouette-sized parts cast shadows; tiny fasteners and spokes stay
  // in the beauty pass, keeping the full scene below 300 draw calls.
  model.traverse(obj=>{
    if(!obj.isMesh)return;
    obj.geometry.computeBoundingSphere();
    const radius=obj.geometry.boundingSphere.radius*Math.max(obj.scale.x,obj.scale.y,obj.scale.z);
    obj.castShadow=radius>.33;
  });

  // Asphalt and a long illuminated road to the horizon.
  const world = new THREE.Group(); scene.add(world);
  const groundMat=new THREE.MeshStandardMaterial({color:'#11181b',roughness:.96,metalness:.1});
  const ground=mesh(new THREE.PlaneGeometry(600,600),groundMat,world,0,-.04,-130);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  const road=mesh(new THREE.PlaneGeometry(10,460),new THREE.MeshStandardMaterial({color:'#171e20',roughness:.84,metalness:.25}),world,0,-.015,-190);road.rotation.x=-Math.PI/2;road.castShadow=false;
  const roadSide=new THREE.MeshBasicMaterial({color:'#8d7838'});
  for(const s of [-1,1]){
    const rail=box(.022,.013,450,mats.dimGlow,world,s*4.9,.004,-190);rail.castShadow=false;
    const shoulder=box(.14,.01,450,roadSide,world,s*5.2,-.002,-190);shoulder.castShadow=false;
  }
  const stripeGeo=new THREE.BoxGeometry(.055,.008,2.4);
  const stripes=new THREE.InstancedMesh(stripeGeo,new THREE.MeshBasicMaterial({color:'#b4bfac'}),80);
  world.add(stripes);stripes.castShadow=false;
  const dummy=new THREE.Object3D();
  const roadside=new THREE.Group();world.add(roadside);
  // Instanced environmental details keep the animated route inexpensive.
  const lampPosts=new THREE.InstancedMesh(new THREE.BoxGeometry(.065,2.7,.065),mats.darkMetal,32);
  const lampLights=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.34,.08),mats.glow,32);
  const lampCaps=new THREE.InstancedMesh(new THREE.BoxGeometry(.3,.045,.12),mats.darkMetal,32);
  roadside.add(lampPosts,lampLights,lampCaps);
  function updateLamps(travel){
    for(let i=0;i<32;i++){
      const side=i%2?-1:1,z=12-Math.floor(i/2)*15+travel;
      dummy.position.set(side*5.65,1.35,z);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();lampPosts.setMatrixAt(i,dummy.matrix);
      dummy.position.y=2.2;dummy.updateMatrix();lampLights.setMatrixAt(i,dummy.matrix);
      dummy.position.set(side*5.65-side*.1,2.72,z);dummy.updateMatrix();lampCaps.setMatrixAt(i,dummy.matrix);
    }
    lampPosts.instanceMatrix.needsUpdate=true;lampLights.instanceMatrix.needsUpdate=true;lampCaps.instanceMatrix.needsUpdate=true;
  }
  updateLamps(0);
  const portalMat=new THREE.MeshStandardMaterial({color:'#202b2e',metalness:.65,roughness:.45});
  const portalFrame=new THREE.InstancedMesh(new THREE.CylinderGeometry(.15,.15,1,8),portalMat,25);
  const portalEdge=new THREE.InstancedMesh(new THREE.CylinderGeometry(.025,.025,1,6),mats.glow,25);
  world.add(portalFrame,portalEdge);
  function instanceRod(inst,index,a,b){
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);
    dummy.position.copy(from).add(to).multiplyScalar(.5);dummy.scale.set(1,delta.length(),1);
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());dummy.updateMatrix();inst.setMatrixAt(index,dummy.matrix);
  }
  function updatePortals(travel){
    let j=0;
    for(let i=0;i<5;i++){
      const z=-27-i*47+travel;
      for(const side of [-1,1]){
        instanceRod(portalFrame,j,[side*6,0,z],[side*6,5.8,z]);
        instanceRod(portalEdge,j++,[side*5.84,.3,z+.13],[side*5.84,5.7,z+.13]);
        instanceRod(portalFrame,j,[side*6,5.8,z],[side*3.4,8.4,z]);
        instanceRod(portalEdge,j++,[side*5.84,5.7,z+.13],[side*3.3,8.25,z+.13]);
      }
      instanceRod(portalFrame,j,[-3.4,8.4,z],[3.4,8.4,z]);
      instanceRod(portalEdge,j++,[-3.3,8.25,z+.13],[3.3,8.25,z+.13]);
    }
    portalFrame.instanceMatrix.needsUpdate=true;portalEdge.instanceMatrix.needsUpdate=true;
  }
  updatePortals(0);
  // Geometric cliffs keep the world visibly three dimensional without costly assets.
  const mountains=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,4,1),new THREE.MeshStandardMaterial({color:'#1c2a30',roughness:1,flatShading:true}),64);
  let seed=19;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  for(let i=0;i<64;i++){
    const side=i%2?-1:1;const h=4+random()*17;
    dummy.position.set(side*(11+random()*40),h*.5-1,-12-random()*220);
    dummy.scale.set(5+random()*12,h,5+random()*15);
    dummy.rotation.set(0,random()*Math.PI,0);dummy.updateMatrix();mountains.setMatrixAt(i,dummy.matrix);
  }world.add(mountains);
  const moon=mesh(new THREE.SphereGeometry(8,32,20),new THREE.MeshBasicMaterial({color:'#c7ac79',transparent:true,opacity:.18}),world,17,19,-150);moon.castShadow=false;
  const starsGeo=new THREE.BufferGeometry();const starsPos=[];
  for(let i=0;i<300;i++)starsPos.push((random()-.5)*240,8+random()*70,-20-random()*250);
  starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starsPos,3));
  const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:'#b1d0cd',size:.055,transparent:true,opacity:.5,sizeAttenuation:true}));world.add(stars);
  // An understated ground ring gives the featured bike a precise showroom footing.
  const pad=new THREE.Group();scene.add(pad);
  const ring=mesh(new THREE.TorusGeometry(2.65,.012,6,100),mats.dimGlow,pad,0,.012,0);ring.rotation.x=Math.PI/2;
  const platform=mesh(new THREE.CylinderGeometry(2.7,2.7,.015,100),new THREE.MeshStandardMaterial({color:'#121a1c',roughness:.62,metalness:.35}),pad,0,-.01,0);platform.receiveShadow=true;platform.castShadow=false;
  const ring2=mesh(new THREE.TorusGeometry(2.77,.004,4,100),mats.dimGlow,pad,0,.009,0);ring2.rotation.x=Math.PI/2;

  // First-person cockpit, attached to the camera and revealed in ride mode.
  const cockpit=new THREE.Group();camera.add(cockpit);cockpit.position.set(0,-.73,-1.4);cockpit.visible=false;
  const cockpitMat=new THREE.MeshStandardMaterial({color:'#10171c',metalness:.65,roughness:.3});
  tube([[-.92,-.03,.25],[-.62,.08,.16],[-.35,.02,.06],[0,.02,0],[.35,.02,.06],[.62,.08,.16],[.92,-.03,.25]],.034,mats.metal,cockpit);
  for(const s of [-1,1]){
    rod([s*.6,.075,.17],[s*.88,-.02,.25],.055,mats.rubber,cockpit);
    rod([s*.55,.04,.15],[s*.8,.07,.16],.016,mats.metal,cockpit);
    box(.1,.1,.1,cockpitMat,cockpit,s*.54,.055,.16);
    rod([s*.47,.055,.1],[s*.67,.38,-.04],.014,mats.darkMetal,cockpit);
    sphere(.15,.075,.045,mats.glass,cockpit,s*.7,.4,-.04);
  }
  sphere(.38,.4,.56,mats.lime,cockpit,0,-.35,.38);
  const screenCanvas=document.createElement('canvas');screenCanvas.width=512;screenCanvas.height=256;
  const screenCtx=screenCanvas.getContext('2d');const screenTexture=new THREE.CanvasTexture(screenCanvas);
  const display=box(.6,.31,.055,cockpitMat,cockpit,0,.12,-.02);display.rotation.x=-.2;
  const screen=mesh(new THREE.PlaneGeometry(.55,.266),new THREE.MeshBasicMaterial({map:screenTexture}),cockpit,0,.122,.011);screen.rotation.x=-.2;
  function drawDashboard(speed){
    screenCtx.fillStyle='#0b1417';screenCtx.fillRect(0,0,512,256);
    screenCtx.fillStyle='#ffd400';screenCtx.fillRect(20,18,472,4);
    screenCtx.font='bold 100px Arial';screenCtx.textAlign='center';screenCtx.fillText(String(Math.round(speed)).padStart(3,'0'),256,142);
    screenCtx.font='20px Arial';screenCtx.fillStyle='#a7b4b7';screenCtx.fillText('KM/H    •    VELOCITY',256,181);
    screenCtx.fillStyle='#ffd400';screenCtx.fillRect(40,213,Math.min(432,speed/190*432),8);
    screenTexture.needsUpdate=true;
  }drawDashboard(0);

  let progress=0,journey=0,ride=false,boost=false,reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pointerX=0,pointerY=0,blend=0,currentSpeed=0,scrollProgress=0,worldTime=0,raf=0,disposed=false;
  let width=1,height=1,mobile=false,lastTime=performance.now(),lastDashboard=0;
  const keys=new Set();
  const keyDown=e=>{if(!ride||/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)){e.preventDefault();keys.add(e.key);}};
  const keyUp=e=>keys.delete(e.key);
  const clearKeys=()=>{keys.clear();boost=false;};
  window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);
  window.addEventListener('blur',clearKeys);
  const cameraPos=new THREE.Vector3(),lookPos=new THREE.Vector3();
  function resize(){
    width=Math.max(1,container.clientWidth);height=Math.max(1,container.clientHeight);mobile=width<760;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
  }
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  let initial=true;
  function animate(now){
    if(disposed)return;
    raf=requestAnimationFrame(animate);
    const dt=Math.min((now-lastTime)/1000,.04);lastTime=now;
    const motion=reduced?0:1;
    blend=THREE.MathUtils.damp(blend,ride?1:journey,4,dt);
    scrollProgress=THREE.MathUtils.damp(scrollProgress,progress,3,dt);
    const accelerating=boost||keys.has('ArrowUp')||keys.has(' ');
    currentSpeed=THREE.MathUtils.damp(currentSpeed,ride?(accelerating?168:78):0,2,dt);
    worldTime+=dt*motion*(ride?(accelerating?31:14):.85+journey*9);
    const steer=THREE.MathUtils.clamp(pointerX*.6+(keys.has('ArrowRight')?.8:0)-(keys.has('ArrowLeft')?.8:0),-1,1);
    const heroAngle=.18+Math.sin(now*.00017)*.09*motion+scrollProgress*.75;
    bike.rotation.y=heroAngle+pointerX*.12*(1-blend);
    bike.rotation.z=Math.sin(now*.0012)*.006*motion;
    bike.position.y=Math.sin(now*.0015)*.012*motion;
    bike.visible=blend<.72;pad.visible=blend<.72;
    for(const w of wheelGroups)w.rotation.z=-worldTime*.8;
    const heroCamera=mobile?new THREE.Vector3(7,3.4,11.2):new THREE.Vector3(4.9,2.7,7.1);
    heroCamera.x+=pointerX*.14;heroCamera.y+=pointerY*.08;
    heroCamera.applyAxisAngle(new THREE.Vector3(0,1,0),scrollProgress*.16);
    cameraPos.copy(heroCamera).lerp(new THREE.Vector3(steer*.8,1.49+Math.sin(now*.007)*.008*motion,4),blend);
    camera.position.copy(cameraPos);
    lookPos.set(0,1.02,0).lerp(new THREE.Vector3(steer*3,1.45,-35),blend);
    camera.lookAt(lookPos);camera.rotation.z+=-steer*.035*blend;
    if(!mobile){camera.setViewOffset(width,height,-width*.205*(1-blend),0,width,height);}else{
      const desiredCenterY = Math.min(610, height*.635);
      camera.setViewOffset(width,height,0,(height*.5-desiredCenterY)*(1-blend),width,height);
    }
    camera.fov=37+blend*(accelerating?14:5);camera.updateProjectionMatrix();
    cockpit.visible=blend>.58;cockpit.position.y=-.73+(1-blend)*.4;cockpit.rotation.z=-steer*.035;
    const roadTravel=worldTime%6.5;
    for(let i=0;i<80;i++){
      dummy.position.set(i%2===0?-1.65:1.65,.002,12-Math.floor(i/2)*6.5+roadTravel);
      dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();stripes.setMatrixAt(i,dummy.matrix);
    }stripes.instanceMatrix.needsUpdate=true;
    updateLamps(worldTime%15);
    updatePortals(worldTime%47);
    if(now-lastDashboard>150&&ride){drawDashboard(currentSpeed);callbacks.onSpeed?.(Math.round(currentSpeed));lastDashboard=now;}
    renderer.render(scene,camera);
    if(initial){initial=false;callbacks.onReady?.();}
  }
  animate(performance.now());
  return {
    setProgress(value){progress=Math.max(0,Math.min(1,Number(value)||0));},
    setJourney(value){journey=Math.max(0,Math.min(.98,Number(value)||0));},
    setRide(value){ride=!!value;keys.clear();if(!ride)boost=false;},
    setBoost(value){boost=!!value;},
    setPointer(x,y){pointerX=Math.max(-1,Math.min(1,x||0));pointerY=Math.max(-1,Math.min(1,y||0));},
    setColor(hex){mats.lime.color.set(hex);mats.limeDark.color.set(hex).multiplyScalar(.55);},
    setReducedMotion(value){reduced=!!value;},
    getSnapshot(){return {ride,boost,speed:Math.round(currentSpeed),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};},
    destroy(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',clearKeys);scene.traverse(obj=>{obj.geometry?.dispose();if(obj.material){for(const material of(Array.isArray(obj.material)?obj.material:[obj.material]))material.dispose();}});screenTexture.dispose();renderer.dispose();renderer.domElement.remove();}
  };
}
