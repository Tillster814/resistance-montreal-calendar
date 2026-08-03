import axios from "axios";
import { writeFileSync } from "fs";

const feedUrl = "https://www.resistancemontreal.org/spip.php?page=agenda-ical";

function fixEndDates(ics) {
  const lines = ics.split("\n");

  let startDate = null;
  let startTime = null;

  return lines.map((line) => {
    if (line.startsWith("DTSTART")) {
      const match = line.match(/(\d{8})T(\d{6})/);

      if (match) {
        startDate = match[1];
        startTime = match[2];
      }

      return line;
    }

    if (line.startsWith("DTEND") && startDate) {
      const match = line.match(/(\d{8})T(\d{6})/);

      if (match) {
        const endDate = match[1];
        const endTime = match[2];

        const start = new Date(
          `${startDate.slice(0, 4)}-${startDate.slice(4, 6)}-${startDate.slice(6, 8)}`,
        );

        const end = new Date(
          `${endDate.slice(0, 4)}-${endDate.slice(4, 6)}-${endDate.slice(6, 8)}`,
        );

        const diffYears = Math.abs(end - start) / (1000 * 60 * 60 * 24 * 365);

        if (diffYears > 1) {
          console.log(`Fixed bad date: ${endDate} -> ${startDate}`);

          return line.replace(/\d{8}T\d{6}/, `${startDate}T${endTime}`);
        }
      }
    }

    return line;
  });
}

async function main() {
  const { data } = await axios.get(feedUrl);

  const fixedCalendar = fixEndDates(data);

  writeFileSync("docs/resistance-mtl.ics", fixedCalendar.join("\n"));

  console.log("✅ Calendar generated");
}

main().catch(console.error);
