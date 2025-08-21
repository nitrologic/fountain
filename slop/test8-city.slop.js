// city lights fun worker

const hue9=["🔴🟠🟡🟢🔵🟣🟤⚫⚪","🟥🟧🟨🟩🟦🟪🟫⬛⬜"];
const square6="🔳🔲◼️◻️▪️▫️";

const Wide=36;

function grid(bg,mg,fg){
	const top=(bg.repeat(Wide)+"\n").repeat(11);
	const mid=(mg.repeat(Wide)+"\n").repeat(1);
	const bot=(fg.repeat(Wide)+"\n").repeat(12);
	return top+mid+bot;
}

function frontPanel(){
	return grid("🟦","🟧","⬜");
//	return (hue9[0].repeat(7)+"\n").repeat(24);
}

const MaxFrame=1000;

const tickLog=[];

let refreshTick=0;
let tickCount=0;
let frameCount=-1;
let echoBuffer=[];


function echo(...args){
	const lines=[];
	for(const arg of args){
		const line=toString(arg);
		lines.push(line.trim());
	}
	const output=lines.join(" ").trim();
	if(output.length){
		echoBuffer.push(output);
		console.log("[CITY]",output);
	}
}

function onResize(size){
	echo("onResize",size);	
}
function onReset(){
	echo("onReset");	
}
function onCPUTick(){
//	echo("onCPUTick");	
}
function tick() {
	tickCount++;
	const stopped=frameCount<0;
	const count=stopped?-1:frameCount++;
	if(!stopped) onCPUTick();
	const frame=(count>=0 && count<MaxFrame)?frontPanel():"";
	return {success:true,event:"tick",count,frame};
}

function update(events){
	for(const e of events){
		if(e.name=="refresh"){
			refreshTick=e.code[0];
			const reply=tick();
			self.postMessage(reply);
		}
	}
}

self.onmessage=(e)=>{
	const slip=e.data||{};
//  console.log("[TEST8-CITY] onmessage",slip);
	switch(slip.command){
		case "reset":
			frameCount=0;
			const size=slip.consoleSize;
			if(size) onResize(size);
			onReset();
			break;
		case "update":
			const events=slip.events;
			update(events);
			break;
		case "stop":
			frameCount=-1;
			break;
	}
};


try {
	self.postMessage({success:true,event:"start",time:startTime});
} catch (error) {
	self.postMessage({success:false,event:"error",error:error.message });
}
