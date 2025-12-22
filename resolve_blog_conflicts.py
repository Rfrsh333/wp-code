#!/usr/bin/env python3
"""
Resolve blogArticles.ts conflicts by keeping our changes (theirs version)
which includes:
- Updated blog images
- Removed "kosten-uitzendkracht-horeca-tarieven" from relatedSlugs
- Keep datePublished field from HEAD where present
"""

def resolve_blog_conflicts():
    file_path = '/Users/rachid/toptalent-wordpress-html/src/data/blogArticles.ts'

    with open(file_path, 'r') as f:
        content = f.read()

    lines = content.split('\n')
    resolved_lines = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # Check if we hit a conflict marker
        if line.startswith('<<<<<<< HEAD'):
            # Find the middle and end markers
            middle_idx = None
            end_idx = None

            for j in range(i + 1, len(lines)):
                if lines[j].startswith('======='):
                    middle_idx = j
                elif lines[j].startswith('>>>>>>> '):
                    end_idx = j
                    break

            if middle_idx and end_idx:
                # Extract both versions
                head_lines = lines[i+1:middle_idx]
                theirs_lines = lines[middle_idx+1:end_idx]

                # Check if this conflict involves datePublished
                has_date_published = any('datePublished' in l for l in head_lines)

                if has_date_published:
                    # Keep datePublished from HEAD, but use theirs for image and relatedSlugs
                    date_published_line = None
                    for l in head_lines:
                        if 'datePublished' in l:
                            date_published_line = l
                            break

                    # Add datePublished if found
                    if date_published_line:
                        resolved_lines.append(date_published_line)

                    # Add the theirs version (updated image and relatedSlugs)
                    resolved_lines.extend(theirs_lines)
                else:
                    # For conflicts without datePublished, just use theirs
                    resolved_lines.extend(theirs_lines)

                # Skip to after the conflict
                i = end_idx + 1
                continue

        # Not in a conflict, add the line as-is
        resolved_lines.append(line)
        i += 1

    # Write the resolved content
    with open(file_path, 'w') as f:
        f.write('\n'.join(resolved_lines))

    print("✓ Resolved blogArticles.ts conflicts")

if __name__ == '__main__':
    resolve_blog_conflicts()
