// worker.ts
// basic frame counter

const MaxFrames=0;

const period=50;

// emits slow blink events start error tick

const ledArray = ["⚫","⚪", "🔵", "🟢", "🔴", "🟡", "🟣", "🟠", "🟤"]
const scanArray=["‾","⎺","⎻","─","⎼","⎽","_"];
const barArray=["│","║","┃","┆","┇","┊","┋"]


// display system for the test1 tick example

let frameCount=0;

self.onmessage=(e)=>{
	const slip=e.data||{};
	switch(slip.command){
		case "reset":
			frameCount=0;
			const size=slip.consoleSize;
			break;
		case "stop":
			frameCount=0;
			break;
	}
};

function blankFrame(index){
	const array=barArray;//scanArray;//ledArray
	const start=index%array.length;
	const led=array[start];
	const grid=(led.repeat(48)+"\n").repeat(5);
	return grid;
}

// a periodic timer that posts a tick event to slopShop host

const startTime=performance.now();

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
