// worker.ts
// basic frame counter

// emits events start error tick

const dots = ["🟣", "🔵", "🟢", "🟡", "🔴"];

const period=200;

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

const blankFrame=("⚫".repeat(48)+"\n").repeat(12);

function update() {
	const count=frameCount++;
	const time=performance.now();
	const frame=(count==0)?blankFrame:"";
	return {success:true,time,event:"tick",count,frame};
}

setInterval(()=>{const reply=update();self.postMessage(reply);},period);

try {
	self.postMessage({success:true,event:"start",time:startTime});
} catch (error) {
	self.postMessage({success:false,event:"error",error:error.message });
}
