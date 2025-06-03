import axios from "axios";
import { parseStringPromise } from "xml2js";
import ical from "ical-generator";
import { DateTime } from "luxon";
import { writeFileSync } from "fs";

const feedUrl = "https://www.resistancemontreal.org/rss/events";
const calendar = ical({
  name: "Résistance Montréal",
  timezone: "America/Toronto", // This embeds VTIMEZONE
  prodId: "//resistancemtl//rss-to-ical//EN",
});

async function main() {
  const { data: xml } = await axios.get(feedUrl);
  const parsed = await parseStringPromise(xml);

  const items = parsed.rss.channel[0].item;

  for (const [i, item] of items.entries()) {
    const title = item.title?.[0] || "Untitled Event";
    const description = item.description?.[0] || "";
    const rawDate = item.pubDate?.[0];

    if (!rawDate) continue;

    const dt = DateTime.fromRFC2822(rawDate, { zone: "America/Toronto" });

    if (!dt.isValid) continue;

    calendar.createEvent({
      id: `resmtl-${i}`,
      start: dt,
      end: dt.plus({ hours: 2 }),
      summary: title,
      description,
      timezone: "America/Toronto",
    });
  }

  writeFileSync("docs/resistance-mtl.ics", calendar.toString());
  console.log(`✅ Generated calendar with ${calendar.events().length} events.`);
  console.log(`📁 Saved to: docs/resistance-mtl.ics`);
}

main().catch(console.error);
