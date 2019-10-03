# Terminus

Shows terminal's status

## Feature

Parse integrated terminals output with regexp and show custom status in the status bar for each terminal.

Counts the number of matches. Click on the status bar item to open the corresponding terminal and reset counter.

Terminus works great with Tasks.

![alt terminus](https://github.com/FlavienBusseuil/terminus/raw/master/terminus.gif)

## Extension Settings

The default ones:

```
"terminus.matches": [
	{
		"display": "$(error)",
		"expression": "[Ee]rror|[Ee]xception"
	},
	{
		"display": "$(alert)",
		"expression": "[Ww]arning"
	},
	{
		"display": "$(sync)",
		"expression": "[Rr]efresh(ing|ed){0,1}|[Rr]estart(ing|ed){0,1}|[Ss]tarted|[Rr]unning"
	}
]
```

You can override `"terminus.matches"` to set your own regexp.

`"display"` attribute accept any string. You may also use [Octicons](https://octicons.github.com/) like so `"$(error)"`.
