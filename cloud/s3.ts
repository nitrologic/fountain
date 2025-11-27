// s3.ts - An S3 redis bucket sync
// Copyright (c) 2025 Simon Armstrong
// All rights reserved

import {S3Client,CreateBucketCommand,GetObjectCommand,PutObjectCommand,ListObjectsV2Command} from "npm:@aws-sdk/client-s3";
import { createClient } from "npm:redis@4";

const REDIS_PREFIX="S3:";

// note - capitalized vars are typically aws-sdk arguments

async function syncS3Bucket(s3,Bucket,clean=false) {
	console.log("Syncing S3:",Bucket);
	let synced = 0;
	let token: string | undefined;
	if(clean) {
//		flushRedisKeys();
	}
	do {
		const list=new ListObjectsV2Command({Bucket,ContinuationToken: token,});
		const { Contents, NextContinuationToken } = await s3.send(list);
//		console.log("contents",Contents);
		if (Contents) {
			for (const obj of Contents) {
				if (!obj.Key) continue;
				if (obj.Key.endsWith("/")) continue;
				const etag=obj.ETag?.replace(/"/g, "");
				const record={
					key: obj.Key,
					size: obj.Size,
					date: obj.LastModified?.toISOString(),
					etag
				};
				const key = "S3."+Bucket+":"+obj.Key;
				const value = JSON.stringify(record);
				await redis.set(key, value);
				synced++;
				console.log({key,value})
			}
		}
		token = NextContinuationToken;
	} while (token);
}

const ReadObject=false;
const CreateBucket=false;
const ListObjects=false;

console.log("aws s3 sandbox 0.2");
// redis is up
const redis = createClient({url:"redis://localhost:6379"});
const connected=await redis.connect();
console.log("redis connected",connected?"true":"false");
// nz is home
const s3 = new S3Client({ region: "ap-southeast-6" });

if(ListObjects){
	const result = await s3.send(new ListObjectsV2Command({Bucket: "dsp-nitro"}));
	console.log(result.Contents);
}

await syncS3Bucket(s3,"dsp-nitro",false);

if(ReadObject){
	const out = await s3.send(new GetObjectCommand({Bucket: "dsp-nitro",Key: "surfsail.png"}));
	const bytes = await out.Body?.transformToByteArray();
	await Deno.writeFile("surfsail.png", bytes);
	console.log("Object saved locally");
}

if(CreateBucket){
	const createbucket=await s3.send(new CreateBucketCommand({Bucket: "dsp-fountain",CreateBucketConfiguration: {LocationConstraint: "ap-southeast-6"}}))
	console.log("Bucket created",createbucket);
}

await redis.quit();
console.log("Mission Complete");
