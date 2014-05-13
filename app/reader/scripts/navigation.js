'use strict';

/* jshint unused: true */
/* exported Reader */
/* global $ */

var Reader = (function (r) {

	r.SPINE = [];

	// Number of chapters.
	var bookChapters = 0;
	// Initial chapter by default.
	var chapter = 0;
	// Initial page by default.
	var page = 0;
	// Number of pages in the actual chapter (columns number).
	var pagesByChapter = 0;
	// The current location's CFI.
	var _cfi = null;

	var chapterDocName = '';

	// Reset method for the reader.
	// *Note, some properties are not reset, such as preferences, listeners, styling*.
	r.reset = function(){
		r.INF = 'META-INF/book-info.json';
		r.CONTENT_PATH_PREFIX = '';
		r.OPF = '';
		r.SPINE = [];
		r.TOC = [];
		r.opf = null;
		r.DOCROOT = '';
		r.sample = false;
		r.mobile = false;
		r.bookTitle = '';
		r.bookAuthor = '';

		// Reset all modules.
		r.CFI.reset();
		r.Navigation.reset();
		r.Bookmarks.reset();

		// Remove book content.
		if(r.$parent){
			r.$parent.empty();
			r.$iframe = null;
			r.$wrap = null;
			r.$head = null;
			r.$container = null;
			r.$reader = null;
			r.$header = null;
			r.$footer = null;
			r.$stylesheet = null;

			// reset link to CSS rules
			r.preferences.lineHeight.rules = [];
			r.preferences.fontSize.rules = [];
			r.preferences.fontFamily.rules = [];
			r.preferences.textAlign.rules = [];
			r.preferences.theme.rules = {
				background: [],
				title: [],
				color: []
			};
		}
	};

	r.getReaderLeftPosition = function () {
	  // Transform value is matrix(a, c, b, d, tx, ty)
	  return parseInt(r.$reader.css('transform').split(',')[4], 10) || 0;
	};

	r.setReaderLeftPosition = function (pos) {
	  r.$reader.css('transform', 'translateX(' + pos + 'px)');
	};

	// Return the page number in the actual chapter where it is an element.
	r.moveToAnchor = function (id) {
		// Find the obj
		var obj = $(r.$iframe.contents()[0].getElementById(String(id)));
    if (obj.length === 0) {
      return 0; // If the object does not exist in the chapter we send the user to the page 0 of the chapter
    } else {
      // Check if the element has children and send the first one. This is to avoid the problems with big elements, like a wrapper for all the chapter.
      if (obj.children().length > 0) {
        return r.returnPageElement(obj.children().first());
      }
      return r.returnPageElement(obj);
    }
	};

	// Returns the page number related to an element.
	// [27.11.13] Refactored how we calculate the page for an element. Since the offset is calculated relative to the reader container now, we don't need to calculate the relative page number, only the absolute one.
	r.returnPageElement = function(obj) {
    obj = (obj instanceof $) ? obj : $(obj, r.$iframe.contents());
		var offset = obj.offset().left - r.$reader.offset().left;
		return Math.floor((offset) / Math.floor(r.Layout.Reader.width + r.Layout.Reader.padding));
	};

	var _getColumnsNumber = function() {
		var el = r.$reader[0];
		// we el.scrollWidth remove 1 pixel from scroll width to return the correct number of pages when the scroll width === the column width (other wise return one extra page)
		return Math.floor((el.scrollWidth - 1) / Math.floor(r.Layout.Reader.width + r.Layout.Reader.padding));
	};

	// Refresh the content layout.
	r.refreshLayout = function(){
		// Update the number of columns
		pagesByChapter = _getColumnsNumber();

		var promise;
		// Maintain reader current position
		if(_cfi && _cfi.CFI) {
			promise = r.CFI.goToCFI(_cfi.CFI, true);
		} else {
			promise = $.Deferred().resolve().promise();
		}
		promise.then(function () {
			r.Bookmarks.display();
			r.Navigation.updateProgress();
		});
	};

	// The current book progress.
	var _progress = 0;
	var _totalWordCount = -1;

	// ## Navigation API
	// The Navigation object exposes methods to allow the user to navigate within the book.
	//
	// * `save`
	// * `setNumberOfChapters`
	// * `getPage`
	// * `setPage`
	// * `loadPage`
	// * `setNumberOfPagesInChapter`
	// * `setChapter`
	// * `getChapter`
	// * `getChapterDocName`
	// * `loadChapter`
	// * `next`
	// * `prev`
	// * `getCFI`
	// * `getCFIObject`
	// * `setCFI`
	// * `reset`
	// * `getProgress`
	// * `updateProgress`
	// * `getCurrentCFI`
	// * `updateCurrentCFI`
	// * `update`

	r.Navigation = {
		save: function(){
			/* for(var k in sLoad) { oLoad[k]=sLoad[k]; } */
		},
		setNumberOfChapters: function(numberOfChapters) {
			bookChapters = numberOfChapters;
		},
		getNumberOfChapters: function(){
			return Chapter.getTotal();
		},
		getPage: function() {
			return Page.get();
		},
		getNumberOfPages: function(){
			return Page.getByChapter();
		},
		setNumberOfPages: function(){
			// Update the number of columns
			pagesByChapter = _getColumnsNumber();
		},
		setPage: function(p) {
			Page.set(p);
		},
		loadPage: function(p, fixed) {
			return Page.load(p, fixed);
		},
		setChapter: function(c){
			chapter = c;
			// Update the chapter doc name.
			try {
				var pathComponents = r.SPINE[chapter].href.split('/');
				// get the last element in the array
				chapterDocName = pathComponents.slice(-1)[0];
			}
			catch (e) {
				console.log('setChapter:'+e);
			}
		},
		getChapter: function(){
			return Chapter.get();
		},
		getChapterDocName: function() {
			return Chapter.getDocName();
		},
		loadChapter: function(url){
			/* TODO refactor with checkURL has they share code */
			var u = url.split('#')[0];
			var a = url.split('#')[1];
			if(u.indexOf('/') !== -1) {
				// Take only the file name from the URL.
				u = u.substr(u.lastIndexOf('/') + 1);
			}
			// Check the spine
			for (var j=0; j<r.SPINE.length;j++) {
				// URL is in the Spine and it has a chapter number.
				if (r.SPINE[j].href.indexOf(u) !== -1) {
					r.Navigation.setChapter(j);
					return r.loadAnchor(j,a);
				}
			}

			// Chapter does not exist
			var defer = $.Deferred();
			defer.reject($.extend({}, r.Event.ERR_INVALID_ARGUMENT, {details: 'Specified chapter does not exist.', call: 'loadChapter'}));
			return defer.promise();
		},
		next: function() {
			if (page < pagesByChapter) {
				return Page.next();
			}
			var defer = $.Deferred();
			if (chapter < bookChapters - 1) {
			  defer.notify();
			  Chapter.load(Chapter.next()).then(function chapterLoadCallback(){
			    r.Navigation.loadPage(0).then(defer.resolve, defer.reject);
			  }, defer.reject);
			} else {
			  defer.reject(r.Event.END_OF_BOOK);
			}
			return defer.promise();
		},
		prev: function() {
			if (page > 0) {
				return Page.prev();
			}
			var defer = $.Deferred();
			if (chapter > 0) {
			  defer.notify();
			  Chapter.load(Chapter.prev()).then(function chapterLoadCallback(){
			    r.Navigation.loadPage('LASTPAGE').then(defer.resolve, defer.reject);
			  }, defer.reject);
			} else {
			  defer.reject(r.Event.START_OF_BOOK);
			}
			return defer.promise();
		},
		setCFI: function(cfi){
			if (!cfi) {
				cfi = r.CFI.getCFIObject();
			}
			r.CFI.setCFI(cfi);
		},
		reset: function(){
			bookChapters = 0;
			chapter = 0;
			page = 0;
			pagesByChapter = 0;
			_cfi = null;
			_totalWordCount = -1;
			_progress = 0;
		},
		getProgress: function(){
			return _progress;
		},
		updateProgress: function(){
			var i = 0;
			// Update total number of words in the book, if not already done.
			if(_totalWordCount === -1 && r.SPINE.length){
				_totalWordCount = 0;
				for(i = 0; i < r.SPINE.length; i++){
					_totalWordCount += r.SPINE[i].linear ? r.SPINE[i].wordCount : 0;
				}
			}

			// Get word count of all previous chapters.
			var currentWordCount = 0;
			for(i = 0; i < chapter; i++){
				currentWordCount += r.SPINE[i].linear ? r.SPINE[i].wordCount : 0;
			}

			// Estimate red word count from current chapter. To avoid 0 based indexes and adding +1
			currentWordCount += r.SPINE.length && r.SPINE[chapter].linear ? r.SPINE[chapter].wordCount * (page+1) / (pagesByChapter+1) : 0;

			// Calculate progress.
			var progress = Math.floor(currentWordCount / _totalWordCount * 100);
			// If the progress has a valid value (is a number) AND it is different than the current one, update it and send an event notification.
			if(progress !== _progress && !isNaN(progress)){
				_progress = progress;
				// Send notification to all listeners that the progress has been updated
				// r.execEvent(r.Event.PROGRESS_UPDATED);
			}

			if (r.mobile) {
				// Update footer and display progress.
				var progressContainer = $('#cpr-progress', r.$iframe.contents());
				if(!progressContainer.length){
					progressContainer = $('<div id="cpr-progress"></div>').appendTo(r.$footer);
				}
				if (r.sample) {
					progressContainer.text(_progress+' % of sample');
				} else {
					progressContainer.text(_progress+' % read');
				}
			}
		},
		getCurrentCFI: function(){
			return _cfi;
		},
		updateCurrentCFI: function(){
			_cfi = r.CFI.getCFIObject();
		},
		update: function(){
			r.Navigation.updateCurrentCFI();
			r.Navigation.updateProgress();
			r.Bookmarks.display();
		}
	};

	function loadImages(reverse) {
	  var images = $('img', r.$reader),
	      updatedImages = $(),
	      mainDefer = $.Deferred(),
	      promise = $.Deferred().resolve().promise();
		if (images.length && reverse) {
			images = $(images.get().reverse());
		}
		images.each(function () {
	    var el = this,
	        dataSrc = el && el.getAttribute('data-src');
	    if (!dataSrc) {
	      return;
	    }
	    // Load images sequentially so we only load images until the nearest pages are filled:
	    promise = promise.then(function () {
	      if (Math.abs(r.returnPageElement(el) - r.Navigation.getPage()) < 2) {
	        var defer = $.Deferred();
	        $(el).one('load', function () {
		        $(el).off();
		        // All images greater than 75% of the reader width will receive cpr-center class to center them:
		        if (el.width > 3/4*(r.Layout.Reader.width / r.Layout.Reader.columns - r.Layout.Reader.padding / 2)) {
			        $(el).addClass('cpr-center');
		        }
		        // Notify on each image load:
		        mainDefer.notify({type: 'load.img', element: el});
		        updatedImages = updatedImages.add(el);
		        defer.resolve();
	        });
	        $(el).one('error', function () {
	          $(el).off();
	          defer.resolve();
	        });
	        el.setAttribute('src', dataSrc);
	        el.removeAttribute('data-src');
	        return defer.promise();
	      }
	    });
	  });
		promise.then(function () {
			mainDefer.resolve(updatedImages);
		});
	  return mainDefer.promise();
	}

	// ## Page API
	// Actual page is contained in the variable _pageIndex.
	//
	// * `get` returns the index of the actual page.
	// * `getByChapter` return the total number of pages in the actual chapter.
	// * `next` refreshes the page variable adding one and moves to the next page (column)
	// * `prev` refreshes the page variable subtracting one and moves to the prev pave (column)
	// * `load` refreshes the page variable with a value and moves the scroll to its position
	var Page = {
		set: function(p) {
			page = p;
		},
		get: function() {
			return page;
		},
		getByChapter: function() {
			return pagesByChapter;
		},
		next: function() {
			page = page + 1;
			var readerOuterWidth = Math.floor(r.Layout.Reader.width + r.Layout.Reader.padding);
			r.setReaderLeftPosition(r.getReaderLeftPosition() - readerOuterWidth);
			r.Navigation.updateCurrentCFI();
			return loadImages().then(function (updatedImages) {
				if (updatedImages.length) {
					r.refreshLayout();
				} else {
					r.Navigation.updateProgress();
					r.Bookmarks.display();
				}
			});
		},
		prev: function() {
			page = page - 1;
			var readerOuterWidth = Math.floor(r.Layout.Reader.width + r.Layout.Reader.padding);
			r.setReaderLeftPosition(r.getReaderLeftPosition() + readerOuterWidth);
			r.Navigation.updateCurrentCFI();
			return loadImages(true).then(function (updatedImages) {
				if (updatedImages.length) {
					r.refreshLayout();
				} else {
					r.Navigation.updateProgress();
					r.Bookmarks.display();
				}
			});
		},
		// Moves to the page given as index, epubcfi, anchor or special page "LASTPAGE":
		moveTo: function (p) {
			if (p === 'LASTPAGE') {
				// page is given as "LASTPAGE", jump to the last page of the chapter:
				page = pagesByChapter;
			} else if ($.type(p) === 'string') {
				if (/^epubcfi\(.+\)$/.test(p)) {
					// page is given as CFI, jump to the page containing the CFI marker:
					var pos = r.CFI.findCFIElement(p);
					page = pos === -1 ? 0 : pos;
				} else {
					// page is given as element id, jump to the page containing the element:
					page = r.moveToAnchor(p);
				}
			} else {
				page = p || 0;
			}
			r.setReaderLeftPosition(-1 * Math.floor(r.Layout.Reader.width + r.Layout.Reader.padding) * page);
		},
		load: function(p, fixed) {
			Page.moveTo(p);
			var promise = loadImages(p === 'LASTPAGE')
				.progress(function () {
					// Update the colums and page position on each image load:
					pagesByChapter = _getColumnsNumber();
					Page.moveTo(p);
				});
			if (!fixed) {
				promise = promise.then(function () {
					r.Navigation.update();
				});
			}
			return promise;
		}
	};

	// ## Chapter API
	// Chapters number is contained in the variable _bookChapters.
	// Chapter index is controlled with the _bookChapter variable.
	//
	// * `get` returns the index of the actual chapter (_bookChapter)
	// * `getTotal` returns the total number of pages in the actual chapter.
	// * `next` refresh the index variable adding one.
	// * `prev` refresh the index variable subtracting one.
	var Chapter = {
		get: function(callback) {
			if (callback && typeof(callback) === 'function') { callback(); }
			return chapter;
		},
		getDocName: function(callback) {
			if (callback && typeof(callback) === 'function') { callback(); }
			return chapterDocName;
		},
		getTotal: function(callback) {
			if (callback && typeof(callback) === 'function') { callback(); }
			return bookChapters;
		},
		next: function() {
			return ++chapter;
		},
		prev: function() {
			return --chapter;
		},
		load: function(c) {
			return r.loadChapter(c);
		}
	};

	return r;

}(Reader || {}));