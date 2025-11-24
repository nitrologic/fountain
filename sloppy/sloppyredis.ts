 import { connect } from "jsr:@db/redis";

  const redis = await connect({ hostname: "127.0.0.1", port: 6379 });

  console.log("hello redis");
  