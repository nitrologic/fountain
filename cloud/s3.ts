import {S3Client,GetObjectCommand,PutObjectCommand,ListObjectsV2Command} from "npm:@aws-sdk/client-s3";

const s3 = new S3Client({ region: "ap-southeast-6" });

const result = await s3.send(new ListObjectsV2Command({Bucket: "dsp-nitro"}));

console.log(result.Contents);

console.log("aws s3 fountain pipe 0.1");
