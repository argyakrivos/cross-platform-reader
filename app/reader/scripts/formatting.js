'use strict';

/* jshint unused: true */
/* exported Reader */

// The **Formatting** options available to the user.
//
// * [`setLineHeight`](#setLineHeight)
// * [`increaseLineHeight`](#increaseLineHeight)
// * [`decreaseLineHeight`](#decreaseLineHeight)
// * [`setFontSize`](#setFontSize)
// * [`setTextAlign`](#setTextAlign)
// * [`setFontFamily`](#setFontFamily)
// * [`increaseFontSize`](#increaseFontSize)
// * [`decreaseFontSize`](#decreaseFontSize)
// * [`setMargin`](#setMargin)
// * [`setTheme`](#setTheme)

var Reader = (function (r) {
	// <a name="setLineHeight"></a>Set line size, if within bounds.
	// If current line height is larger than the minimum line height, decrease it by one unit.
	// Returns the current value of the line height
	r.setLineHeight = function(value){
		return r.setPreferences({lineHeight: value});
	};

	// <a name="increaseLineHeight"></a>Increase line size, if possible
	// If current line height is smaller than the maximum line height, increase it by one unit.
	// ReturnS the current value of the line height.
	r.increaseLineHeight = function(){
		return r.setPreferences({lineHeight: r.preferences.lineHeight.value + r.preferences.lineHeight.unit});
	};

	// <a name="decreaseLineHeight"></a>Decrease line size, if possible.
	// If current line height is larger than the minimum line height, decrease it by one unit.
	// Returns the current value of the line height.
	r.decreaseLineHeight = function(){
		return r.setPreferences({lineHeight: r.preferences.lineHeight.value - r.preferences.lineHeight.unit});
	};

	// <a name="setFontSize"></a>Set font size, if within bounds.
	// If current font size is larger than the minimum font, decrease it by one unit.
	// Returns the current value of the line height.
	r.setFontSize = function(value){
		return r.setPreferences({fontSize: value});
	};

	// <a name="setTextAlign"></a>Set the text alignment, acceptable values are only left or justified.
	// If the argument is different than the acceptable values, defaults to left.
	// Return the current value of the text align.
	r.setTextAlign = function(value){
		return r.setPreferences({textAlign: value});
	};

	// <a name="setFontFamily"></a>Set font family
	// Return the current font-family of the reader.
	r.setFontFamily = function(value){
		return r.setPreferences({fontFamily: value});
	};

	// <a name="increaseFontSize"></a>Increase font size, if possible.
	// If current font size is smaller than the maximum font size, increase it by one unit.
	// Returns the current value of the font size.
	r.increaseFontSize = function(){
		return r.setPreferences({fontSize: r.preferences.fontSize.value + r.preferences.fontSize.unit});
	};

	// <a name="decreaseFontSize"></a>Decrease font size, if possible
	// If current font size is larger than the minimum font size, decrease it by one unit
	// Returns the current value of the font size
	r.decreaseFontSize = function(){
		return r.setPreferences({fontSize: r.preferences.fontSize.value - r.preferences.fontSize.unit});
	};

	// <a name="setMargin"></a>Setter for the reader's margin property
	//
	// * `args` an array of 4 integers representing the top, right, bottom, left margins. Can also accept keyword params such as 'min', 'max' and 'medium'.
	// Returns the updated margins.
	r.setMargin = function(args){
		return r.setPreferences({margin:args});
	};

	// <a name="setTheme"></a>Setter for the reader's theme
	//
	// * `args` an object containing the color and background of the theme. Can also accept keyword params such as 'light', 'dark' and 'sepia'
	// Returns the current theme
	r.setTheme = function(args){
		return r.setPreferences({theme:args});
	};

	// <a name="setPreferences"></a>Set all style related user preferences
	//
	// * `args` an Object containing valid preference values.

	r.setPreferences = function(args){
		if(typeof args === 'object'){
			var value, updated = false;

			// Set line height if all conditions are met
			if(args.hasOwnProperty('lineHeight')){
				value = parseFloat(args.lineHeight) || r.preferences.lineHeight.value;
				if(r.preferences.lineHeight.value !== value && r.preferences.lineHeight.max >= value && r.preferences.lineHeight.min <= value){
					r.preferences.lineHeight.value = value;
					updated = true;
				}
			}

			if(args.hasOwnProperty('fontSize')){
				value = parseFloat(args.fontSize) || r.preferences.fontSize.value;
				if(r.preferences.fontSize.value !== value && r.preferences.fontSize.max >= value && r.preferences.fontSize.min <= value){
					r.preferences.fontSize.value = value;
					updated = true;
				}
			}

			if(args.hasOwnProperty('textAlign')){
				value = r.preferences.textAlign.clear(args.textAlign);
				if(r.preferences.textAlign.value !== value){
					r.preferences.textAlign.value = value;
					updated = true;
				}
			}

			if(args.hasOwnProperty('fontFamily')){
				value = typeof(args.fontFamily) === 'string' ? args.fontFamily : r.preferences.fontFamily.value;
				if(r.preferences.fontFamily.value !== value){
					r.preferences.fontFamily.value = value;
					updated = true;
				}
			}

			if(args.hasOwnProperty('margin')){
				value = r.preferences.margin.clear(args.margin);
				if(value !== r.preferences.margin.value){
					r.preferences.margin.value = value;
					r.resizeContainer();
					updated = true;
				}
			}

			if(args.hasOwnProperty('theme')){
				value = r.preferences.theme.clear(args.theme);
				if(value !== r.preferences.theme.value){
					r.preferences.theme.value = value;
					updated = true;
				}
			}

			if(updated){
				r.preferences.applyAll();

				// Update variables that are dependant on styles.
				r.refreshLayout();
			}
		}
		return r.preferences;
	};
	return r;
}(Reader || {}));