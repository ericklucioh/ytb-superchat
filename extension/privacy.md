## Privacy Policy

This extension reads live chat content from supported streaming pages so it can
forward normalized chat events to the local streamer dashboard used by this
project.

### What the extension may access

- public chat messages visible on supported live chat pages
- public display names, avatars, badges, and platform metadata shown in chat
- local extension settings required to connect the browser session to the
  dashboard

### How the data is used

- to detect new chat messages on supported platforms
- to normalize those messages into a common event format
- to send the events to the local dashboard flow used by the streamer

### Storage and sharing

- the extension may store local configuration in browser storage
- the project is designed for local streamer use and does not sell chat data
- data is only forwarded as part of the chat capture flow described by the
  project

### Limitations

This extension depends on the structure of third-party chat pages. If those
pages change, capture behavior may stop working until the selectors are
updated.
