#!/usr/bin/env python3
import json
import os
from pathlib import Path
from datetime import datetime

def date_to_filename(date_str):
    # Convert date string like "Friday May 9, 2025" or "Friday, May 9, 2025" to filename like "2025-05-09"
    try:
        # Try format with comma after day name
        date_obj = datetime.strptime(date_str, "%A, %B %d, %Y")
        return date_obj.strftime("%Y-%m-%d")
    except ValueError:
        try:
            # Try format without comma after day name
            date_obj = datetime.strptime(date_str, "%A %B %d, %Y")
            return date_obj.strftime("%Y-%m-%d")
        except ValueError:
            try:
                # Try format without comma after day name and year
                date_obj = datetime.strptime(date_str, "%A %B %d %Y")
                return date_obj.strftime("%Y-%m-%d")
            except ValueError:
                print(f"Warning: Could not parse date '{date_str}'. Using original string as filename.")
                # Clean up the string to make a valid filename
                return date_str.lower().replace(",", "").replace(" ", "-")

def generate_event_page(json_file, all_events_data):
    # Read the template
    with open('events/template.html', 'r') as f:
        template = f.read()
    
    # Read the JSON data
    with open(json_file, 'r') as f:
        event_data = json.load(f)
    
    # Update hasPassed based on the event date
    try:
        event_date = datetime.strptime(event_data['date'], "%A %B %d, %Y")
        current_date = datetime.now()
        # Compare dates without time component
        event_date = event_date.replace(hour=0, minute=0, second=0, microsecond=0)
        current_date = current_date.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Set hasPassed to true only if the event date is strictly before current date
        event_data['hasPassed'] = event_date < current_date
        
        # Write the updated JSON back to the file
        with open(json_file, 'w') as f:
            json.dump(event_data, f, indent=4)
            f.write('\n')  # Add newline at end of file
    except ValueError:
        print(f"Warning: Could not parse date for event: {event_data['date']}")
    
    # Find all future events (excluding current event)
    current_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    upcoming_events = []
    for other_event in all_events_data:
        try:
            other_date = datetime.strptime(other_event['date'], "%A %B %d, %Y")
            other_date = other_date.replace(hour=0, minute=0, second=0, microsecond=0)
            # Include event if it's in the future and not the current event
            if other_date >= current_date and other_event['date'] != event_data['date']:
                upcoming_events.append(other_event)
        except ValueError:
            continue
    
    # Sort upcoming events by date
    upcoming_events.sort(key=lambda x: datetime.strptime(x['date'], "%A %B %d, %Y"))
    
    # Add upcoming events to the event data
    event_data['upcoming_events'] = upcoming_events
    
    # Replace the placeholder with actual JSON data
    html_content = template.replace('EVENT_DATA_PLACEHOLDER', json.dumps(event_data))
    
    # Generate the output filename using the event date
    date_filename = date_to_filename(event_data['date'])
    output_file = f'events/{date_filename}.html'
    
    # Write the generated HTML
    with open(output_file, 'w') as f:
        f.write(html_content)
    
    print(f'Generated {output_file}')
    return event_data

def parse_date(date_str):
    """Helper function to parse dates in various formats"""
    try:
        return datetime.strptime(date_str, "%A, %B %d, %Y")
    except ValueError:
        try:
            return datetime.strptime(date_str, "%A %B %d, %Y")
        except ValueError:
            return datetime.strptime(date_str, "%A %B %d %Y")

def update_main_page(events_data):
    # Read the main page template
    with open('index.html', 'r') as f:
        main_page = f.read()
    
    # Sort events by date
    upcoming_events = []
    past_events = []
    current_date = datetime.now()
    
    for event in events_data:
        try:
            event_date = parse_date(event['date'])
            # Compare dates without time component
            event_date = event_date.replace(hour=0, minute=0, second=0, microsecond=0)
            current_date = current_date.replace(hour=0, minute=0, second=0, microsecond=0)
            
            if event_date >= current_date:  # Include today's events
                upcoming_events.append(event)
            else:
                past_events.append(event)
        except ValueError as e:
            print(f"Warning: Could not parse date for event: {event['date']} - {str(e)}")
            # Skip events with invalid dates
            continue
    
    # Sort events using the parse_date helper
    upcoming_events.sort(key=lambda x: parse_date(x['date']))
    past_events.sort(key=lambda x: parse_date(x['date']), reverse=True)
    
    # Generate upcoming events HTML
    upcoming_html = '<h1>Upcoming Events</h1>\n<ul>\n'
    for event in upcoming_events:
        date_filename = date_to_filename(event['date'])
        date_parts = event['date'].split(',')[0].split(' ')
        if len(date_parts) >= 3:
            date_short = date_parts[-2:]
            date_display = f"{date_short[0]} {date_short[1]}"
        else:
            date_display = event['date']
        artists = ', '.join(artist['name'] for artist in event['artists'])
        venue = event['venue']['name']
        upcoming_html += f'    <li><a href="events/{date_filename}.html"><button><i>{date_display}</i> {artists}<br>@ {venue}</button></a></li>\n'
    upcoming_html += '    <li><i>More tba</i></li>\n</ul>'
    
    # Generate past events HTML
    past_html = '<h1>Past Events</h1>\n<ul>\n'
    for event in past_events:
        date_filename = date_to_filename(event['date'])
        date_parts = event['date'].split(',')[0].split(' ')
        if len(date_parts) >= 3:
            date_short = date_parts[-2:]
            date_display = f"{date_short[0]} {date_short[1]}"
        else:
            date_display = event['date']
        artists = ', '.join(artist['name'] for artist in event['artists'])
        venue = event['venue']['name']
        past_html += f'    <li><a href="events/{date_filename}.html"><button><i>{date_display}</i> {artists}<br>@ {venue}</button></a></li>\n'
    past_html += '</ul>'
    
    # Replace the sections in the main page
    # Find the upcoming events section
    upcoming_start = main_page.find('<h1>Upcoming Events</h1>')
    upcoming_end = main_page.find('</ul>', upcoming_start) + 5
    
    # Find the past events section
    past_start = main_page.find('<h1>Past Events</h1>')
    past_end = main_page.find('</ul>', past_start) + 5
    
    # Replace the sections
    new_main_page = (
        main_page[:upcoming_start] +
        upcoming_html +
        main_page[upcoming_end:past_start] +
        past_html +
        main_page[past_end:]
    )
    
    # Write the updated main page
    with open('index.html', 'w') as f:
        f.write(new_main_page)
    
    print('Updated main page with current events')

def is_valid_2025_date(date_str):
    """Return True if the date is valid and in 2025, else False."""
    for fmt in ["%A, %B %d, %Y", "%A %B %d, %Y", "%A %B %d %Y"]:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.year == 2025
        except Exception:
            continue
    return False

def main():
    # Get all JSON files in the events directory
    json_files = list(Path('events').glob('*.json'))
    
    # First pass: collect all event data
    all_events_data = []
    for json_file in json_files:
        with open(json_file, 'r') as f:
            event_data = json.load(f)
            if is_valid_2025_date(event_data.get('date', '')):
                all_events_data.append(event_data)
            else:
                print(f"Skipping {json_file}: invalid or non-2025 date '{event_data.get('date', '')}'")
    
    # Second pass: generate HTML for each JSON file with full event data
    for json_file in json_files:
        with open(json_file, 'r') as f:
            event_data = json.load(f)
            if is_valid_2025_date(event_data.get('date', '')):
                generate_event_page(json_file, all_events_data)
            else:
                print(f"Skipping HTML generation for {json_file}: invalid or non-2025 date '{event_data.get('date', '')}'")
    
    # Update the main page with current events
    update_main_page(all_events_data)

if __name__ == '__main__':
    main() 