import * as THREE from "three";

const $ = (id) => document.getElementById(id);
const furniture = [
  {id:"chair",name:"Accent chair",type:"seating",emoji:"🪑",description:"A comfortable statement chair",color:0x4777b9},
  {id:"sofa",name:"Modern sofa",type:"seating",emoji:"🛋️",description:"A spacious living-room sofa",color:0x557da9},
  {id:"table",name:"Coffee table",type:"tables",emoji:"▱",description:"Minimal wooden coffee table",color:0x9b7049},
  {id:"dining",name:"Dining table",type:"tables",emoji:"🍽️",description:"A table for everyday dining",color:0x9b7049},
  {id:"plant",name:"Indoor plant",type:"decor",emoji:"🪴",description:"Bring a little green indoors",color:0x43845a},
  {id:"lamp",name:"Floor lamp",type:"decor",emoji:"💡",description:"Warm ambient lighting",color:0xd9b45e}
];
let selectedFurniture = null;
let placed = [];
let selectedObject = null;
let stream = null;
let facingMode = "environment";
let activeFilter = "all";
let arActive = false;
let threeState = null;

function toast(message){const t=$("toast");t.textContent=message;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),2600)}
function setStatus(text){$("statusText").textContent=text}
function renderCatalog(){
  const grid=$("furnitureGrid");grid.innerHTML="";
  furniture.filter(x=>activeFilter==="all"||x.type===activeFilter).forEach(item=>{
    const card=document.createElement("button");card.className="furniture-card"+(selectedFurniture?.id===item.id?" selected":"");
    card.innerHTML=`<div class="furniture-visual">${item.emoji}</div><b>${item.name}</b><small>${item.description}</small>`;
    card.addEventListener("click",()=>selectFurniture(item));grid.appendChild(card);
  });
}
function selectFurniture(item){
  selectedFurniture=item;$("selectedPreview").textContent=item.emoji;$("selectedName").textContent=item.name;$("selectedDescription").textContent=item.description;$("addFurnitureBtn").disabled=false;renderCatalog();
}
function updateCount(){$("objectCount").textContent=`${placed.length} object${placed.length===1?"":"s"} placed`}
function addFurniture(){
  if(!selectedFurniture)return;
  const item={...selectedFurniture,uid:crypto.randomUUID?.()||String(Date.now()+Math.random()),x:50+(Math.random()*12-6),y:58+(Math.random()*10-5),scale:1,rotation:0,depth:placed.length};
  placed.push(item);renderFallbackObjects();selectObject(item.uid);updateCount();toast(`${item.name} added to your room`);
}
function renderFallbackObjects(){
  const layer=$("fallbackObjects");layer.innerHTML="";
  placed.forEach(item=>{
    const el=document.createElement("div");el.className="placed-item"+(selectedObject?.uid===item.uid?" active":"");el.dataset.uid=item.uid;
    const visual=document.createElement("span");visual.className="emoji";visual.textContent=item.emoji;el.appendChild(visual);
    el.style.left=item.x+"%";el.style.top=item.y+"%";el.style.zIndex=String(10+item.depth);el.style.transform=`translate(-50%,-50%) scale(${item.scale}) rotate(${item.rotation}deg)`;
    el.addEventListener("pointerdown",startDrag);el.addEventListener("click",e=>{e.stopPropagation();selectObject(item.uid)});
    layer.appendChild(el);
  });
}
let dragState=null;
function startDrag(e){
  if(arActive)return;e.preventDefault();e.stopPropagation();
  const uid=e.currentTarget.dataset.uid;selectObject(uid);
  const rect=$("stage").getBoundingClientRect();const item=placed.find(o=>o.uid===uid);
  dragState={uid,startX:e.clientX,startY:e.clientY,origX:item.x,origY:item.y,rect};
  e.currentTarget.setPointerCapture(e.pointerId);
}
document.addEventListener("pointermove",e=>{
  if(!dragState)return;const item=placed.find(o=>o.uid===dragState.uid);if(!item)return;
  item.x=Math.max(5,Math.min(95,dragState.origX+(e.clientX-dragState.startX)/dragState.rect.width*100));
  item.y=Math.max(10,Math.min(92,dragState.origY+(e.clientY-dragState.startY)/dragState.rect.height*100));
  const el=document.querySelector(`[data-uid="${dragState.uid}"]`);if(el){el.style.left=item.x+"%";el.style.top=item.y+"%";}
});
document.addEventListener("pointerup",()=>dragState=null);
$("stage").addEventListener("click",e=>{if(e.target===$("stage")||e.target===$("fallbackObjects")||e.target===$("cameraVideo")){if(selectedObject){selectedObject=null;renderFallbackObjects();showControls()}}});
function selectObject(uid){selectedObject=placed.find(x=>x.uid===uid)||null;renderFallbackObjects();showControls();document.querySelector('[data-tab="settings"]').click()}
function showControls(){
  const has=!!selectedObject;$("emptySelection").classList.toggle("hidden",has);$("objectControls").classList.toggle("hidden",!has);
  if(!has)return;$("controlObjectName").textContent=selectedObject.name;$("sizeSlider").value=Math.round(selectedObject.scale*100);$("sizeValue").textContent=Math.round(selectedObject.scale*100)+"%";$("rotationSlider").value=selectedObject.rotation;$("rotationValue").textContent=selectedObject.rotation+"°";
}
function updateSelected(){
  if(!selectedObject)return;selectedObject.scale=Number($("sizeSlider").value)/100;selectedObject.rotation=Number($("rotationSlider").value);$("sizeValue").textContent=$("sizeSlider").value+"%";$("rotationValue").textContent=$("rotationSlider").value+"°";renderFallbackObjects();
}
function removeSelected(){if(!selectedObject)return;placed=placed.filter(x=>x.uid!==selectedObject.uid);selectedObject=null;renderFallbackObjects();showControls();updateCount();toast("Furniture removed")}
function clearAll(){placed=[];selectedObject=null;renderFallbackObjects();showControls();updateCount();toast("Room cleared")}
async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){showCameraError("Camera access is not available in this browser. Try a recent version of Chrome or Edge.");return}
  try{
    if(stream)stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facingMode},width:{ideal:1920},height:{ideal:1080}},audio:false});
    $("cameraVideo").srcObject=stream;$("cameraVideo").style.display="block";$("placeholder").style.display="none";$("cameraError").style.display="none";
    setStatus("Camera connected");$("viewModeLabel").textContent="LIVE CAMERA PREVIEW";$("stageTip").textContent="Drag furniture to position it. Select an item to adjust.";
    toast("Camera started — choose furniture to begin");
  }catch(err){showCameraError(err.name==="NotAllowedError"?"Camera permission was denied. Allow camera access in your browser settings and try again.":"Unable to start camera. Check that your camera is not being used by another app.");}
}
function showCameraError(message){$("cameraError").textContent=message;$("cameraError").style.display="block";toast("Camera could not start")}
function switchCamera(){facingMode=facingMode==="environment"?"user":"environment";if(stream)startCamera();else toast("Camera will use the "+(facingMode==="user"?"front":"rear")+" camera")}
function snapshot(){
  const stage=$("stage"),canvas=document.createElement("canvas");canvas.width=stage.clientWidth*2;canvas.height=stage.clientHeight*2;const ctx=canvas.getContext("2d");
  ctx.fillStyle="#e9edf0";ctx.fillRect(0,0,canvas.width,canvas.height);
  if($("cameraVideo").readyState>=2){ctx.save();if(facingMode==="user"){ctx.translate(canvas.width,0);ctx.scale(-1,1)}ctx.drawImage($("cameraVideo"),0,0,canvas.width,canvas.height);ctx.restore();}
  else{ctx.fillStyle="#dce5e9";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#9aafbd";ctx.font="bold 48px sans-serif";ctx.fillText("RoomVista — Room Preview",50,90);}
  placed.forEach(o=>{ctx.save();ctx.translate(o.x/100*canvas.width,o.y/100*canvas.height);ctx.rotate(o.rotation*Math.PI/180);ctx.scale(o.scale,o.scale);ctx.font="100px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.shadowColor="#0005";ctx.shadowBlur=14;ctx.fillText(o.emoji,0,0);ctx.restore()});
  const a=document.createElement("a");a.download="roomvista-design.png";a.href=canvas.toDataURL("image/png");a.click();toast("Room snapshot downloaded");
}
function tabs(){document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));tab.classList.add("active");const settings=tab.dataset.tab==="settings";$("catalogTab").classList.toggle("hidden",settings);$("settingsTab").classList.toggle("hidden",!settings)}))}
document.querySelectorAll(".category").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".category").forEach(b=>b.classList.remove("active"));btn.classList.add("active");activeFilter=btn.dataset.filter;renderCatalog()}));
$("startCameraBtn").addEventListener("click",startCamera);$("switchCameraBtn").addEventListener("click",switchCamera);$("addFurnitureBtn").addEventListener("click",addFurniture);
$("sizeSlider").addEventListener("input",updateSelected);$("rotationSlider").addEventListener("input",updateSelected);$("removeBtn").addEventListener("click",removeSelected);
$("clearBtn").addEventListener("click",clearAll);$("resetBtn").addEventListener("click",()=>{clearAll();toast("Room preview reset")});
$("captureBtn").addEventListener("click",snapshot);$("downloadBtn").addEventListener("click",snapshot);
$("sendBackBtn").addEventListener("click",()=>{if(selectedObject){selectedObject.depth=Math.max(0,selectedObject.depth-1);renderFallbackObjects()}});
$("bringFrontBtn").addEventListener("click",()=>{if(selectedObject){selectedObject.depth=placed.length+1;renderFallbackObjects()}});
$("helpBtn").addEventListener("click",()=>$("helpModal").classList.remove("hidden"));$("closeHelp").addEventListener("click",()=>$("helpModal").classList.add("hidden"));$("gotItBtn").addEventListener("click",()=>$("helpModal").classList.add("hidden"));
$("helpModal").addEventListener("click",e=>{if(e.target===$("helpModal"))$("helpModal").classList.add("hidden")});
tabs();renderCatalog();showControls();

/* Three.js WebXR: real floor placement using the device's AR hit-test feature.
   Requires HTTPS, a compatible Android device/browser and ARCore services. */
function buildFurniture3D(kind){
  const group=new THREE.Group();const mat=(color,rough=.75)=>new THREE.MeshStandardMaterial({color,roughness:rough});
  const wood=mat(0x9b7049),fabric=mat(kind==="sofa"?0x557da9:0x4777b9),dark=mat(0x353b42),leaf=mat(0x43845a),white=mat(0xe7e3dc);
  const box=(w,h,d,m,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);group.add(mesh);return mesh};
  const cylinder=(rt,rb,h,m,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,16),m);mesh.position.set(x,y,z);group.add(mesh);return mesh};
  if(kind==="chair"){
    box(.72,.16,.68,fabric,0,.52,0);box(.72,.72,.14,fabric,0,.94,-.27);
    [-.27,.27].forEach(x=>[-.24,.24].forEach(z=>cylinder(.035,.045,.48,dark,x,.24,z)));
    box(.12,.18,.68,fabric,-.34,.65,0);box(.12,.18,.68,fabric,.34,.65,0);
  }else if(kind==="sofa"){
    box(1.65,.25,.72,fabric,0,.42,0);box(1.65,.72,.2,fabric,0,.82,-.27);
    box(.22,.56,.75,fabric,-.72,.68,0);box(.22,.56,.75,fabric,.72,.68,0);
    [-.62,.62].forEach(x=>[-.24,.24].forEach(z=>cylinder(.035,.045,.3,dark,x,.15,z)));
  }else if(kind==="table"||kind==="dining"){
    const w=kind==="table"?1.1:1.5,d=kind==="table"?.72:.9;
    box(w,.1,d,wood,0,.72,0);[-1,1].forEach(x=>[-1,1].forEach(z=>box(.07,.7,.07,dark,x*w*.42,.35,z*d*.42)));
  }else if(kind==="plant"){
    cylinder(.23,.18,.38,mat(0xb46f48),0,.2,0);cylinder(.06,.07,.75,wood,0,.72,0);
    for(let i=0;i<7;i++){const leafMesh=new THREE.Mesh(new THREE.SphereGeometry(.19,12,10),leaf);leafMesh.scale.set(.55,1.5,.5);leafMesh.position.set(Math.cos(i)*.22,1.1+(i%3)*.12,Math.sin(i)*.22);group.add(leafMesh)}
  }else{
    cylinder(.035,.035,1.35,dark,0,.68,0);cylinder(.3,.08,.25,white,0,1.42,0);cylinder(.22,.22,.05,wood,0,.04,0);
  }
  group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return group;
}
async function launchAR(){
  if(!navigator.xr){toast("WebXR is not available here. Use the live camera preview instead.");return}
  try{
    const supported=await navigator.xr.isSessionSupported("immersive-ar");
    if(!supported){toast("This device does not support immersive AR. Try a compatible Android phone.");return}
    if(!threeState)await initThree();
    const session=await navigator.xr.requestSession("immersive-ar",{requiredFeatures:["hit-test"],optionalFeatures:["dom-overlay","local-floor"],domOverlay:{root:document.body}});
    await threeState.renderer.xr.setSession(session);arActive=true;
    $("fallbackObjects").style.display="none";$("placeholder").style.display="none";$("cameraVideo").style.display="none";$("threeHost").style.pointerEvents="auto";
    $("viewModeLabel").textContent="TRUE 3D AR";$("stageTip").textContent="Tap the floor to place selected furniture.";setStatus("AR session active");toast("Move your phone slowly to detect the floor");
    session.addEventListener("select",()=>{
      if(!selectedFurniture){toast("Choose a furniture item first");return}
      if(!threeState.reticle.visible){toast("Point at a floor or flat surface first");return}
      const model=buildFurniture3D(selectedFurniture.id);model.position.setFromMatrixPosition(threeState.reticle.matrix);model.quaternion.setFromRotationMatrix(threeState.reticle.matrix);model.scale.setScalar(.75);threeState.scene.add(model);threeState.models.push(model);toast(selectedFurniture.name+" placed in AR");
    });
    session.addEventListener("end",()=>{arActive=false;$("fallbackObjects").style.display="";$("threeHost").style.pointerEvents="none";$("viewModeLabel").textContent="ROOM PREVIEW";setStatus("Studio ready");});
  }catch(err){console.error(err);toast("Could not start AR. Check HTTPS, camera permission and device support.");}
}
async function initThree(){
  const {renderer,scene,camera}=(()=>{const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera();const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.xr.enabled=true;renderer.setSize($("stage").clientWidth,$("stage").clientHeight);renderer.xr.setReferenceSpaceType("local");$("threeHost").appendChild(renderer.domElement);scene.add(new THREE.HemisphereLight(0xffffff,0xbbbbbb,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(1,4,2);scene.add(light);return{renderer,scene,camera}})();
  const reticle=new THREE.Mesh(new THREE.RingGeometry(.12,.16,32),new THREE.MeshBasicMaterial({color:0x2dff9b}));reticle.rotation.x=-Math.PI/2;reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
  const state={renderer,scene,camera,reticle,models:[],hitTestSource:null,hitTestRequested:false};
  renderer.setAnimationLoop((time,frame)=>{
    if(frame){
      const session=renderer.xr.getSession();
      if(!state.hitTestRequested){session.requestReferenceSpace("viewer").then(ref=>session.requestHitTestSource({space:ref})).then(source=>{state.hitTestSource=source;state.hitTestRequested=true}).catch(()=>{});}
      if(state.hitTestSource){const ref=renderer.xr.getReferenceSpace();const hits=frame.getHitTestResults(state.hitTestSource);if(hits.length){const pose=hits[0].getPose(ref);reticle.visible=true;reticle.matrix.fromArray(pose.transform.matrix)}else reticle.visible=false;}
    }
    renderer.render(scene,camera);
  });
  threeState=state;
}
$("launchARBtn").addEventListener("click",launchAR);
window.addEventListener("beforeunload",()=>stream?.getTracks().forEach(t=>t.stop()));
