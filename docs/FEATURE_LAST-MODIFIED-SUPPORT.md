# Last-Modified Date Support

## Overview

This document outlines ideas for implementing last-modified date support in the Site Snacker project. The goal is to make the script aware of the `lastmod` dates in sitemaps, allowing it to intelligently process only content that has been updated since the last run.

## Current State

Currently, the sitemap module extracts URLs from sitemaps but doesn't track or utilize the `lastmod` dates. This is a missed opportunity for optimization, as we could:

1. Only process URLs that have been updated since our last run
2. Prioritize processing of recently updated content
3. Provide better context about content freshness in the output

## Implementation Ideas

### 1. Date Tracking in Media Registry

We could extend the existing `media-registry.json` to include date information:

```json
{
  "version": "1.0",
  "lastUpdated": "2023-06-15T12:34:56Z",
  "entries": {
    "hash-abc123def456": {
      "type": "image",
      "path": "tmp/doc.sitecore.com/search/en/users/search-user-guide/attributes/uuid-xxxx.png",
      "content": "A screenshot showing the attributes configuration panel...",
      "metadata": {
        "originalUrl": "https://doc.sitecore.com/images/attributes.png",
        "altText": "Attributes configuration panel",
        "lastModified": "2025-03-03"  // From sitemap
      },
      "apiCost": 0.00015,
      "occurrences": [...]
    }
  }
}
```

### 2. URL Registry with Dates

We could create a separate `url-registry.json` file that tracks all processed URLs and their last modification dates:

```json
{
  "version": "1.0",
  "lastUpdated": "2023-06-15T12:34:56Z",
  "urls": {
    "https://doc.sitecore.com/search/en/users/search-user-guide/attributes.html": {
      "lastProcessed": "2023-06-15T12:34:56Z",
      "lastModified": "2025-03-03",
      "status": "success",
      "outputPath": "output/pages/doc.sitecore.com/search/en/users/search-user-guide/attributes.md"
    }
  }
}
```

### 3. Incremental Processing Logic

When processing a sitemap, we could:

1. Extract URLs and their `lastmod` dates from the sitemap
2. Check each URL against our registry
3. Skip URLs that haven't changed since our last processing
4. Process only URLs with newer `lastmod` dates
5. Update our registry with the new processing information

### 4. Date Preservation in Output

We could include the last modification date in the markdown output using a custom tag:

```markdown
<md_html-source>https://doc.sitecore.com/search/en/users/search-user-guide/attributes.html</md_html-source>
<md_html-title>Attributes - Sitecore Search User Guide</md_html-title>
<md_last-modified>2025-03-03</md_last-modified>

# Attributes

...
```

### 5. Smart Merging with Date Context

When merging files, we could:

1. Sort pages by their last modification date (newest first)
2. Include the last modification date in section headers
3. Add a "Last Updated" indicator in the merged output

## Benefits

1. **Efficiency**: Only process content that has actually changed
2. **Freshness**: Users can see when content was last updated
3. **Context**: Better understanding of content lifecycle
4. **Performance**: Reduced processing time for large sitemaps
5. **Cost Savings**: Fewer API calls for unchanged content

## Implementation Considerations

1. **Date Format Handling**: Sitemaps use various date formats (ISO 8601, W3C, etc.)
2. **Time Zone Issues**: Ensure consistent time zone handling
3. **Registry Maintenance**: Implement cleanup for old entries
4. **Error Recovery**: Handle cases where date comparison fails
5. **Backward Compatibility**: Ensure existing processed files still work

## User Experience

From a user perspective, this would mean:

1. Faster processing when rerunning the script
2. Clear indication of which content is new or updated
3. Ability to prioritize recent content
4. Better tracking of content freshness

## Next Steps

If interested in implementing this feature, we could:

1. Update the sitemap parser to extract and store `lastmod` dates
2. Create a URL registry structure
3. Implement date comparison logic
4. Add date information to the output markdown
5. Update the merger to handle date-based sorting

## Example Workflow

Here's how the enhanced workflow might look:

1. User runs `bun run snack https://example.com/sitemap.xml`
2. Script extracts URLs and `lastmod` dates from the sitemap
3. Script checks each URL against the URL registry
4. Script processes only URLs with newer `lastmod` dates
5. Script updates the URL registry with new processing information
6. Script merges the processed files, sorted by `lastmod` date
7. User sees a summary showing which URLs were processed and which were skipped

## Configuration Options

We could add the following configuration options to `site-snacker.config.yml`:

```yaml
sitemap:
  auto_merge: true
  parallel: false
  max_concurrent: 5
  incremental_processing: true  # Enable/disable incremental processing
  force_update: false  # Force processing of all URLs regardless of date
  date_format: "ISO8601"  # Specify date format for output
```

## Future Enhancements

1. **Date-based Filtering**: Allow users to specify a date range for processing
2. **Change Detection**: Implement more sophisticated change detection (e.g., content diff)
3. **Notification System**: Alert users when significant content changes are detected
4. **Version History**: Maintain a history of content versions over time
5. **Scheduled Processing**: Automatically run the script at regular intervals 