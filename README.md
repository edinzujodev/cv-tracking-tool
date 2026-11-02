# CV Tracking Tool

Chrome extension to track your job applications: the job (link or description), which CV
you sent, the date you applied (today by default), and the status. Everything stays in
your browser. Nothing is uploaded.

## Try it

1. Open `chrome://extensions` and turn on **Developer mode**.
2. **Load unpacked** and select this folder.
3. Click the extension icon to open the tracker.
4. Fill in the job, the CV you used, and the status, then **Add application**.

Change a status straight from the table. **Edit** reloads a row into the form. **Export CSV**
downloads everything.

## Test

```
node --test
```
