// test5 bloks

// uses frameCount not performance.now() for timing purposes
// all sleeps removed

const MaxFrame=2400;

// frogger or little computer guy

import { ansiFG,ansiBG, loadSprites, greyShade, pixelMap, SixShades } from "./sloputil.js";

const sprites=await loadSprites("../slop/slop-sprites.txt")
const numbers=await loadSprites("../slop/slop-number-sprites.txt")

let tvWidth=128;
let tvHeight=32;
let tickCount=0;

const tiny=new pixelMap(128,12);

let tv={};

function setSize(w,h){
    tv=new pixelMap(w*2,h*2);
    tvWidth=w*2;
    tvHeight=h*2;
    tiny.resize(w*2,12);
}

setSize(tvWidth,tvHeight);

function onResize(size){
    if(size){
        const w=size.columns-2;
        const h=size.rows-4;
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
    const millis=frameCount*20;
    if(frameCount<5){
        tv.blank(1);
    }else{
        tv.cls(greyShade(0.5));
// pond life
        const w=tvWidth;
        let x=w-(frameCount%w);
        tv.draw(numbers[5],2+x,1);
/* shooting guy
        // frame 0 for walk tween
        let moving=!(shipJoy[0]==0&&shipJoy[1]==0)
        let tween=millis&64?1:0;
        tv.draw(sprites[moving?tween:1],ship.x,ship.y);
        tv.draw(sprites[1],36,2);
        for(const shot of shots){
            tv.plot(shot.x,shot.y);
        }
*/

//		tv.rect(ship.x+10,ship.y,3,3);
    }
//    const fb2=tv.widecharFrame("🔳"," ");	//⬜
//    return fb2.join("\n");


//    const fb2=tv.halfblockFrame();
    const fb2=tv.quadFrame();

    tiny.noise(0.5);
    const fb=tiny.brailleFrame();
    const fg=ansiFG(greyShade(0.1));
    const bg=ansiBG(greyShade(0.3));
    return fb.join("\n")+"\n"+fg+bg+fb2.join("\n");
}

function tick() {
    tickCount++;
    const stopped=frameCount<0;
    const count=stopped?-1:frameCount++;
    if(!stopped) onTick();
    const frame=(count>=0 && count<MaxFrame)?gameFrame():"";
    return {success:true,event:"tick",count,frame};
}

let refreshTick=0;

function update(events){
    for(const e of events){
        if(e.name=="joy") shipJoy=e.code;
        if(e.name=="refresh"){
            refreshTick=e.code[0];
//            console.log("!@!refresh",e.code[0]);

            const reply=tick();
            self.postMessage(reply);
        }
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

try {
    self.postMessage({success:true,event:"start",time:startTime});
} catch (error) {
    self.postMessage({success:false,event:"error",error:error.message });
}
