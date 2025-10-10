// ya, hit tcp 443 on binance, 8443 on kraken, or 443 on coinbase pro for raw mbp/depth snapshots
// Run with: deno run --allow-net tick.ts

async function connectBinance() {
  const ws = new WebSocket("wss://stream.binance.com:443/ws/btcusdt@depth5@100ms");
  ws.onopen = () => console.log("Binance connected");
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.b && data.a) {
      const bid = data.b[0][0]; // best bid price
      const ask = data.a[0][0]; // best ask price
      console.log(`Binance BTCUSDT: Bid ${bid}, Ask ${ask}`);
    }
  };
  ws.onerror = (e) => console.error("Binance error:", e);
  ws.onclose = () => console.log("Binance closed");
}

async function connectKraken() {
  const ws = new WebSocket("wss://ws.kraken.com");
  ws.onopen = () => {
    console.log("Kraken connected");
    ws.send(JSON.stringify({
      event: "subscribe",
      pair: ["XBT/USD"],
      subscription: { name: "book", depth: 5 }
    }));
  };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (Array.isArray(data) && data.length > 1 && data[1].as && data[1].bs) {
      const asks = data[1].as; // array of [price, volume, orders]
      const bids = data[1].bs;
      const bestAsk = asks[0][0];
      const bestBid = bids[0][0];
      console.log(`Kraken XBTUSD: Bid ${bestBid}, Ask ${bestAsk}`);
    }
  };
  ws.onerror = (e) => console.error("Kraken error:", e);
  ws.onclose = () => console.log("Kraken closed");
}

async function connectCoinbase() {
  const ws = new WebSocket("wss://ws-feed.exchange.coinbase.com");
  ws.onopen = () => {
    console.log("Coinbase connected");
    ws.send(JSON.stringify({
      type: "subscribe",
      product_ids: ["BTC-USD"],
      channels: [{ name: "level2", product_ids: ["BTC-USD"] }]
    }));
  };
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "snapshot" || data.type === "l2update") {
      const bids = data.bids || [];
      const asks = data.asks || [];
      if (bids.length > 0 && asks.length > 0) {
        const bestBid = bids[0][0];
        const bestAsk = asks[0][0];
        console.log(`Coinbase BTC-USD: Bid ${bestBid}, Ask ${bestAsk}`);
      }
    }
  };
  ws.onerror = (e) => console.error("Coinbase error:", e);
  ws.onclose = () => console.log("Coinbase closed");
}

// Connect to all
await Promise.all([connectBinance(), connectKraken(), connectCoinbase()]);
//await Promise.all([connectBinance(), connectCoinbase()]);

// Keep the script running
setInterval(() => {}, 1 << 30); // Infinite loop