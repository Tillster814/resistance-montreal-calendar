import axios from "axios";
import { writeFileSync } from "fs";

const feedUrl = "https://www.resistancemontreal.org/spip.php?page=agenda-ical";

async function fetchCalendar(url, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; Resistance-MTL-Calendar-Bot/1.0)",
        },
      });

      return response.data;
    } catch (err) {
      console.log(`Attempt ${i}/${attempts} failed`);

      if (i === attempts) throw err;

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

function fixTimezone(ics) {
  return ics.replace(
    "X-WR-TIMEZONE:Europe/Paris",
    "X-WR-TIMEZONE:America/Toronto",
  );
}

function addOneHour(dateTime) {
  const isUTC = dateTime.endsWith("Z");

  let value = dateTime.replace("Z", "");

  let year = Number(value.substring(0, 4));
  let month = Number(value.substring(4, 6));
  let day = Number(value.substring(6, 8));
  let hour = Number(value.substring(9, 11));
  const minute = value.substring(11, 13);
  const second = value.substring(13, 15);

  hour += 1;

  if (hour === 24) {
    hour = 0;

    const date = new Date(Date.UTC(year, month - 1, day));

    date.setUTCDate(date.getUTCDate() + 1);

    year = date.getUTCFullYear();
    month = date.getUTCMonth() + 1;
    day = date.getUTCDate();
  }

  return (
    `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}` +
    `T${String(hour).padStart(2, "0")}${minute}${second}` +
    (isUTC ? "Z" : "")
  );
}

function fixEndDates(ics) {
  const lines = ics.split("\n");

  let startValue = null;

  return lines
    .map((line) => {
      if (line.startsWith("DTSTART")) {
        startValue = line.split(":")[1];
        return line;
      }

      if (line.startsWith("DTEND") && startValue) {
        const endValue = line.split(":")[1];

        if (!endValue) return line;

        const startHasTime = startValue.includes("T");

        //
        // Fake 2100 Christmas fallback
        //
        if (endValue.startsWith("21001225")) {
          // All day event
          if (!startHasTime) {
            console.log(
              `Fixing all-day fake end: ${endValue} -> ${startValue}`,
            );

            return `DTEND;VALUE=DATE:${startValue}`;
          }

          // Timed event, keep the original end time
          const fixedEnd =
            startValue.substring(0, 8) + "T" + endValue.substring(9);

          console.log(`Fixing fake end: ${endValue} -> ${fixedEnd}`);

          return `DTEND:${fixedEnd}`;
        }

        //
        // Same start and end
        //
        if (startValue === endValue) {
          // Timed event: assume one hour
          if (startHasTime) {
            const fixedEnd = addOneHour(startValue);

            console.log(`Fixing zero-length event: ${endValue} -> ${fixedEnd}`);

            return `DTEND:${fixedEnd}`;
          }

          // All-day event
          console.log(`Fixing same-day all-day event: ${endValue}`);

          return `DTEND;VALUE=DATE:${startValue}`;
        }
      }

      return line;
    })
    .join("\n");
}

async function main() {
  const data = await fetchCalendar(feedUrl);

  // Save original source
  writeFileSync("docs/resistance-mtl-untouched.ics", data);

  console.log("📁 Saved untouched ICS file");

  let fixedCalendar = data;

  fixedCalendar = fixEndDates(fixedCalendar);

  writeFileSync("docs/resistance-mtl.ics", fixedCalendar);

  console.log("✅ Calendar generated");
}

main().catch(console.error);
