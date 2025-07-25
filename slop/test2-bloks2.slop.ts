// worker.ts
// emits events start error tick

import { pixelMap } from "./sloputil.ts";

async function loadSprites(path:string){
	const spritestxt=await Deno.readTextFile(path);
	//console.log(spritestxt);
	const sprites=spritestxt.split(/\n\s*\n/);
	//console.log("sprites=",sprites.length);
	return sprites
}

const sprites=await loadSprites("../slop/test-sprites.txt")
const numbers=await loadSprites("../slop/number-sprites.txt")

// console.log("numbers",numbers.length);

const period=50;	//20hz chunky pixel display
//const period=40;	//25hz chunky pixel display

const MaxFrame=1200;

const tvWidth=128;
const tvHeight=32;

// pico is 240 x 135


// pixelMap is currently colored foreground 2x2 blocks on ansi background

let tv:pixelMap=new pixelMap(tvWidth,tvHeight);
const startTime=performance.now();
let frameCount=-1;

function resize(){
	const size=Deno.consoleSize;
	if(size){
		const w=size.columns*2;
		tv=new pixelMap(w,size.rows*2-6);
	}
}

function test1(){
	for(let i=0;i<100;i++){
		tv.plot(i,i);
	}
	tv.draw(sprites[0],12,2);
	tv.draw(sprites[1],16,7);
	tv.draw(sprites[0],0,12);
	for(let i=0;i<24;i++){
		const d=(Math.random()*10)|0;
		tv.draw(numbers[d],i*5,17);
	}
}

class Ship{
	x=20;
	y=10;
}

const ship=new Ship();

class Shot{
	x:number;
	y:number;
	constructor(x,y){
		this.x=x;
		this.y=y;
	}
}

const shots:Shot[]=[];
let shipJoy=[0,0,0];
let fireCount=0;

function onReset(){
	ship.x=20;
	ship.y=10;
	shots.length=0;
}

function onTick(){
	const joy=shipJoy;
	ship.x+=joy[0];
	let y=ship.y+joy[1]*0.5;
	if(y<1) y=1;
	if(y>32) y=32;
	ship.y=y;
	if(fireCount<joy[2]){
		fireCount++;
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
	const t=performance.now();
//	const shade=(t/3e3)%1;
//	tv.noise(shade);
//	tv.blank(0.8);
	tv.cls(0.8);
	tv.draw(sprites[0],ship.x,ship.y);
	tv.draw(sprites[1],36,2);

	for(const shot of shots){
		tv.plot(shot.x,shot.y);
	}

	return tv.frame().join("\n");
}

function tick() {
	const stopped=frameCount<0;
	const count=stopped?-1:frameCount++;
	if(!stopped) onTick();
	const time=performance.now();
	const frame=(count>=0 && count<MaxFrame)?gameFrame():"";
	return {success:true,time,event:"tick",count,frame};
}

function update(events:any[]){
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
			if(size){
				const w=size.columns*2;
				tv=new pixelMap(w,size.rows*2-4);
			}
			onReset();
			break;
		case "update":
			const events=slip.events;
			update(events);
			break;
		case "stop":
			frameCount=0;
			break;
	}
};

setInterval(()=>{const reply=tick();self.postMessage(reply);},period);

try {
	self.postMessage({success:true,event:"start",time:startTime});
} catch (error) {
	self.postMessage({success:false,event:"error",error:error.message });
}
