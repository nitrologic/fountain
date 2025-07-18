// worker.ts

// emits events start error tick

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


const blocks=" ▘▝▖▗▌▐▀▄▚▞▛▜▙▟█"; 

const blockbits=[0, 1,2,4,8, 5,10,3,12,9,6, 7,11,13,14, 15];

const code={
	"▘":{"char":"▘","codepoint":"2598","name":"QUADRANT UPPER LEFT"},
	"▝":{"char":"▝","codepoint":"259D","name":"QUADRANT UPPER RIGHT"},
	"▖":{"char":"▖","codepoint":"2596","name":"QUADRANT LOWER LEFT"},
	"▗":{"char":"▗","codepoint":"2597","name":"QUADRANT LOWER RIGHT"},

	"▌":{"char":"▌","codepoint":"258C","name":"LEFT HALF BLOCK"},
	"▐":{"char":"▐","codepoint":"2590","name":"RIGHT HALF BLOCK"},
	"▀":{"char":"▀","codepoint":"2580","name":"UPPER HALF BLOCK"},
	"▄":{"char":"▄","codepoint":"2584","name":"LOWER HALF BLOCK"},
	"▚":{"char":"▚","codepoint":"259A","name":"QUADRANT UPPER LEFT AND LOWER RIGHT"},
	"▞":{"char":"▞","codepoint":"259E","name":"QUADRANT UPPER RIGHT AND LOWER LEFT"},

	"▛":{"char":"▛","codepoint":"259B","name":"QUADRANT UPPER LEFT AND UPPER RIGHT AND LOWER LEFT"},
	"▜":{"char":"▜","codepoint":"259C","name":"QUADRANT UPPER LEFT AND UPPER RIGHT AND LOWER RIGHT"},
	"▙":{"char":"▙","codepoint":"2599","name":"QUADRANT UPPER LEFT AND LOWER LEFT AND LOWER RIGHT"},
	"▟":{"char":"▟","codepoint":"259F","name":"QUADRANT UPPER RIGHT AND LOWER LEFT AND LOWER RIGHT"},

	"█": {"char": "█", "codepoint": "2588", "name": "FULL BLOCK"},
}

function update() {
	const count=frameCount++;
	const time=performance.now();
	const frame="";//(count==0)?blankFrame:"";
	return {success:true,time,event:"tick",count,frame};
}

setInterval(()=>{const reply=update();self.postMessage(reply);},period);

try {
	self.postMessage({success:true,event:"start",time:startTime});
} catch (error) {
	self.postMessage({success:false,event:"error",error:error.message });
}
