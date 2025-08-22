// test2 bloks

// big wide terminal blocks sandbox
// half spacing and wide spacing work in progress

import { loadSprites, greyShade, pixelMap, SixShades } from "./sloputil.js";

const MaxFrame=500;

const sprites=await loadSprites("../slop/slop-sprites.txt")
const numbers=await loadSprites("../slop/slop-number-sprites.txt")

// console.log("numbers",numbers.length);

const period=50;	//20hz chunky pixel display
//const period=40;	//25hz chunky pixel display
// pico is 240 x 135
// pixelMap is currently colored foreground 2x2 blocks on ansi background

let tvWidth=128;
let tvHeight=32;
const startTime=performance.now();
let tv={};

function setSize(w,h){
	tv=new pixelMap(w,h);
	tvWidth=w;
	tvHeight=h;
}

setSize(tvWidth,tvHeight);

function onResize(size){
	if(size){
		const w=size.columns-2;
		const h=size.rows-2;
//		setSize(w*2,h*2); //dither and quad
		setSize(w,h); //char & widechars
	}
}

class Ship{
	x=20;
	y=10;
}

class Shot{
	x;
	y;
	constructor(x,y){
		this.x=x;
		this.y=y;
	}
}

let shipJoy=[0,0,0];
let shotCount=0;
let frameCount=-1;
const ship=new Ship();
const shots=[];

function onReset(){
	shipJoy=[0,0,0];
	shotCount=0;
// todo: currently under switch case control
//	frameCount=0;
	ship.x=20;
	ship.y=10;
	shots.length=0;
}

function onTick(){
	const joy=shipJoy;
	ship.x+=joy[0]*0.5;
	let y=ship.y+joy[1]*0.5;
	if(y<1) y=1;
	if(y>32) y=32;
	ship.y=y;
	if(shotCount<joy[2]){
		shotCount++;
		shots.push(new Shot(ship.x+6,ship.y+1));
	}
	for (let i = shots.length - 1; i >= 0; i--) {
		shots[i].x += 2;
		if (shots[i].x > tvWidth) {
			shots.splice(i, 1);

		}
	}
}

function gameFrame(){
	const millis=performance.now();
	if(frameCount<5){
		tv.blank(1);
	}else{

		tv.cls(greyShade(0.5));

		// frame 0 for walk tween
		let moving=!(shipJoy[0]==0&&shipJoy[1]==0)

		let tween=millis&64?1:0;
		tv.draw(sprites[moving?tween:1],ship.x,ship.y);

		tv.draw(sprites[1],36,2);

		for(const shot of shots){
			tv.plot(shot.x,shot.y);
		}
//		tv.rect(ship.x+10,ship.y,3,3);
	}
	const fb=tv.widecharFrame("🔳"," ");	//⬜
	return fb.join("\n");
}

function tick() {
	const stopped=frameCount<0;
	const count=stopped?-1:frameCount++;
	if(!stopped) onTick();
	const time=performance.now();
	const frame=(count>=0 && count<MaxFrame)?gameFrame():"";
	return {success:true,time,event:"tick",count,frame};
}

function update(events){
	for(const e of events){
		if(e.name=="joy") shipJoy=e.code;
	}
}

self.onmessage=(e)=>{
	const slip=e.data||{};
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

setInterval(()=>{const reply=tick();self.postMessage(reply);},period);

try {
	self.postMessage({success:true,event:"start",time:startTime});
} catch (error) {
	self.postMessage({success:false,event:"error",error:error.message });
}
