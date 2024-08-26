# Project Notamarck

A personal note-managing app that focuses on simplicity and creating connections between notes.

supports markdown syntax rendering on the fly.

# Disclaimer

This app is still in development, if you decided to give it a go, **please remember to back up your notes**.

## Concept

When we accumulate more and more notes, they become a nightmare to manage and keep track of.

If the notes are placed in their own folders, they become isolated; if they are placed under one folder, they become a
mess.

this app attempts to tackle the problem by ditching the folder structure and replace it with a stronger search functionality and the ability to adding `tags` to files.

Notes can have multiple `tags` and each `tag` displays what files are linked to it. They serve as a central hub to
quickly navigate to related notes,
and they can be further customized by re-arranging the added connections and adding titles to mark sections.

In addition,besides some custom markdown directives, there is no proprietary file type or formats.

All files and even links are stored in .MD files.

## Feature Manual

### search bar

The search bar is the centrepiece of the app.

From the search bar, you can search to navigate to files/tags or create a link to the file/tag.

**Creating new files and tags** is also handled through the search bar to avoid creating duplicated notes.

you can switch search type by typing `file:`,`tag:`, `content:` or using short-cut keys `ctrl+alt+f`, `ctrl+g` or
`ctrl+f`

### Insert link to a file

In the Editor tab, search for the file/tag (or create them) in the search bar, then select the search result(click or
arrow
key+enter)
while holding down ctrl to insert the file/tag as a link in the currently edited file.

Link can be created between note files and tags, or even between note files

### Tags Editing tab

You can re-order the file references by dragging and dropping, you can also add titles to the link ref while hovering
on the links

links cannot be deleted from the tag's side, they can only be removed in the note files.

## Planned features

- [ ] Connection graph
- [ ] Search file content in the whole workspace
- [ ] more powerful content searching

## Features under consideration

- [ ] Split screen