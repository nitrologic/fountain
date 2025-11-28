// aws.ts - Amazon cloud utils
// Copyright (c) 2025 Simon Armstrong
// All rights reserved

import { CostExplorerClient, GetCostAndUsageCommand } from "npm:@aws-sdk/client-cost-explorer";
import {EC2Client, DescribeVolumesCommand, DescribeInstancesCommand} from "npm:@aws-sdk/client-ec2";

const ec2 = new EC2Client({ region: "ap-southeast-6" }); // Your NZ region

//import {S3Client,CreateBucketCommand,GetObjectCommand,PutObjectCommand,ListObjectsV2Command} from "npm:@aws-sdk/client-s3";
//import { createClient } from "npm:redis@4";

async function getCurrentMonthBill() {
	const costExplorer = new CostExplorerClient({ region: "us-east-1" }); // Cost Explorer lives in us-east-1

	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
	const end = now.toISOString().slice(0, 10);

	const params = {
		TimePeriod: { Start: start, End: end },
		Granularity: "MONTHLY",
		Metrics: ["UnblendedCost"],
	};

	const command = new GetCostAndUsageCommand(params);
	const result = await costExplorer.send(command);
	console.log("Current month cost:", JSON.stringify(result.ResultsByTime, null, 2));
}

await getCurrentMonthBill();

async function listMyVolumes(instanceId) {
    console.log("Listing EC2 volumes...");
	const cmd = new DescribeVolumesCommand({
	Filters: [
		{
		Name: "attachment.instance-id",
		Values: [instanceId],
		},
	],
	});
	const result = await ec2.send(cmd);
	console.log(result);
}

async function listMyInstances() {
    console.log("Listing EC2 instances...");
    const command = new DescribeInstancesCommand({
        Filters: [
            { Name: "instance-state-name", Values: ["running"] }
        ]
    });    
    console.log("sending Listing EC2 instances...");  
    const result = await ec2.send(command);
    console.log("Processing Listing EC2 instances...");  
    for (const res of result.Reservations ?? []) {
        for (const inst of res.Instances ?? []) {
            console.log({
                InstanceId: inst.InstanceId,
                State: inst.State?.Name,
                Type: inst.InstanceType,
                PrivateIp: inst.PrivateIpAddress,
                PublicIp: inst.PublicIpAddress,
                LaunchTime: inst.LaunchTime?.toISOString()
            });

			await listMyVolumes(inst.InstanceId);
        }
    }
}

await listMyInstances();

console.log("Mission Complete");
