import axios from "axios";
import { parseStringPromise } from "xml2js";
import ical from "ical-generator";
import { DateTime } from "luxon";
import { writeFileSync } from "fs";

const feedUrl = "https://www.resistancemontreal.org/rss/events";

const calendar = ical({
  name: "Résistance Montréal",
  prodId: "//resistancemtl//rss-to-ical//EN",
  timezone: "America/Toronto",
});

function extractInstagram(description) {
  const match = description.match(/@([\w.]+)\s+sur\s+instagram/i);
  return match ? `https://instagram.com/${match[1]}` : null;
}

async function main() {
  const { data: xml } = await axios.get(feedUrl);
  const parsed = await parseStringPromise(xml);
  const items = parsed.rss.channel[0].item;

  for (const [i, item] of items.entries()) {
    const title = item.title?.[0] || "Untitled Event";
    const rawDescription = item.description?.[0] || "";

    // Clean and break into lines
    const lines = rawDescription
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const rawTime = lines[0] ?? "";
    const locationLine = lines[1] ?? "";
    const urlLine = lines[2]?.startsWith("http") ? lines[2] : "";
    const rest = lines
      .slice(urlLine ? 3 : 2)
      .join("\n")
      .trim();

    const instagramUrl = extractInstagram(rawDescription);

    // Attempt to parse datetime
    let dt = DateTime.fromFormat(rawTime, "yyyy-MM-dd HH:mm:ss", {
      zone: "America/Toronto",
    });
    if (!dt.isValid) {
      dt = DateTime.fromRFC2822(item.pubDate?.[0] ?? "", {
        zone: "America/Toronto",
      });
    }

    const start = dt.setZone("America/Toronto");
    const end = start.plus({ hours: 2 });

    // Construct the full description (with time + optional Instagram)
    const descriptionParts = [
      rawTime,
      locationLine,
      urlLine,
      rest,
      instagramUrl,
    ].filter(Boolean);

    const finalDescription = descriptionParts.join("\n\n");

    calendar.createEvent({
      id: `resmtl-${i}`,
      start: start.toJSDate(),
      end: end.toJSDate(),
      summary: title,
      description: finalDescription,
      location: locationLine,
      url: urlLine,
      timezone: "America/Toronto",
      floating: false,
    });
  }

  writeFileSync("docs/resistance-mtl.ics", calendar.toString());
  console.log(`✅ Generated calendar with ${calendar.events().length} events.`);
  console.log(`📁 Saved to: docs/resistance-mtl.ics`);
}

main().catch(console.error);
