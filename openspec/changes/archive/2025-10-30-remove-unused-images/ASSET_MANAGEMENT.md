# Asset Management Guide

## Image Usage Documentation

This document serves as a reference for managing images in the `public/textimage/` directory.

### Current Active Images (as of 2025-10-30)

The following images are actively used in `public/index.html`:

| Image File | Size | Usage Location | Description |
|------------|------|----------------|-------------|
| `questions1.png` | 56KB | Line 86 | Warning banner icon |
| `step0.png` | 22KB | Line 97 | Initial warning screenshot |
| `step1.PNG` | 122KB | Line 105 | Step 1 - Account logout |
| `step2.PNG` | 147KB | Line 113 | Step 2 - Login process |
| `backselfaccount.png` | 764KB | Line 150 | Step 3 - Return to own account |
| `delete.png` | 159KB | Line 163 | Step 4 - Delete app for update |

**Total size:** 1.2MB

### Maintenance Process

When adding new images:
1. **Verify usage:** Ensure all images are referenced in HTML files
2. **Documentation:** Update this file with new image details
3. **Validation:** Test that all images load correctly

When removing images:
1. **Check references:** Use `rg -n "textimage/" *.html` to verify no active references
2. **Consider comments:** Check for commented-out references that might be re-enabled
3. **Test thoroughly:** Verify website functionality after removal

### Automated Checks

Consider implementing these checks in the future:
- **CI/CD integration:** Add automated checks for unused assets
- **Size monitoring:** Alert when asset directory grows beyond expected size
- **Reference validation:** Automated script to detect orphaned images

### Cleanup History

- **2025-10-30:** Removed 10 unused images (~34MB) via `remove-unused-images` proposal
  - Removed: `video.mp4`, `downloadapp.gif`, `keepdata.png`, `tuichuy.png`, `questions.png`, `new.png`, `oldsystem1.png`, `old.png`, `ipright.png`, `image.png`
  - Reason: Not referenced in any active code (some were commented out)

### Commands for Reference

```bash
# Find all image references
rg -n "textimage/" *.html

# Check file sizes
du -h public/textimage/* | sort -hr

# Total directory size
du -sh public/textimage/
```

## Best Practices

1. **Regular cleanup:** Review image usage quarterly
2. **Documentation first:** Update this document when making changes
3. **Test thoroughly:** Always validate functionality after changes
4. **Version control:** Commit cleanup changes separately from feature work