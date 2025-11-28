// aws.ts - Amazon cloud utils
// Copyright (c) 2025 Simon Armstrong
// All rights reserved

import { CostExplorerClient, GetCostAndUsageCommand } from "npm:@aws-sdk/client-cost-explorer";

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

console.log("Mission Complete");
