// index.js
const express = require("express");
const { createCanvas } = require("canvas");
const { ethers } = require("ethers");

const app = express();
app.use(express.json());

// Konfigurasi
const TOBY_ADDRESS = "0xb8D98a102b0079B69FFbc760C8d857A31653e56e"; // kontrak TOBY di Base
const OWNER_WALLET = "0x9BaB8eB256D80f8c2fc70d0f361aD8e47d7fd0A5"; // wallet lu
const DECIMALS = 18;
const SPIN_COST = ethers.utils.parseUnits("100000", DECIMALS); // 100.000 TOBY
const BASE_RPC = "https://mainnet.base.org"; // RPC Base mainnet

// ethers provider
const provider = new ethers.providers.JsonRpcProvider(BASE_RPC);

// ABI minimal ERC20
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint amount)"
];

const token = new ethers.Contract(TOBY_ADDRESS, ERC20_ABI, provider);

// simbol slot
const symbols = ["🐱", "🔥", "💎", "⭐", "7️⃣", "🍀"];

// Landing (Frame metadata)
app.get("/", (req, res) => {
  res.set("Content-Type", "text/html");
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="https://your-domain.com/api/render?msg=Spin%20Earn%20Toby%20🎰" />
        <meta property="fc:frame:button:1" content="🎰 Spin (100k TOBY)" />
        <meta property="fc:frame:post_url" content="https://your-domain.com/api/spin" />
      </head>
      <body>
        <h1>Spin Earn Toby 🎰</h1>
        <p>Bayar 100,000 TOBY untuk spin dan menangkan hadiah</p>
      </body>
    </html>
  `);
});

// Spin endpoint
app.post("/api/spin", async (req, res) => {
  try {
    // ambil user address dari farcaster frame payload
    const playerAddress = req.body?.untrustedData?.address;
    if (!playerAddress) {
      return res.json({
        frame: {
          version: "vNext",
          image: "https://your-domain.com/api/render?msg=Koneksi%20wallet%20gagal",
          buttons: [{ label: "Coba Lagi", action: "post" }],
          post_url: "https://your-domain.com/api/spin"
        }
      });
    }

    // cek transaksi terakhir user -> ownerWallet
    const latestBlock = await provider.getBlockNumber();
    const filter = token.filters.Transfer(playerAddress, OWNER_WALLET);
    const logs = await token.queryFilter(filter, latestBlock - 5000, latestBlock); // cek 5000 blok terakhir

    const paid = logs.some(log => log.args.amount.gte(SPIN_COST));

    if (!paid) {
      return res.json({
        frame: {
          version: "vNext",
          image: "https://your-domain.com/api/render?msg=Bayar%20100k%20TOBY%20ke%20" + OWNER_WALLET,
          buttons: [{ label: "✅ Saya sudah bayar", action: "post" }],
          post_url: "https://your-domain.com/api/spin"
        }
      });
    }

    // lakukan spin
    const spin = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)]
    ];

    let msg = `Kalah 😭`;
    let reward = 0;
    if (spin[0] === spin[1] && spin[1] === spin[2]) {
      msg = `🎉 JACKPOT ${spin.join(" ")} 🎉 + Hadiah 50k TOBY`;
      reward = 50000;
    } else if (spin[0] === spin[1] || spin[1] === spin[2]) {
      msg = `Lumayan! ${spin.join(" ")} + Hadiah 10k TOBY`;
      reward = 10000;
    }

    return res.json({
      frame: {
        version: "vNext",
        image: `https://your-domain.com/api/render?msg=${encodeURIComponent(msg)}&spin=${encodeURIComponent(spin.join(" "))}`,
        buttons: [{ label: "🎰 Spin Lagi", action: "post" }],
        post_url: "https://your-domain.com/api/spin"
      }
    });

  } catch (err) {
    console.error(err);
    return res.json({
      frame: {
        version: "vNext",
        image: "https://your-domain.com/api/render?msg=Error%20Server",
        buttons: [{ label: "Coba Lagi", action: "post" }],
        post_url: "https://your-domain.com/api/spin"
      }
    });
  }
});

// Render image
app.get("/api/render", (req, res) => {
  const spin = req.query.spin || "❓ ❓ ❓";
  const msg = req.query.msg || "Spin Earn Toby 🎰";

  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, 600, 400);

  ctx.fillStyle = "#f4d03f";
  ctx.font = "30px Arial";
  ctx.fillText("Spin Earn Toby 🎰", 180, 50);

  ctx.fillStyle = "#fff";
  ctx.font = "60px Arial";
  ctx.fillText(spin, 180, 200);

  ctx.fillStyle = "#0f0";
  ctx.font = "22px Arial";
  ctx.fillText(msg, 100, 320);

  res.set("Content-Type", "image/png");
  res.send(canvas.toBuffer());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server jalan di http://localhost:${PORT}`));