(function() {
var _canvasDomId = 'canvas';
var _boundingPolyDomId = 'boundingPoly';

var _mouse = {x: 0, y: 0, startX: 0, startY: 0};
var _element = null;
var _boundingPoly = {x_min: 0, y_min: 0, x_max: 0, y_max: 0};

function getCanvasOffset() {
  return $('#' + _canvasDomId).offset();
}

function getCanvasImage() {
  return $('#' + _canvasDomId + ' img');
}

function min(a, b) {
  return a < b ? a : b;
}

function setMousePosition(e) {
  var ev = e || window.event;  // Moz || IE
  if (ev.pageX) {              // Moz
    _mouse.x = ev.pageX + window.pageXOffset;
    _mouse.y = ev.pageY + window.pageYOffset;
  } else if (ev.clientX) {  // IE
    _mouse.x = ev.clientX + document.body.scrollLeft;
    _mouse.y = ev.clientY + document.body.scrollTop;
  }
};

function initDraw() {
  const canvas = $('#' + _canvasDomId)[0];
  canvas.onmousemove = function(e) {
    setMousePosition(e);
    if (_element !== null) {
      const canvasImage = getCanvasImage();
      _element.style.visibility = 'visible';
      const left = min(_mouse.x, _mouse.startX) - getCanvasOffset().left;
      const top = min(_mouse.y, _mouse.startY) - getCanvasOffset().top -
          canvasImage.height();
      const height = Math.abs(_mouse.y - _mouse.startY);
      const width = Math.abs(_mouse.x - _mouse.startX)
      _element.style.left = left + 'px';
      _element.style.top = top + 'px';
      _element.style.height = height + 'px';
      _element.style.width = width + 'px';
      _boundingPoly.x_min = left / canvasImage.width();
      _boundingPoly.x_max = (left + width) / canvasImage.width();
      _boundingPoly.y_min = (top + canvasImage.height()) / canvasImage.height();
      _boundingPoly.y_max =
          (top + canvasImage.height() + height) / canvasImage.height();
      if (_boundingPolyDomId) {
        $('#' + _boundingPolyDomId)
            .val(JSON.stringify(_boundingPoly, function(key, val) {
              return val.toFixed ? Number(val.toFixed(3)) : val;
            }));
      }
    }
  };

  canvas.onmousedown = function(e) {
    console.log('begin.');
    // Remove all div inside the canvas.
    $('#' + _canvasDomId + ' div').remove();
    if (_boundingPolyDomId) {
      $('#' + _boundingPolyDomId).val('');
    }
    setMousePosition(e);
    _mouse.startX = _mouse.x;
    _mouse.startY = _mouse.y;
    _element = document.createElement('div');
    _element.className = 'rectangle'
    _element.style.visibility = 'hidden';
    canvas.appendChild(_element)
  };

  canvas.onmouseup = function() {
    _element = null;
    console.log('finsihed.');
  };
}

initDraw();
})();
