# Video.js Local Setup Guide

## Setup Instructions

1. Video.js is already installed as a dev dependency in your project. You can verify this in `package.json`.

2. The necessary files have been copied to your project:
   - JavaScript: `js/videojs/video.min.js`
   - CSS: `css/videojs/video-js.min.css`

3. The files are already included in your `index.html`:
   ```html
   <link rel="stylesheet" href="css/videojs/video-js.min.css">
   <script src="js/videojs/video.min.js"></script>
   ```

## How to Use Video.js

Add this HTML where you want the video player to appear:

```html
<video
    id="my-video"
    class="video-js"
    controls
    preload="auto"
    width="640"
    height="360"
    data-setup="{}"
>
    <source src="path/to/your/video.mp4" type="video/mp4">
    <p class="vjs-no-js">
        To view this video please enable JavaScript, and consider upgrading to a
        web browser that supports HTML5 video
    </p>
</video>
```

### Customization Options

You can customize the player by:

1. Changing dimensions:
   - Modify `width` and `height` attributes
   - Or use CSS: `.video-js { width: 100%; height: auto; }`

2. Adding options in `data-setup`:
   ```html
   data-setup='{
     "controls": true,
     "autoplay": false,
     "preload": "auto",
     "poster": "path/to/poster.jpg"
   }'
   ```

3. Styling with CSS:
   ```css
   .video-js {
     /* Your custom styles */
   }
   ```

## Troubleshooting

1. If the player doesn't appear:
   - Check browser console for errors
   - Verify file paths in HTML
   - Ensure video file exists and is accessible

2. If styles are missing:
   - Verify CSS file is loading (check Network tab in dev tools)
   - Check that `video-js` class is applied to video element

3. If video doesn't play:
   - Check video file format (MP4 is widely supported)
   - Verify video file path is correct
   - Check video file permissions

## Notes

- All Video.js files are served locally from your project
- No external CDN or internet connection required for the player itself
- Video files still need to be hosted on your server
- The player works offline as long as your local server is running 