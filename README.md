# Please Call to Book - Event Management System

This is a simple system for managing event pages on the Please Call to Book website. It uses JSON files to store event data and a template system to generate HTML pages.

## How It Works

Each event is stored as a JSON file in the `events/` directory, named after the event date (e.g., `2025-05-09.json`). The system uses a template (`events/template.html`) to generate HTML pages from these JSON files. This makes it easy to maintain consistent layouts while updating event information.

## Managing Events

### Creating a New Event

1. Create a new JSON file named with the event date (e.g., `2025-05-09.json`)
   - You can copy an existing JSON file as a template
   - The filename should be in the format `YYYY-MM-DD.json`
2. Edit the JSON with the new event details
3. Run `python3 generate_events.py` to generate the HTML

### Updating an Event

1. Edit the corresponding JSON file in the `events/` directory
2. Run `python3 generate_events.py` to regenerate the HTML

### Archiving an Event

1. Set `"hasPassed": true` in the event's JSON file
2. Add video URLs to the `videos` array
3. Run `python3 generate_events.py`

## JSON Structure

Here's an example of an upcoming event:

```json
{
    "date": "Friday May 9, 2025",
    "hasPassed": false,
    "artists": [
        {
            "name": "Artist Name",
            "link": "https://artist-link.com",
            "description": "Artist description"
        }
    ],
    "venue": {
        "name": "Venue Name",
        "link": "https://venue-link.com",
        "address": "Venue address"
    },
    "time": "7pm - 10pm",
    "price": "$20, your support goes to a touring artist",
    "ticketLink": "https://ticket-link.com",
    "image": "../img/event-image.png",
    "upcomingEvents": [
        {
            "date": "May 11",
            "title": "Event Title",
            "venue": "Venue Name",
            "link": "../events/2025-05-11.html"
        }
    ]
}
```

For archived events, add a `videos` array:

```json
{
    "date": "Sunday May 11, 2025",
    "hasPassed": true,
    "videos": [
        {
            "url": "https://example.com/video1.mp4"
        },
        {
            "url": "https://example.com/video2.mp4"
        }
    ]
}
```

## Required Fields

- `date`: Event date (e.g., "Friday May 9, 2025")
- `hasPassed`: Boolean indicating if the event has occurred
- `artists`: Array of artist objects (name, link, description)
- `venue`: Object containing venue details (name, link, address)
- `time`: Event time
- `price`: Ticket price information

## Optional Fields

- `ticketLink`: Link to ticket sales (only shown for upcoming events)
- `image`: Path to event image (for upcoming events)
- `videos`: Array of video objects (for archived events)
- `upcomingEvents`: Array of upcoming event previews

## File Naming

- JSON files should be named using the event date in the format `YYYY-MM-DD.json`
  - Example: `2025-05-09.json` for May 9, 2025
- The generator will automatically create corresponding HTML files with the same date-based naming
  - Example: `2025-05-09.html`

## Generating Pages

To generate or update all event pages:

```bash
python3 generate_events.py
```

This will:
1. Read all JSON files in the `events/` directory
2. Generate corresponding HTML files using the template
3. Place the generated files in the `events/` directory with date-based names

## File Structure

```
.
├── README.md
├── generate_events.py
├── events/
│   ├── template.html
│   ├── 2025-05-09.json
│   ├── 2025-05-09.html
│   ├── 2025-05-11.json
│   └── 2025-05-11.html
├── css/
│   ├── videojs/
│   └── videojs-custom.css
└── img/
    └── event-images/
```
