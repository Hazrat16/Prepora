# Before deploying or sharing this app

Read this before putting the app online, giving anyone a copy, or sharing its database.

## LiveMCQ past-paper content

Past-paper questions in `content/archive/papers/` were taken from LiveMCQ's public
PDFs for private study on the owner's laptop, without LiveMCQ's permission. Every PDF
page warns that using its content by any means without permission is a punishable
offence. The owner saw that warning and decided on 2026-10-31 to use it locally only.

Before any deployment or sharing:

1. Disclose this to everyone involved in the release.
2. Get written permission from LiveMCQ, or remove every paper with
   `"source_name": "Live MCQ"` from the files and the database.
3. Do not ship a database dump or backup that still contains those questions.

Each imported question keeps its source. Do not remove or reword sources to hide
where a question came from.

## Satt Academy

Its terms forbid building on its content. Nothing from it is imported. The source
register holds only paper names, dates, listed marks and links.
