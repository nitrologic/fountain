// worker.ts
// basic frame counter

// emits events start error tick

const MaxFrames=0;

const dots = ["🟣", "🔵", "🟢", "🟡", "🔴"];

const period=500;

const startTime=performance.now();

let frameCount=0;

self.onmessage=(e)=>{
	const slip=e.data||{};
	switch(slip.command){
		case "reset":
			frameCount=0;
			break;
		case "stop":
			frameCount=0;
			break;
	}
};

const Leds="⚫⚪🔵🟢🔴🟡🟣🟠🟤";
const ledArray = ["⚫", "⚪", "🔵", "🟢", "🔴", "🟡", "🟣", "🟠", "🟤"]
function blankFrame(index:number):string{
	const start=index%ledArray.length;
	const led=ledArray[start];
	const grid=(led.repeat(48)+"\n").repeat(2);
	return grid;
}
function update() {
	const count=frameCount++;
	const time=performance.now();
	const frame=(count<MaxFrames)?blankFrame(count):"";
	return {success:true,time,event:"tick",count,frame};
}

setInterval(()=>{const reply=update();self.postMessage(reply);},period);

try {
	self.postMessage({success:true,event:"start",time:startTime});
} catch (error) {
	self.postMessage({success:false,event:"error",error:error.message });
}
