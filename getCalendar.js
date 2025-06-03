const axios = require("axios");
const xml2js = require("xml2js");
const { DateTime } = require("luxon");
const { writeFileSync } = require("fs");
const { createEvents } = require("ics");

async function fetchAndConvert() {
  const url = "https://resistancemontreal.org/rss/events";

  try {
    const res = await axios.get(url);
    const parsed = await xml2js.parseStringPromise(res.data);
    const items = parsed.rss.channel[0].item;

    const events = items
      .map((item, index) => {
        const title = item.title?.[0] || "Untitled Event";
        const description = item.description?.[0] || "";

        const pubDate = DateTime.fromRFC2822(item.pubDate?.[0] || "", {
          zone: "America/Toronto",
        });

        if (!pubDate.isValid) return null;

        const start = [
          pubDate.year,
          pubDate.month,
          pubDate.day,
          pubDate.hour,
          pubDate.minute,
        ];

        return {
          title,
          description,
          start,
          duration: { hours: 2 },
          uid: `resmtl-${index}@resistancemontreal.org`,
        };
      })
      .filter(Boolean);

    const { error, value } = createEvents(events);

    if (error) {
      console.error("ICS creation error:", error);
    } else {
      writeFileSync("docs/resistance-mtl.ics", value);

      console.log("✅ Saved: resistance-mtl.ics");
    }
  } catch (err) {
    console.error("Failed to fetch or parse RSS:", err);
  }
}

fetchAndConvert();
