
var isMac = /Mac/.test(navigator.platform);

var shortcuts = {
  'Cmd-B': toggleBold,
  'Cmd-I': toggleItalic,
  'Cmd-K': drawLink,
  'Cmd-Alt-I': drawImage,
  "Cmd-'": toggleBlockquote,
  'Cmd-Alt-L': toggleOrderedList,
  'Cmd-L': toggleUnOrderedList
};


/**
 * Fix shortcut. Mac use Command, others use Ctrl.
 */
function fixShortcut(name) {
  if (isMac) {
    name = name.replace('Ctrl', 'Cmd');
  } else {
    name = name.replace('Cmd', 'Ctrl');
  }
  return name;
}


/**
 * Create icon element for toolbar.
 */
function createIcon(name, options) {
  options = options || {};
  var el = document.createElement('a');

  var shortcut = options.shortcut || shortcuts[name];
  if (shortcut) {
    shortcut = fixShortcut(shortcut);
    el.title = shortcut;
    el.title = el.title.replace('Cmd', '⌘');
    if (isMac) {
      el.title = el.title.replace('Alt', '⌥');
    }
  }

  el.className = options.className || 'icon-' + name;
  return el;
}

function createSep() {
  el = document.createElement('i');
  el.className = 'separator';
  el.innerHTML = '|';
  return el;
}


/**
 * The state of CodeMirror at the given position.
 */
function getState(cm, pos) {
  pos = pos || cm.getCursor('start');
  var stat = cm.getTokenAt(pos);
  if (!stat.type) return {};

  var types = stat.type.split(' ');

  var ret = {}, data, text;
  for (var i = 0; i < types.length; i++) {
    data = types[i];
    if (data === 'strong') {
      ret.bold = true;
    } else if (data === 'variable-2') {
      text = cm.getLine(pos.line);
      if (/^\s*\d+\.\s/.test(text)) {
        ret['ordered-list'] = true;
      } else {
        ret['unordered-list'] = true;
      }
    } else if (data === 'atom') {
      ret.quote = true;
    } else if (data === 'em') {
      ret.italic = true;
    }
  }
  return ret;
}


/**
 * Toggle full screen of the editor.
 */
function toggleFullScreen(editor) {
  var el = editor.codemirror.getWrapperElement();

  // https://developer.mozilla.org/en-US/docs/DOM/Using_fullscreen_mode
  var doc = document;
  var isFull = doc.fullScreen || doc.mozFullScreen || doc.webkitFullScreen;
  var request = function() {
    if (el.requestFullScreen) {
      el.requestFullScreen();
    } else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen();
    } else if (el.webkitRequestFullScreen) {
      el.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  };
  var cancel = function() {
    if (doc.cancelFullScreen) {
      doc.cancelFullScreen();
    } else if (doc.mozCancelFullScreen) {
      doc.mozCancelFullScreen();
    } else if (doc.webkitCancelFullScreen) {
      doc.webkitCancelFullScreen();
    }
  };
  if (!isFull) {
    request();
  } else if (cancel) {
    cancel();
  }
}


/**
 * Action for toggling bold.
 */
function toggleBold(editor) {
  var cm = editor.codemirror;
  var stat = getState(cm);

  var text;
  var start = end = '**';

  var startPoint = cm.getCursor('start');
  var endPoint = cm.getCursor('end');
  if (stat.bold) {
    text = cm.getLine(startPoint.line);
    start = text.slice(0, startPoint.ch);
    end = text.slice(startPoint.ch);

    start = start.replace(/^(.*)?(\*|\_){2}(\S+.*)?$/, '$1$3');
    end = end.replace(/^(.*\S+)?(\*|\_){2}(\s+.*)?$/, '$1$3');
    startPoint.ch -= 2;
    endPoint.ch -= 2;
    cm.setLine(startPoint.line, start + end);
  } else {
    text = cm.getSelection();
    cm.replaceSelection(start + text + end);

    startPoint.ch += 2;
    endPoint.ch += 2;
  }
  cm.setSelection(startPoint, endPoint);
  cm.focus();
}


/**
 * Action for toggling italic.
 */
function toggleItalic(editor) {
  var cm = editor.codemirror;
  var stat = getState(cm);

  var text;
  var start = end = '*';

  var startPoint = cm.getCursor('start');
  var endPoint = cm.getCursor('end');
  if (stat.bold) {
    text = cm.getLine(startPoint.line);
    start = text.slice(0, startPoint.ch);
    end = text.slice(startPoint.ch);

    start = start.replace(/^(.*)?(\*|\_)(\S+.*)?$/, '$1$3');
    end = end.replace(/^(.*\S+)?(\*|\_)(\s+.*)?$/, '$1$3');
    startPoint.ch -= 1;
    endPoint.ch -= 1;
    cm.setLine(startPoint.line, start + end);
  } else {
    text = cm.getSelection();
    cm.replaceSelection(start + text + end);

    startPoint.ch += 1;
    endPoint.ch += 1;
  }
  cm.setSelection(startPoint, endPoint);
  cm.focus();
}


/**
 * Action for toggling blockquote.
 */
function toggleBlockquote(editor) {
  var cm = editor.codemirror;
  _toggleLine(cm, 'quote');
}


/**
 * Action for toggling ul.
 */
function toggleUnOrderedList(editor) {
  var cm = editor.codemirror;
  _toggleLine(cm, 'unordered-list');
}


/**
 * Action for toggling ol.
 */
function toggleOrderedList(editor) {
  var cm = editor.codemirror;
  _toggleLine(cm, 'ordered-list');
}


/**
 * Action for drawing a link.
 */
function drawLink(editor) {
  var cm = editor.codemirror;
  var stat = getState(cm);
  _replaceSelection(cm, stat.link, '[', '](http://)');
}


/**
 * Action for drawing an img.
 */
function drawImage(editor) {
  var cm = editor.codemirror;
  var stat = getState(cm);
  _replaceSelection(cm, stat.image, '![', '](http://)');
}


/**
 * Undo action.
 */
function undo(editor) {
  var cm = editor.codemirror;
  cm.undo();
  cm.focus();
}


/**
 * Redo action.
 */
function redo(editor) {
  var cm = editor.codemirror;
  cm.redo();
  cm.focus();
}


function _replaceSelection(cm, active, start, end) {
  var text;
  var startPoint = cm.getCursor('start');
  var endPoint = cm.getCursor('end');
  if (active) {
    text = cm.getLine(startPoint.line);
    start = text.slice(0, startPoint.ch);
    end = text.slice(startPoint.ch);
    cm.setLine(startPoint.line, start + end);
  } else {
    text = cm.getSelection();
    cm.replaceSelection(start + text + end);

    startPoint.ch += start.length;
    endPoint.ch += start.length;
  }
  cm.setSelection(startPoint, endPoint);
  cm.focus();
};


function _toggleLine(cm, name) {
  var stat = getState(cm);
  var startPoint = cm.getCursor('start');
  var endPoint = cm.getCursor('end');
  var repl = {
    quote: /^(\s*)\>\s+/,
    'unordered-list': /^(\s*)(\*|\-|\+)\s+/,
    'ordered-list': /^(\s*)\d+\.\s+/
  };
  var map = {
    quote: '> ',
    'unordered-list': '* ',
    'ordered-list': '1. '
  };
  for (var i = startPoint.line; i <= endPoint.line; i++) {
    (function(i) {
      var text = cm.getLine(i);
      if (stat[name]) {
        text = text.replace(repl[name], '$1');
      } else {
        text = map[name] + text;
      }
      cm.setLine(i, text);
    })(i);
  }
  cm.focus();
};
