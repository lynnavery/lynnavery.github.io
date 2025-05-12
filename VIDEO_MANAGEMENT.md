# Video Management with Git LFS

This document explains how to manage videos in this repository using Git LFS with our custom HTTP server setup.

## Current Setup

- Videos are hosted at: `http://ephemera.steropes.feralhosting.com/video/`
- Git LFS is configured to use this server as the storage backend
- All `.mp4` files are tracked by Git LFS (configured in `.gitattributes`)

## Adding New Videos

1. **Upload the video file** to the server:
   - Upload your video to `http://ephemera.steropes.feralhosting.com/video/`
   - You can use any FTP client or the server's file manager
   - Recommended to organize videos in subdirectories (e.g., `video/event-date/`)

2. **Add the video to Git LFS**:
   ```bash
   # Add the video file to Git
   git add path/to/your/video.mp4
   
   # Verify it's being tracked by Git LFS
   git lfs ls-files
   ```

3. **Commit the changes**:
   ```bash
   git commit -m "Add new video: [video name]"
   ```

## Best Practices

1. **File Organization**:
   - Keep videos organized in subdirectories by event or date
   - Use consistent naming conventions
   - Example: `video/YYYY-MM-DD/artist-name.mp4`

2. **Video Optimization**:
   - Compress videos before uploading to save bandwidth
   - Consider using formats like H.264 for maximum compatibility
   - Recommended maximum file size: 100MB per video

3. **Git LFS Commands**:
   ```bash
   # Check which files are tracked by Git LFS
   git lfs ls-files
   
   # Check Git LFS status
   git lfs status
   
   # Pull latest LFS files
   git lfs pull
   ```

## Troubleshooting

If you encounter issues:

1. **Verify Git LFS Configuration**:
   ```bash
   git config --get-regexp lfs
   ```
   Should show the LFS URL pointing to our server.

2. **Check File Tracking**:
   ```bash
   git lfs ls-files
   ```
   Should list all tracked video files.

3. **Reset Git LFS Cache** (if needed):
   ```bash
   git lfs prune
   git lfs fetch --all
   ```

## Server Information

- Current server: `http://ephemera.steropes.feralhosting.com/video/`
- Videos are served via HTTP
- No authentication required for video access
- Bandwidth is served from the existing server

## Adding Videos to HTML

When adding videos to HTML files, use the relative path in your repository:

```html
<video controls>
    <source src="../video/event-date/video-name.mp4" type="video/mp4">
</video>
```

The actual file will be served from the server while maintaining the correct relative path in the repository. 