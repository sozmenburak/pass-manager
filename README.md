# Pass Manager

Windows ve macOS’te çalışan, tamamen **offline** şifre yöneticisi. Sistem tepsisinde (tray) çalışır; global kısayollarla anında açılır, fare imlecinin yanında küçük arama penceresi gösterir. Veriler bilgisayarınızda şifreli saklanır (Windows DPAPI / macOS Keychain).

---

## Gereksinimler

- [Node.js](https://nodejs.org/) (LTS önerilir)

## Kurulum

```bash
git clone https://github.com/sozmenburak/pass-manager.git
cd pass-manager
npm install
npm start
```

Uygulama arka planda ve sistem tepsisinde çalışır. Kapatmak için tray ikonuna sağ tıklayıp **Çıkış** seçin.

## Kullanım

| İşlem | Windows | macOS |
|-------|---------|--------|
| Şifre listesini aç | `Ctrl+Alt+J` | `Cmd+Alt+J` |
| Şifre kaydet | `Ctrl+Alt+Y` | `Cmd+Alt+Y` |

- **Aç**: Kısayola basınca fare imlecinin yanında arama penceresi açılır. Yazınca şifreler arasında arama yapılır; bir şifreye tıklayınca panoya kopyalanır.
- **Kaydet**: Metni seçip kısayola basın; ad verip kaydedin. Şifre güvenli depoya eklenir.
- **Ayarlar**: Tray menüsü → **Ayarlar** ile kısayolları değiştirebilirsiniz.

## Windows / macOS kurulum dosyası

**Windows (exe):**
```bash
npm run build:win
```
- `dist/Pass Manager Setup 1.0.0.exe` — Kurulum sihirbazı  
- `dist/Pass Manager 1.0.0.exe` — Taşınabilir (kurulumsuz)

**macOS (dmg):**
```bash
npm run build:mac
```

## Lisans

MIT
