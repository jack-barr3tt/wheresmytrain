# WheresMyTrain

Use the [Realtime Trains API](https://www.realtimetrains.co.uk/) from your Discord server!

# 👌 Features

## 📝 Text Commands

- `,t <station> <station>` - Get the next 5 trains between two stations using their [CRS codes](https://www.rail-record.co.uk/railway-location-codes)
- `,a <station>` - Get the next 5 departures from a station using its [CRS code](https://www.rail-record.co.uk/railway-location-codes)

## ✨ Slash Commands

- `/between <station> <station>` - Get the next 5 trains between two stations.
- `/at <station>` - Get the next 5 departures from a station.

All station fields have autocomplete, so you can use the station name or the CRS code - whatever you prefer!

# 💾 Setup Guide

1. Clone this repository
2. Install dependencies using `npm i` or `yarn`
3. Rename `.env.template` to `.env` and fill in the required fields as described in the comments
4. **Optional:** If you want to see train operators shown as emojis, create a `toc_emojis.json` file in the root directory. This file should be a JSON object where the keys are the TOC codes and the values are the Discord emoji strings. For example:

```json
{
  "SW": "<:south_western_railway:123456789012345678>"
}
```

5. Use `npm run start` or `yarn start` to start the bot!
