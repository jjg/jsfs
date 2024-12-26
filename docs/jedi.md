# Jedi

Jedi is the JSFS system editor.


## History

Jedi was [originally](https://github.com/jjg/jedi) hacked-together from off-the-shelf parts as a proof-of-concept of JSFS as an application platform.  The original Jedi was a browser-based editor that not only could be used to write new applications, it was able to edit it's own code on-the-fly, allowing iterations on the editor itself with no other software.


## Jedi5

Jedi is being rewritten alongside JSFS and will be included with JSFS as a ROM.  In addition to basic text editing features, Jedi now includes:

* File upload/download
* Sharing link generator (automatically create links to a file, optionally with embedded editor)
* ROM authoring (more about ROMs in [roms.md](./roms.md))
* Pluggable render/preview view (Markdown, HTML, graphviz, etc.)
* "wiki-like" code editing where things like functions can be clicked to reveal their source, and if the source doesn't exist, it is created

Aside from being generally useful it provides a reference example for JSFS applications, establishing standards around how data is shared, how authentication is performed, etc.
