/*
fails from worker

if (!("requestMIDIAccess" in navigator)) {                                                                                                                                                                      
  console.error("Web MIDI API not supported in this environment.");                                                                                                                                             
  Deno.exit(1);                                                                                                                                                                                                 
}                                                                                                                                                                                                               
                                                                                                                                                                                                                
const midiAccess = await navigator.requestMIDIAccess();                                                                                                                                                         
console.log("MIDI Devices:");                                                                                                                                                                                   
                                                                                                                                                                                                                
// List input devices (e.g., MIDI keyboards)                                                                                                                                                                    
midiAccess.inputs.forEach((input) => {                                                                                                                                                                          
  console.log(`Input: ${input.name} (${input.manufacturer})`);                                                                                                                                                  
  input.onmidimessage = (event) => {                                                                                                                                                                            
    console.log("MIDI Message:", event.data);                                                                                                                                                                   
  };                                                                                                                                                                                                            
});                                                                                                                                                                                                             
                                                                                                                                                                                                                
// List output devices (e.g., synthesizers)                                                                                                                                                                     
midiAccess.outputs.forEach((output) => {                                                                                                                                                                        
  console.log(`Output: ${output.name} (${output.manufacturer})`);                                                                                                                                               
}); 

*/