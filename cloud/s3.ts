import {S3Client,CreateBucketCommand,GetObjectCommand,PutObjectCommand,ListObjectsV2Command} from "npm:@aws-sdk/client-s3";
import { createClient } from "npm:redis@4";

const REDIS_PREFIX="S3:";

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
				if (!obj.Key || obj.Key.endsWith("/")) continue; // skip folders
				const etag=obj.ETag?.replace(/"/g, "");
				const spec={key: obj.Key,size: obj.Size,modified: obj.LastModified?.toISOString(),etag};
				const redisKey = "S3:"+obj.Key;
				const value = JSON.stringify(spec);
				await redis.set(redisKey, value);
				synced++;
				console.log("spec:",spec)
			}
		}
		token = NextContinuationToken;
	} while (token);
}


console.log("aws s3 fountain pipe 0.1");
const redis = createClient({url:"redis://localhost:6379"});
const connected=await redis.connect();
console.log("redis connected",connected?"true":"false");
// nz is home
const s3 = new S3Client({ region: "ap-southeast-6" });
// send test
const result = await s3.send(new ListObjectsV2Command({Bucket: "dsp-nitro"}));
console.log(result.Contents);

await syncS3Bucket(s3,"dsp-nitro",false);

// read object
if(false){
	const out = await s3.send(new GetObjectCommand({Bucket: "dsp-nitro",Key: "surfsail.png"}));
	const bytes = await out.Body?.transformToByteArray();
	await Deno.writeFile("surfsail.png", bytes);
	console.log("Object saved locally");
}
// create a bucket
// const createbucket=await s3.send(new CreateBucketCommand({Bucket: "dsp-fountain",CreateBucketConfiguration: {LocationConstraint: "ap-southeast-6"}}))
// console.log("Bucket created",createbucket);

await redis.quit();
console.log("Mission Complete");
