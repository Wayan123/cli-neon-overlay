# Verifikasi dan kritik CLI Neon Spider

## Status

Locally implemented dan dipasang ke discovery OMP/Pi. Bukan publikasi/release eksternal. Session OMP yang sudah terbuka perlu restart; Pi dapat `/reload`. Tidak ada commit/push.

## Bukti yang diamati

- `npm test`: 7/7 tes renderer lulus setelah perbaikan lifecycle. Geometri, clipping, protected rows, sel unik, capacity, ASCII, koneksi kaki, determinisme, dan gerak bounded.
- OMP 18.5.0 serta Pi 1.0.0 diluncurkan sungguhan di PTY. Startup tanpa extension lain, tools, atau prompt model. Mode `auto` diuji melalui injeksi event `agent_start`/`agent_end`; ini bukan sesi inferensi model berbayar.
- `artifacts/native-smoke.json`: demo terlihat dan berubah antarframe, input editor utuh, mengetik menyembunyikan, `/model` menyembunyikan dan Escape memulihkan, 38×14 menyembunyikan, 100×30 memulihkan, demo berulang, expiry 17 detik, off bersih, reduced-motion mematikan. Semua assertion terakhir true.
- Pi `/reload`: overlay lama bersih; `/neon demo` setelah reload kembali terlihat. OMP teardown/restart event diuji melalui injeksi `session_shutdown` dan `session_start`; **hot reload extension OMP tidak diklaim**. `/reload`/`/reload-plugins` tidak membuktikan refresh extension dalam eksperimen awal.
- `artifacts/pi-mode-switch.json`: pada Pi dengan config terisolasi di `/tmp`, `/settings` → cari `TUI mode` → regular → Escape; demo terlihat, mengetik menyembunyikan, input tetap utuh, off bersih. Config pengguna tidak diubah.
- `artifacts/installed-entrypoints.json`: kedua file discovery terpasang dimuat eksplisit; demo, off, help, status berfungsi.
- `artifacts/headless-smoke.json`: kedua CLI pada RPC dengan stdin/stdout pipe merespons `get_state`; tidak ada ANSI animasi atau Braille.
- Preview mandiri dijalankan di PTY, ASCII toggle lalu q; exit 0, raw-mode kembali sama, alternate screen dipulihkan. Non-TTY ditolak dengan exit 1 tanpa ANSI stdout.

CLI smoke terakhir memakai `python3 /tmp/neon-final-smoke.py`, PTY 110×32 dan parser pyte 0.8.2 terisolasi; scaffold QA sementara dihapus setelah bukti disimpan. Skenario di atas menjelaskan langkah yang perlu diulang. Tidak ada check TypeScript compiler terpisah; TypeScript benar-benar dimuat oleh kedua harness.

## Cacat yang ditemukan dan diperbaiki

1. **Editor OMP tidak selalu di bawah layar.** Screenshot awal menunjukkan bentuk melintasi status/editor. Batas sekarang memakai posisi cursor dari `getDebugPaint()`, dengan gap dua baris; contoh akhir sel y=2..8 sementara editor berada lebih rendah.
2. **Kontrak immutability render OMP.** Mengubah array yang sama dapat membuat cache tidak melihat perubahan. Setiap perubahan glyph sekarang mengembalikan array baru.
3. **Reload Pi menangkap fokus Container sementara.** Instrumentasi membuktikan baseline `Container` berubah menjadi `CustomEditor` setelah reload. Capture sekarang hanya menerima komponen yang merender cursor marker dan mencoba lagi setelah editor pulih. Smoke gagal sebelum perbaikan, lulus sesudahnya.
4. **Pergantian mode TUI Pi kehilangan listener input langsung.** Review menelusuri renderer replacement. Listener sekarang memakai `ctx.ui.onTerminalInput`, yang dipindahkan oleh harness. Jalur `/settings` nyata lulus sesudah perbaikan.

Review kode independen terakhir: kedua temuan lifecycle ditangani; tidak ada temuan baru berbukti. Reviewer tidak menjalankan tes; bukti runtime berasal dari coordinator.

## Kritik terhadap referensi

**Tercapai:** motif delapan kaki dengan dua segmen, badan wireframe terhubung, cyan/magenta, joint terang, perpindahan serta rotasi, scan lokal, tampil di atas isi CLI tanpa panel persegi/jendela desktop.

**Sengaja lebih tenang:** siklus gait sekitar 5.7 detik; sapuan pendek hanya pada fase tertentu. Video memperlihatkan bar highlight dan streak diagonal yang lebih dramatis. Reviewer visual tidak menemukan koreksi wajib untuk adaptasi terminal ini; peningkatan amplitudo/asimetri kaki dan highlight adalah pilihan fidelity tambahan, bukan klaim sudah identik.

**Tidak direplikasi:** pixel glow, pembesaran teks latar, perspektif video, dan 60-fps detail. Font terminal/fallback menentukan bentuk titik Braille; ASCII tersedia. Tidak ada persentase kemiripan yang dibuat-buat.

**Tradeoff nyata:** sel bentuk menutupi teks sementara; OMP menahan commit scrollback selama native overlay terlihat. Mode auto, pause keyboard/dialog, serta off membatasi gangguan. Tidak diklaim alpha transparency/zero overhead.

## Delivery gate antislop (adaptasi CLI)

- Hard Gate PASS: seluruh command yang dikirim diuji di CLI nyata; off/idle/headless/reduced-motion dan pause/tiny states diamati. Tidak ada statistik, link aktif, identitas, atau konten penelitian palsu.
- Purpose Gate PASS: cyan/magenta, articulated spider, dan scan berasal dari video referensi; bukan spinner/gradient/card generik. Tidak ada asset avatar/logo baru.
- Liveliness PASS: ENERGY 3 / RHYTHM 2 / MOTION 3 dibatasi pada motif kecil; delapan kaki, perubahan frame, gerak dan whitespace terlindung terlihat.
- Craftsmanship PASS untuk permukaan yang dikirim: native OMP/Pi, keyboard, dialog, resize, off, glyph, lifecycle Pi, dan mode switch diuji. Teks notifikasi memakai theme harness; warna neon hanya dekoratif dan tidak menyampaikan status sendirian.

Screenshot PNG adalah rekonstruksi **output ANSI PTY asli**, memakai fallback font untuk Braille; bukan screenshot pixel Windows Terminal. Tidak ada verifikasi visual emulator Windows, SSH/tmux, atau Tern native protocol. Pada backend tanpa posisi editor aman/dukungan overlay yang diperlukan, efek berhenti/hide alih-alih mengambil alih terminal.
