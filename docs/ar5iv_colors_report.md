# Report on colors used in ar5iv's data, upto August 2025

Using the CorTeX build system organization, we have an HTML version of arXiv available via a single
directory handle, stored in per-article ZIP bundles. That allows to execute a rather classic zipgrep:

```bash
$ find . -type f -name 'tex_to_html.zip' -exec zipgrep -i -o 'color:#[0-9a-z]+;' {} '*.html' \; \
  2>color_stderr.log >colors.txt
```

And to prepare frequency counts:

```bash
$ cat colors.txt | awk '{split($0, a, "#"); hex=sprintf("#%s",a[2]); print hex}'|sort|uniq -c|sort -nr
```

Today, colors.txt recorded the hex codes of 8.6 million color properties. The reported summary
reduces them to 24850 distinct codes, the top 10 of which are:
```
"#000000;",
"#0000FF;",
"#FF0000;",
"#FFFFFF;",
"#E6E6E6;",
"#F2F2F2;",
"#808080;",
"#9400D1;",
"#228B22;",
"#D9D9D9;",
```

Note that this report contains both `color:` as well as `background-color:` directives from inline style attributes.

```
Tactic for mapping:
Leave the hue and saturation values as-is and flip lightness.

That means whatever the offset was from 100 should now be the offset from 0.
This would turn a dark bold blue into a light bright blue, while for a color like brown (dull orange) it will keep its level of dullness while contrasting the same amount with the background it did before.
```


Currently the latexml markup makes it impossible to do a pure-CSS fix, due to the inline color style being deposited on nearest container of the text node.
We can easily cover the top 10 rules with specific selectors:

```
[style*="color:#000000"] {
    color: oklch(from #000000 calc(0.8237 - l) c h) !important;
}
```

But obviously not 25,000 cases. Ideally we get a change to latexml updating the inline color markup to deposit a variable,
such as `style="--inline-color: #000000;"`. Absent that, we would need our own post-processing of the HTML, which could be painful.
But the ar5iv.sty.ltxml could achieve that...

Separately, we should keep in mind `mathcolor`

```
[mathcolor] {
  color: oklch(from attr(mathcolor) calc(0.8237 - l) c h) !important;
}
```