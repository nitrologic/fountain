// slopsave.ts - A research tool utility for authoring media files.
// Copyright (c) 2025 Simon Armstrong
// Licensed under the MIT License

import { resolve } from "https://deno.land/std/path/mod.ts";

// save wav files with meta data

// reference info from project bibli:
/*
const RIFFTags={
	"IARL": "Archival Location",
	"IART": "Artist",
	"ICAS": "Default Audio Stream",
	"ICMS": "Commissioned",
	"ICMT": "Comment",
	"ICNM": "Cinematographer",
	"ICNT": "Country",
	"ICOP": "Copyright",
	"ICRD": "Creation Date",
	"ICRP": "Cropped",
	"IDIM": "Dimensions",
	"IDIT": "Date Time Original",
	"IDPI": "Dots Per Inch",
	"IDST": "Distributed By",
	"IEDT": "Edited By",
	"IENC": "Encoded By",
	"IENG": "Engineer",
	"IGNR": "Genre",
	"IKEY": "Keywords",
	"ILGT": "Lightness",
	"ILNG": "Language",
	"IMED": "Medium",
	"IMIT": "More Info Text",
	"IMUS": "Music By",
	"INAM": "Title",
	"IPDS": "Production Designer",
	"IPLT": "Num Colors",
	"IPRD": "Product",
	"IPRO": "Produced By",
	"IRIP": "Ripped By",
	"IRTD": "Rating",
	"ISBJ": "Subject",
	"ISFT": "Software",
	"ISGN": "Secondary Genre",
	"ISHP": "Sharpness",
	"ISMP": "Time Code",
	"ISRC": "Source",
	"ISRF": "Source Form",
	"ISTR": "Starring",
	"ITCH": "Technician",
	"ITRK": "Track Number",
	"IWRI": "Written By",
	"LOCA": "Location",
	"PRT1": "Part",
	"PRT2": "Number Of Parts",
	"RATE": "Rate",
	"STAT": "Statistics",
	"TAPE": "Tape Name",
	"TCDO": "End Timecode",
	"TCOD": "Start Timecode"
};
*/

function CreationDate():string{
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so +1
	const day = String(now.getDate()).padStart(2, '0');
	return [year,month,day].join("-");
}

const testTags={ISFT:"SlopFountain",ICRD:CreationDate()};

const MediaFolder=".";

function buildInfo(metaData: Record<string, string>): Uint8Array {
	const keys = Object.keys(metaData);
	if (keys.length === 0) return new Uint8Array(0);
	const encoder = new TextEncoder();
	let infoSize = 4; // "INFO" identifier
	const infoData: Uint8Array[] = [];
	for (const key of keys) {
		const valueStr = metaData[key] + "\0"; // null terminated
		const value = encoder.encode(valueStr);
		const paddedLength = value.length % 2 === 0 ? value.length : value.length + 1;
		const chunk = new Uint8Array(8 + paddedLength);
		const view = new DataView(chunk.buffer);
		view.setUint32(0,key.charCodeAt(0)|(key.charCodeAt(1)<<8)|(key.charCodeAt(2)<<16)|(key.charCodeAt(3)<<24),false);
		view.setUint32(4, value.length, true); // Size
		chunk.set(value, 8); // Value
		if (paddedLength > value.length) chunk[8 + value.length] = 0; // pad
		infoSize += chunk.length;
		infoData.push(chunk);
	}
	const infoChunk = new Uint8Array(infoSize + 8);
	const infoView = new DataView(infoChunk.buffer);
	infoView.setUint32(0, 0x4c495354, false); // "LIST"
	infoView.setUint32(4, infoSize, true);
	infoView.setUint32(8, 0x494e464f, false); // "INFO"
	let offset = 12;
	for (const chunk of infoData) {
		infoChunk.set(chunk, offset);
		offset += chunk.length;
	}
	return infoChunk;
}

export async function saveAudioFile(audio: Uint8Array, mimeType:string, metaData:Record<string,string>): Promise<string> {
	// expecting audio/L16;codec=pcm;rate=24000
	const format:string = "wav";
	const timestamp=Math.floor(Date.now()/1000).toString(16);
	const filename=("speech-"+timestamp)+"."+format;
	const filePath=resolve(MediaFolder,filename);
	const line="saved "+filename;
//	rohaHistory.push({role:"system",title:"saveSpeech",content:line});
  // Create a WAV header (44 bytes)
	const infoChunk = buildInfo(metaData);
	const header = new Uint8Array(44);
	const view = new DataView(header.buffer);
  // RIFF chunk descriptor
	view.setUint32(0, 0x52494646, false); // "RIFF"
	view.setUint32(4, 36 + audio.length + infoChunk.length, true); // File size - 8
	view.setUint32(8, 0x57415645, false); // "WAVE"
  // Format subchunk
	view.setUint32(12, 0x666d7420, false); // "fmt "
	view.setUint32(16, 16, true); // Subchunk size (16 for PCM)
	view.setUint16(20, 1, true); // Audio format (1 = PCM)
	view.setUint16(22, 1, true); // Channels (1 = mono)
	view.setUint32(24, 24000, true); // Sample rate (16kHz)
	view.setUint32(28, 24000 * 2, true); // Byte rate (sample rate * bytes per sample)
	view.setUint16(32, 2, true); // Block align (channels * bytes per sample)
	view.setUint16(34, 16, true); // Bits per sample (16-bit)
  // Data subchunk
	view.setUint32(36, 0x64617461, false); // "data"
	view.setUint32(40, audio.length, true); // Data size
  // Combine header and audio data
	const totalLength = header.length + infoChunk.length + audio.length;
	const wavBytes = new Uint8Array(totalLength);
	wavBytes.set(header, 0);
	wavBytes.set(infoChunk, header.length);
	wavBytes.set(audio, header.length + infoChunk.length);
	try {
		await Deno.writeFile(filePath, wavBytes);
		console.log("[SAVE]", line);
		return filePath;
	} catch (error:Error) {
		console.log("[SAVE] Speech save error", error.message);
		throw error; // Re-throw to handle the error upstream
	}
}
