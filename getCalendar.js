import axios from "axios";
import { parseStringPromise } from "xml2js";
import ical from "ical-generator";
import { DateTime } from "luxon";
import { writeFileSync } from "fs";

const feedUrl = "https://www.resistancemontreal.org/rss/events";

const calendar = ical({
  name: "Résistance Montréal",
  prodId: "//resistancemtl//rss-to-ical//EN",
  timezone: "America/Toronto", // Embeds VTIMEZONE component
});

async function main() {
  const { data: xml } = await axios.get(feedUrl);
  const parsed = await parseStringPromise(xml);
  const items = parsed.rss.channel[0].item;

  for (const [i, item] of items.entries()) {
    const title = item.title?.[0] || "Untitled Event";
    const description = item.description?.[0] || "";
    const firstLine = description.trim().split("\n")[0].trim();

    // Try to parse start time from the first line of the description
    let dt = DateTime.fromFormat(firstLine, "yyyy-MM-dd HH:mm:ss", {
      zone: "America/Toronto",
    });

    // Fallback to pubDate if parsing fails
    if (!dt.isValid) {
      const pub = item.pubDate?.[0];
      dt = DateTime.fromRFC2822(pub || "", { zone: "America/Toronto" });
    }

    const start = dt;
    const end = start.plus({ hours: 2 });

    calendar.createEvent({
      id: `resmtl-${i}`,
      start,
      end,
      summary: title,
      description,
      floating: false, // Ensures TZID is embedded on DTSTART/DTEND
    });
  }

  writeFileSync("docs/resistance-mtl.ics", calendar.toString());
  console.log(`✅ Generated calendar with ${calendar.events().length} events.`);
  console.log(`📁 Saved to: docs/resistance-mtl.ics`);
}

main().catch(console.error);
