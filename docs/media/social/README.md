# Paket sosial CLI Neon Overlay

Video promosi berbahasa Indonesia, berbasis rekaman terminal asli. Pilih file sesuai permukaan posting, bukan nama aplikasi saja. Semua video berdurasi 18 detik, MP4 H.264, 30 fps, yuv420p, tanpa musik/narasi, dan dilengkapi cover PNG. Ini paket aset untuk diunggah sendiri, bukan posting otomatis ke akun sosial.

## Pilih file

| Tujuan | Video | Ukuran | Cover |
| --- | --- | --- | --- |
| Instagram Reels/Story, TikTok, Facebook Reels/Story, YouTube Shorts, WhatsApp Status | `reels-tiktok-stories-1080x1920.mp4` | 1080×1920, 9:16 | `cover-vertical-1080x1920.png` |
| Instagram feed portrait, Facebook feed, Threads portrait | `feed-1080x1350.mp4` | 1080×1350, 4:5 | `cover-feed-1080x1350.png` |
| Threads square, Facebook/Instagram square, LinkedIn | `square-1080x1080.mp4` | 1080×1080, 1:1 | `cover-square-1080x1080.png` |
| YouTube biasa, Facebook landscape, LinkedIn, X, website | `landscape-1920x1080.mp4` | 1920×1080, 16:9 | `cover-landscape-1920x1080.png` |
| WhatsApp Status/Story saat ingin file lebih ringan | `status-lite-720x1280.mp4` | 720×1280, 9:16 | `cover-status-lite-720x1280.png` |

File yang sama sengaja dipakai ulang pada placement dengan rasio sama. Tidak perlu lima salinan video vertikal hanya karena nama platform berbeda. Ukuran di atas adalah preset produksi, bukan klaim bahwa setiap platform mewajibkan persis ukuran tersebut atau bahwa upload akun tertentu sudah diuji.

Untuk post gambar/carousel Instagram, Threads atau Facebook, gunakan empat PNG 4:5 di `carousel/`, urutan 01–04. `overview.jpg` adalah lembar pemilihan format, bukan cover untuk diposting. `safe-area-vertical.png` hanya panduan QA, bukan aset publikasi.

## Cara posting

- **Threads:** pilih feed 4:5 atau square 1:1, lalu copy caption Threads dari `captions-id.md`. Link GitHub bisa disertakan langsung dalam teks.
- **Instagram Reels:** pilih vertikal 9:16. Pilih frame kucing atau unggah cover vertikal jika UI mengizinkan. Periksa crop thumbnail profil/feed di preview aplikasi; UI crop dapat berbeda. Video feed dapat tetap diklasifikasikan sebagai Reel oleh Instagram. Untuk post gambar murni, gunakan cover feed atau carousel PNG.
- **Instagram Story / Facebook Story:** pilih vertikal. Tambahkan sticker link GitHub bila tersedia pada akun. Jangan menambah sticker di atas hewan, judul atau perintah.
- **TikTok:** pilih vertikal, gunakan caption pendek dan pilih cover/frame di aplikasi. Konten utama sengaja dijauhkan dari kolom tombol kanan dan area caption bawah.
- **Facebook feed:** pilih 4:5; square juga tersedia jika komposisi feed menginginkannya.
- **WhatsApp Status:** pilih vertikal penuh atau versi lite. Versi lite membantu ukuran transfer, tetapi bukan jaminan WhatsApp tidak melakukan kompresi ulang. Isi caption dengan URL GitHub; jangan mengasumsikan sticker/link di setiap versi aplikasi.
- **Platform lain:** square untuk feed serbaguna; landscape untuk player lebar; vertical untuk Shorts. Selalu cek preview placement sebelum publish.

Tidak ada musik berhak cipta yang dibundel. Paket dapat dipahami saat mute. Jika perlu audio, pilih musik dari library platform dengan hak penggunaan yang sesuai akun/tujuan; lisensi audio satu platform tidak otomatis berlaku di platform lain. `captions-id.srt` berisi teks editorial bertiming, bukan transkrip narasi.

## Komposisi dan safe area

Konsep: satu companion menjadi fokus besar, judul Indonesia mudah dibaca di ponsel, perintah nyata di bawahnya, dan alamat repository sebagai CTA. Identitas warna mengikuti wireframe neon proyek; bukan logo platform, avatar sintetis, atau tampilan aplikasi palsu. Komposisi vertikal, feed, square dan landscape diatur ulang, bukan dipotong dari satu poster.

Untuk vertikal 1080×1920, area penting berada dalam x=90..900 dan y=230..1490. Margin kanan/bawah sengaja lebih besar untuk UI sosial. Ini margin konservatif proyek, bukan satu template safe zone resmi untuk semua aplikasi. Versi lite menskalakan komposisi dan margin yang sama. Panjang caption, sticker, perangkat dan perubahan UI tetap dapat menutupi konten, jadi cek preview upload.

## Provenance dan batas mutu

Sumber: `../demo.mp4`, rekaman preview mandiri 832×560, 18 detik, 10 fps, berasal dari ANSI PTY asli. Hero mengambil crop yang mencakup seluruh hewan, memperbesar dengan nearest-neighbour agar grid terminal tetap tajam, lalu mengomposisikannya dengan tipografi dan caption baru. Crop menghilangkan kontrol preview kecil; teks promosi bukan bagian UI terminal sumber.

Export 30 fps memakai pengulangan frame sumber, **bukan klaim bahwa animasi CLI direkam pada 30 fps**. Tidak ada motion interpolation, pixel-glow palsu, model-generated screenshot, atau klaim transparansi alpha. Native overlay OMP/Pi dan pilihan warna/gerak telah diuji di pekerjaan utama; paket ini menampilkan renderer mandiri.

## Riset ukuran

Diperiksa 2026-10-04:
- [Meta Reels creative guidance](https://www.facebook.com/business/ads/facebook-instagram-reels-ads): menekankan vertikal 9:16 dan pesan penting di safe zone. Ini panduan iklan; dipakai sebagai rujukan komposisi, bukan kontrak upload organik universal.
- [Instagram Reel size and aspect ratios](https://www.facebook.com/help/instagram/1038071743007909): halaman resmi teridentifikasi, tetapi body bantuan tidak tersedia melalui reader tanpa UI/login; tidak dipakai untuk mengklaim batas maksimum akun.
- [TikTok Auction In-Feed Ads](https://ads.tiktok.com/help/article/tiktok-auction-in-feed-ads?lang=id): indeks pencarian resmi mencantumkan vertikal 9:16, landscape 16:9 dan square 1:1. Reader langsung mengalami error sertifikat; tidak menonaktifkan validasi TLS. Rekomendasi produksi 1080p di atas bukan klaim batas upload organik.
- [About Threads](https://www.facebook.com/help/788669719351544): deskripsi resmi menyebut posting teks, foto dan video. 4:5/square di paket ini adalah pilihan layout feed, bukan rasio wajib Threads.
- [About status, WhatsApp](https://faq.whatsapp.com/454876960047011): halaman resmi teridentifikasi, tetapi body tidak tersedia di reader. Paket sengaja singkat; tidak mengklaim limit durasi/ukuran WhatsApp yang belum diverifikasi untuk akun/aplikasi pengguna.

## Render ulang

Media tooling saja, tidak menambah dependency runtime extension: Python 3, Pillow, FFmpeg/ffprobe, dan font DejaVu Sans/Sans Mono. Di Linux font biasanya ada di `/usr/share/fonts/truetype/dejavu/`. Gunakan `--font-dir` jika lokasi berbeda.

```bash
python3 scripts/render-social.py
python3 scripts/render-social.py --preset vertical
python3 scripts/render-social.py --verify-only
```

Dijalankan dari checkout; lokasi source/output dihitung relatif terhadap file script. Tidak ada API key, download aset, layanan render cloud, atau upload sosial. Source dan media lama tidak diubah. `manifest.json` memuat metadata aktual, hash source/output, safe area, hasil decode dan bounds teks. ZIP paket ada di `cli-neon-social-pack.zip`.

## Bukti pemeriksaan

- Kelima video diperiksa dengan ffprobe dan full decode FFmpeg (`-xerror`): 18 detik, 30 fps, H.264/yuv420p, pixel aspect 1:1, tanpa stream audio. Ukuran aktual dan SHA-256 ada di `manifest.json`.
- Crop diperiksa pada seluruh 180 frame sumber, untuk pixel terang pada area hewan y=70..470. Gabungan bounds hewan x=249..565, y=152..407 berada di dalam crop x=240..600, y=100..440.
- Seluruh bounds teks enam scene per format berada dalam safe area. Cover lima rasio dan empat carousel diperiksa dimensinya; hash cocok dengan manifest. ZIP lolos CRC dan memuat kelima video, cover, carousel, caption, SRT dan panduan.
- Grid enam scene video diperiksa secara visual untuk feed, square, landscape dan Status lite; video vertikal dan cover safe-area juga diperiksa. Hewan tidak terpotong dan label sesuai rekaman. CTA diperbesar setelah kritik keterbacaan.
- Kontras terhadap `#101419`: judul `#f3f5f7` 16.91:1, teks sekunder `#b4bec8` 9.81:1, aksen `#40e8ff` 12.50:1.

Gate desain/copy:
- **Hard Gate PASS:** bounds dan kontras terukur di atas; fitur dan hewan berasal dari aplikasi asli, tanpa statistik pengguna, testimonial, logo platform atau UI palsu. Elemen interaktif web tidak berlaku pada video/PNG.
- **Purpose Gate PASS:** latar gelap menyambung rekaman terminal, cyan mengikuti identitas proyek, sans bold membuat hook terbaca di ponsel, mono membedakan perintah nyata. Tidak ada efek glow/grid tambahan.
- **Liveliness PASS:** ENERGY 2 / RHYTHM 2 / MOTION 2; fokus satu hewan per scene, gerak asli spesies, hierarki judul/perintah, serta komposisi landscape yang memisahkan teks dan hewan.
- **Craftsmanship PASS:** render dijalankan, hasil diperiksa dan paket bisa diekstrak; CTA menunjuk repository proyek. Tidak ada klaim upload sosial sudah diuji. Preview akun/perangkat tetap diperlukan sebelum publish.
