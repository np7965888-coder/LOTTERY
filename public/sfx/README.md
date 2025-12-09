# 抽獎系統音效檔案

請將以下音效檔案放置在此目錄 (`public/sfx/`) 中：

## 必要音效檔案

### 1. spinning.mp3
- **用途**：滾輪轉動音效
- **特性**：循環播放
- **時機**：單次抽獎時名字滾動期間
- **建議**：機械轉動聲、快速滾動音效、類似老虎機音效
- **音量**：0.6（60%）

### 2. win.mp3
- **用途**：中獎音效
- **特性**：播放一次
- **時機**：抽中中獎者時
- **建議**：慶祝音效、勝利號角、歡呼聲
- **音量**：0.8（80%）

### 3. confetti.mp3
- **用途**：煙火彩帶音效
- **特性**：播放一次
- **時機**：顯示中獎者同時播放（配合煙火動畫）
- **建議**：煙火爆炸聲、派對音效、慶祝音樂
- **音量**：0.7（70%）

### 4. drumroll.mp3 （選用）
- **用途**：鼓聲音效
- **特性**：播放一次
- **時機**：抽獎前緊張時刻（目前未啟用，可自行在程式碼中加入）
- **建議**：鼓聲滾奏、緊張配樂
- **音量**：0.5（50%）

## 音效播放順序

### 單次抽獎流程：
1. **點擊開始抽獎**
2. → `spinning.mp3` 開始循環播放（滾輪轉動）
3. → 名字快速滾動顯示
4. → 滾輪減速並停止
5. → `spinning.mp3` 停止
6. → 同時播放 `win.mp3` + `confetti.mp3`（中獎音效 + 煙火音效）
7. → 顯示煙火彩帶動畫

### 批次抽獎流程：
1. **點擊批次抽獎**
2. → 直接顯示中獎名單
3. → 同時播放 `win.mp3` + `confetti.mp3`
4. → 顯示煙火彩帶動畫

## 音效檔案格式建議

- **格式**：MP3（推薦）或 WAV
- **品質**：128-320 kbps
- **長度**：
  - spinning.mp3: 2-3 秒（會循環播放）
  - win.mp3: 2-5 秒
  - confetti.mp3: 2-5 秒
  - drumroll.mp3: 3-5 秒

## 取得音效檔案來源

### 免費音效網站：
1. **Freesound** - https://freesound.org/
2. **Zapsplat** - https://www.zapsplat.com/
3. **Mixkit** - https://mixkit.co/free-sound-effects/
4. **Pixabay** - https://pixabay.com/sound-effects/
5. **YouTube Audio Library** - https://www.youtube.com/audiolibrary

### 搜尋關鍵字建議：
- spinning: "slot machine", "wheel spin", "rolling", "mechanical spin"
- win: "win sound", "victory", "fanfare", "celebration", "tada"
- confetti: "fireworks", "party popper", "celebration", "confetti"
- drumroll: "drum roll", "suspense", "tension"

## 注意事項

1. **版權**：請確保使用的音效檔案具有合法使用權限
2. **檔案大小**：建議每個檔案不超過 1MB，以加快載入速度
3. **測試**：上傳音效後請測試音量是否適中
4. **瀏覽器支援**：現代瀏覽器都支援 MP3 格式
5. **靜音處理**：如果音效檔案不存在，系統會靜默失敗，不影響抽獎功能

## 自訂音量

如需調整音量，請修改 `src/components/DrawScreen.jsx` 中的 `loadAudio` 函數：

```javascript
audioRef.current.spinning.volume = 0.6;  // 調整為 0.0 ~ 1.0
audioRef.current.win.volume = 0.8;
audioRef.current.confetti.volume = 0.7;
audioRef.current.drumroll.volume = 0.5;
```

## 停用音效

如果不需要某個音效，只需不放置該音效檔案即可，系統會自動略過。
