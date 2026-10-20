# Deploy Raft ($RAFT) ke VPS

Untuk orang yang punya akses SSH ke VPS. Cukup 3 perintah. Skrip ini **hanya menambah**:
1 situs nginx untuk domain kamu dan 1 proses pm2 (`raft-engine`, port 5051).
Situs dan aplikasi lain yang sudah ada di server **tidak diubah**.

Di bawah ini ganti `DOMAIN_KAMU` dan `IP_SERVER` dengan milik kamu.

## 1. Masuk ke VPS lalu ambil kodenya

```sh
ssh root@IP_SERVER
apt-get install -y git
git clone https://github.com/Dhkrmynti/raft.git /opt/raft
```

## 2. Pasang

```sh
cd /opt/raft
DOMAIN=DOMAIN_KAMU sh scripts/install-server.sh
```

Skrip ini memasang Node 20, nginx, pm2, dan certbot (hanya yang belum ada), lalu membangun situsnya,
membuat `.env` engine, mendaftarkan situs nginx untuk domain kamu, dan menjalankan engine.
Kalau RPC Robinhood diblokir DNS Indonesia, DNS server otomatis dipindah ke DNS-over-TLS (Cloudflare/Google).

Skrip berhenti sendiri tanpa mengubah apa pun kalau port 80 dipakai aplikasi selain nginx,
atau port 5051 sudah dipakai. Untuk port lain: `DOMAIN=DOMAIN_KAMU PORT=5052 sh scripts/install-server.sh`.

## 3. Arahkan domain, lalu HTTPS

Di DNS domain kamu buat:

| Type | Name | Value |
|---|---|---|
| A | @ | IP_SERVER |
| A | www | IP_SERVER |

Tunggu beberapa menit sampai `ping DOMAIN_KAMU` menunjuk ke IP itu, lalu:

```sh
cd /opt/raft && DOMAIN=DOMAIN_KAMU sh scripts/install-server.sh https
```

## Update berikutnya

```sh
cd /opt/raft && git pull && DOMAIN=DOMAIN_KAMU sh scripts/install-server.sh update
```

## Setelah token launch di Pons

Buka `https://DOMAIN_KAMU/lotnok`, isi CA token, private key wallet creator, alamat treasury, dan **ADMIN_SECRET** (setiap simpan wajib pakai secret).
`ADMIN_SECRET` ada di `/opt/raft/.env`; jangan dibagikan.
Cek engine: `pm2 logs raft-engine`.
